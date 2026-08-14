/**
 * The one sanitizer for AI-written `customCss`.
 *
 * Two products inject a user-owned CSS string into a `<style>` element scoped
 * by an id selector — `#resume-preview-x { ...css... }` in ResumePreview, and
 * `#portfolio-preview-x { ...css... }` in PortfolioPreview — and both of those
 * documents are rendered to *other people*: a public resume page, the community
 * feed, a published portfolio. So the string has to be unable to do two things:
 *
 *   1. escape its scoping block, which turns a resume into a licence to restyle
 *      the whole page (hide the "unverified" badge, replace the header, cover
 *      the page with an overlay);
 *   2. fetch anything over the network, which turns every viewer of a public
 *      document into a hit on the author's server.
 *
 * The previous implementation scanned with regexes and a hand-rolled string
 * walker, and both parts were bypassable in one line:
 *
 *   background:url(a'b) } header, body { display:none } url(c'd)
 *
 * A CSS tokenizer reads `url(a'b)` as a single bad-url-token that ends at the
 * first `)` — the quote inside it is *not* a string delimiter. The old walker
 * saw the quote first, opened a string, and swallowed `} header, body {` and
 * the following `}` as string contents, so it counted the braces as balanced
 * while the browser counted an escaped block. The url regex missed both `url(`
 * for the same reason and, finding no matches at all, reported "every url is
 * inline".
 *
 * The fix is to tokenize the way the CSS spec does, in one pass, with `url(`
 * recognised as its own token before any quote can be considered. Everything
 * below follows from that: brace depth, function nesting and at-keywords are
 * all read off the same token stream.
 *
 * Rejection is no longer all-or-nothing either. A single fetching declaration
 * used to discard the entire stylesheet silently — and the generator that
 * writes this field is never told to avoid `url()`, so "generated fine, applied
 * fine, preview shows nothing" was a normal outcome. Now only the offending
 * declaration is dropped, and it is reported back so the UI can say so.
 * Whole-stylesheet rejection is kept for the one case where partial recovery is
 * not safe: broken structure, where we cannot tell which block a declaration
 * belongs to.
 */

export type CustomCssRejection = 'unbalanced' | 'unterminated' | 'at-rule';

export interface CustomCssSanitizeResult {
    /** The CSS that is safe to inject, or `null` when nothing survived. */
    css: string | null;
    /** Declarations that were dropped, verbatim, for reporting to the author. */
    removed: string[];
    /** Set when the whole stylesheet was refused rather than filtered. */
    rejected: CustomCssRejection | null;
}

/**
 * At-rules that cannot reach the network and cannot open a document.
 *
 * An allow-list rather than a `/@import/` substring test, because at-keywords
 * accept identifier escapes: `@\69 mport` is `@import` to the parser and
 * invisible to that regex. Names here are compared *after* escape decoding.
 */
const ALLOWED_AT_RULES = new Set([
    'media',
    'supports',
    'container',
    'layer',
    'scope',
    'starting-style',
    'keyframes',
    '-webkit-keyframes',
    '-moz-keyframes',
    '-o-keyframes',
    'font-face',
    'font-feature-values',
    'counter-style',
    'property',
    'page',
]);

/**
 * Functions whose *string* argument is a URL.
 *
 * `url()` is not the only way to fetch: `image-set("https://x/p.png" 1x)` takes
 * a bare string and is supported in every current browser, so a beacon needs no
 * `url(` at all. Inside these, a string has to be an inline `data:` payload,
 * exactly as a `url()` argument does.
 */
const URL_STRING_FUNCTIONS = new Set(['url', 'src', 'image-set', '-webkit-image-set']);

/** Schemes that fetch. A bare `//host/x` fetches too, and is checked alongside. */
const FETCHING_SCHEME = /^(?:https?|ftp|ftps|ws|wss|file|blob|filesystem):/i;

const isInlinePayload = (value: string) => /^data:/i.test(value.trim());

const isRemoteReference = (value: string) => {
    const trimmed = value.trim();
    return FETCHING_SCHEME.test(trimmed) || trimmed.startsWith('//');
};

const HEX = /[0-9a-fA-F]/;
const IDENT_CHAR = /[a-zA-Z0-9_\u0080-\uffff-]/;
const IDENT_START = /[a-zA-Z_\u0080-\uffff-]/;
const WHITESPACE = /[ \t\n\r\f]/;

/** Decodes one `\` escape, which is how `@\69 mport` reaches the parser as `@import`. */
const decodeEscape = (css: string, at: number): { char: string; next: number } => {
    let i = at + 1;
    if (i >= css.length) return { char: '\ufffd', next: i };

    if (HEX.test(css[i])) {
        let hex = '';
        while (i < css.length && hex.length < 6 && HEX.test(css[i])) {
            hex += css[i];
            i += 1;
        }
        // A single whitespace after the hex digits terminates the escape and is
        // consumed with it.
        if (i < css.length && WHITESPACE.test(css[i])) i += 1;
        const code = Number.parseInt(hex, 16);
        return { char: code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '\ufffd', next: i };
    }

    return { char: css[i], next: i + 1 };
};

const consumeIdent = (css: string, start: number): { value: string; end: number } => {
    let i = start;
    let value = '';

    while (i < css.length) {
        const char = css[i];
        if (char === '\\') {
            const escaped = decodeEscape(css, i);
            value += escaped.char;
            i = escaped.next;
            continue;
        }
        if (IDENT_CHAR.test(char)) {
            value += char;
            i += 1;
            continue;
        }
        break;
    }

    return { value, end: i };
};

/** Consumes a quoted string. `end` is the index of the closing quote. */
const consumeString = (css: string, start: number): { value: string; end: number } | null => {
    const quote = css[start];
    let value = '';

    for (let i = start + 1; i < css.length; i += 1) {
        const char = css[i];
        if (char === '\\') {
            const escaped = decodeEscape(css, i);
            value += escaped.char;
            i = escaped.next - 1;
            continue;
        }
        // A raw newline ends a CSS string as a parse error, not as a string.
        if (char === '\n' || char === '\r' || char === '\f') return null;
        if (char === quote) return { value, end: i };
        value += char;
    }

    return null;
};

/**
 * Consumes an unquoted `url(...)` argument, exactly as the tokenizer does:
 * everything up to the first unescaped `)`, quotes included. This is the token
 * the old walker could not see, and the reason it could be walked past a `}`.
 */
const consumeUrlToken = (css: string, afterParen: number): { value: string; end: number } | null => {
    let value = '';

    for (let i = afterParen; i < css.length; i += 1) {
        const char = css[i];
        if (char === '\\') {
            const escaped = decodeEscape(css, i);
            value += escaped.char;
            i = escaped.next - 1;
            continue;
        }
        if (char === ')') return { value, end: i };
        value += char;
    }

    return null;
};

const nextNonWhitespace = (css: string, from: number): number => {
    let i = from;
    while (i < css.length && WHITESPACE.test(css[i])) i += 1;
    return i;
};

const reject = (rejection: CustomCssRejection): CustomCssSanitizeResult => ({
    css: null,
    removed: [],
    rejected: rejection,
});

/**
 * Filters `css` down to what is safe to inject inside `#id { ... }`.
 *
 * Never throws; a value it cannot make sense of comes back as `css: null`.
 */
export const sanitizeCustomCss = (css: string | undefined | null): CustomCssSanitizeResult => {
    if (typeof css !== 'string') return { css: null, removed: [], rejected: null };

    const source = css.trim();
    if (!source) return { css: null, removed: [], rejected: null };

    /** Curly-brace depth. Depth 0 is inside the caller's scoping block. */
    let depth = 0;
    /** Names of the functions we are currently inside, innermost last. */
    const functions: string[] = [];

    let segmentStart = 0;
    let segmentIsUnsafe = false;
    const removed: string[] = [];
    let kept = '';

    const dropOrKeep = (endExclusive: number, tail: string) => {
        const segment = source.slice(segmentStart, endExclusive);
        if (segmentIsUnsafe) {
            const trimmedSegment = segment.trim();
            if (trimmedSegment) removed.push(trimmedSegment);
            // The `;` that terminated the dropped declaration goes with it; a
            // `}` closes a block the declaration was only living inside, so it
            // has to stay or the structure changes shape.
            if (tail === '}') kept += tail;
        } else {
            kept += segment + tail;
        }
        segmentStart = endExclusive + tail.length;
        segmentIsUnsafe = false;
    };

    let i = 0;
    while (i < source.length) {
        const char = source[i];

        if (char === '/' && source[i + 1] === '*') {
            const end = source.indexOf('*/', i + 2);
            if (end === -1) return reject('unterminated');
            i = end + 2;
            continue;
        }

        if (char === '"' || char === "'") {
            const string = consumeString(source, i);
            if (!string) return reject('unterminated');

            const enclosing = functions[functions.length - 1];
            if (enclosing && URL_STRING_FUNCTIONS.has(enclosing)) {
                if (!isInlinePayload(string.value)) segmentIsUnsafe = true;
            } else if (isRemoteReference(string.value)) {
                segmentIsUnsafe = true;
            }

            i = string.end + 1;
            continue;
        }

        if (char === '@') {
            const ident = consumeIdent(source, i + 1);
            if (ident.value && !ALLOWED_AT_RULES.has(ident.value.toLowerCase())) {
                segmentIsUnsafe = true;
            }
            i = ident.end > i ? ident.end : i + 1;
            continue;
        }

        if (char === '\\' || IDENT_START.test(char)) {
            const ident = consumeIdent(source, i);
            const end = ident.end > i ? ident.end : i + 1;

            if (source[end] === '(') {
                const name = ident.value.toLowerCase();
                const argStart = nextNonWhitespace(source, end + 1);
                const quoted = source[argStart] === '"' || source[argStart] === "'";

                // `url(` with an unquoted argument is a single token that runs to
                // the first `)`. Reading it here — before the quote branch above
                // can see anything — is the whole point of this pass.
                if (name === 'url' && !quoted) {
                    const url = consumeUrlToken(source, end + 1);
                    if (!url) return reject('unterminated');
                    if (!isInlinePayload(url.value)) segmentIsUnsafe = true;
                    i = url.end + 1;
                    continue;
                }

                functions.push(name);
                i = end + 1;
                continue;
            }

            i = end;
            continue;
        }

        if (char === '(') {
            functions.push('');
            i += 1;
            continue;
        }

        if (char === ')') {
            functions.pop();
            i += 1;
            continue;
        }

        if (char === '{') {
            // A prelude cannot be dropped on its own — removing it would merge
            // its block into the surrounding one — so an unsafe selector or
            // at-rule head takes the whole stylesheet down.
            if (segmentIsUnsafe) return reject('at-rule');
            depth += 1;
            dropOrKeep(i, '{');
            i += 1;
            continue;
        }

        if (char === '}') {
            depth -= 1;
            // A `}` with nothing open closes the caller's scoping block: this is
            // the escape the whole guard exists for.
            if (depth < 0) return reject('unbalanced');
            dropOrKeep(i, '}');
            i += 1;
            continue;
        }

        if (char === ';') {
            dropOrKeep(i, ';');
            i += 1;
            continue;
        }

        i += 1;
    }

    if (depth !== 0) return reject('unbalanced');
    if (functions.length !== 0) return reject('unterminated');

    const tail = source.slice(segmentStart);
    if (segmentIsUnsafe) {
        const trimmedTail = tail.trim();
        if (trimmedTail) removed.push(trimmedTail);
    } else {
        kept += tail;
    }

    const result = kept.trim();
    return { css: result || null, removed, rejected: null };
};

/** The CSS alone, for call sites that only need something to inject. */
export const safeCustomCss = (css: string | undefined | null): string | null => sanitizeCustomCss(css).css;

/** One sentence explaining what was dropped, or `null` when nothing was. */
export const describeCustomCssRejection = (result: CustomCssSanitizeResult): string | null => {
    if (result.rejected === 'unbalanced') {
        return 'This CSS was not applied: its braces do not balance, so it would style the page around your document instead of the document.';
    }
    if (result.rejected === 'unterminated') {
        return 'This CSS was not applied: it has an unclosed comment, string or bracket.';
    }
    if (result.rejected === 'at-rule') {
        return 'This CSS was not applied: it uses an at-rule that is not allowed here, such as @import.';
    }
    if (result.removed.length > 0) {
        return `${result.removed.length} declaration${result.removed.length === 1 ? '' : 's'} were left out because they load a file over the network. Images and fonts have to be inline data: URLs so a public document does not call out to another server when someone views it.`;
    }
    return null;
};
