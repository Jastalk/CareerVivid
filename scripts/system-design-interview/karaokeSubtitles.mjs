/**
 * karaokeSubtitles.mjs — short caption chunks that advance with the voice.
 *
 * The subtitle style this replaces put a beat's entire paragraph on screen at
 * once: six lines of English over five of Chinese, in a box covering the bottom
 * third of the frame, sitting there unchanged for thirty seconds. It is
 * readable and nobody reads it — there is nothing to tell you which part the
 * voice is on.
 *
 * This is the short-form caption style instead: a handful of words at a time,
 * swapped as the narrator reaches them.
 *
 * ── On timing ───────────────────────────────────────────────────────────────
 *
 * Chirp3-HD returns audio and nothing else — no word timings. Real timings
 * would mean re-synthesising with SSML marks and `enable_time_pointing`, which
 * is worth doing eventually and is not worth blocking on: within a single beat
 * the voice holds a near-constant rate, so distributing the beat's measured
 * duration across its chunks by character count lands each one within about a
 * fifth of a second. At four words a chunk, that is not visible.
 *
 * What that assumption cannot survive is a beat with a long pause in it, or one
 * that changes pace sharply. Neither happens in narration written to be read
 * aloud in one breath per sentence — but if a chunk ever drifts noticeably, the
 * fix is word timings, not a fudge factor here.
 */

const esc = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** `**like this**` becomes a marked phrase. */
export const mark = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, '<em class="hi">$1</em>');

/** Roughly how long a piece of text takes to say, in arbitrary units. */
const weight = (s) => {
    // A Chinese character carries about two English characters' worth of time.
    const han = (s.match(/[一-鿿]/g) ?? []).length;
    return Math.max(s.length + han, 1);
};

/**
 * Cuts English into chunks of a few words, breaking at punctuation first.
 *
 * Breaking mid-clause is what makes auto-captions feel machine-made, so commas,
 * dashes and full stops end a chunk even when it is short.
 */
function chunkEnglish(text, maxWords = 5) {
    const words = String(text ?? '').trim().split(/\s+/).filter(Boolean);
    if (!words.length) return [];

    const chunks = [];
    let current = [];
    for (const word of words) {
        current.push(word);
        const endsClause = /[.,!?;:—–]$/.test(word);
        if (current.length >= maxWords || (endsClause && current.length >= 2)) {
            chunks.push(current.join(' '));
            current = [];
        }
    }
    if (current.length) {
        // A one-word orphan reads as a glitch; fold it back.
        if (current.length === 1 && chunks.length) chunks[chunks.length - 1] += ' ' + current[0];
        else chunks.push(current.join(' '));
    }
    return chunks;
}

/**
 * Cuts Chinese at its own punctuation, and nowhere else.
 *
 * An earlier version forced the Chinese into exactly as many pieces as there
 * were English chunks, splitting long runs by character count to make up the
 * difference. That cuts straight through things that must not be cut: a `**`
 * emphasis marker ends up orphaned across two captions, and an embedded Latin
 * term is severed mid-word — real output included `single-f` / `light 锁`.
 *
 * So the two languages are no longer forced into step. Chinese advances by
 * clause, English by word group, each on its own clock. They drift apart within
 * a sentence and meet again at every punctuation mark, which is what bilingual
 * captions do anyway — and the sentence being readable matters more than the
 * two lines turning over on the same frame.
 */
function clausesOf(text) {
    const zh = String(text ?? '').trim();
    if (!zh) return [];
    const atoms = zh.match(/[^。！？；，、…]+[。！？；，、…]*/g)?.map(s => s.trim()).filter(Boolean) ?? [zh];

    // Fold fragments too short to read into their neighbour, and never leave a
    // dangling emphasis marker — an odd number of `**` means the pair straddles
    // a boundary, so the pieces belong together.
    const out = [];
    for (const atom of atoms) {
        const open = out.length && ((out[out.length - 1].match(/\*\*/g) ?? []).length % 2 === 1);
        if (out.length && (open || atom.length < 6 || out[out.length - 1].length < 6)) {
            out[out.length - 1] += atom;
        } else {
            out.push(atom);
        }
    }
    return out;
}

/** Spreads pieces across `duration`, each getting time in proportion to length. */
function timeline(pieces, duration) {
    const weights = pieces.map(weight);
    const total = weights.reduce((a, b) => a + b, 0) || 1;
    let at = 0;
    return pieces.map((text, i) => {
        const span = (weights[i] / total) * duration;
        const piece = { text, start: at, end: at + span };
        at += span;
        return piece;
    });
}

/**
 * The caption track for one beat.
 *
 * English only — that is the language being spoken, and a single line is what
 * makes this style readable at a glance. `clausesOf` is kept because the
 * Chinese track is a switch away if a localised cut is ever wanted; nothing
 * calls it today.
 */
export function karaokeChunks(narration, duration, maxWords = 5) {
    return timeline(chunkEnglish(narration?.en, maxWords), duration);
}

export { clausesOf };

/**
 * CSS + markup for the caption stack.
 *
 * Each chunk gets one keyframe animation spanning the whole beat, with
 * percentage stops for its in and out. That keeps it compatible with the
 * pause-and-seek renderer, which needs every animation to have a known,
 * fixed duration.
 */
export function karaokeHTML(chunks, duration) {
    if (!chunks.length) return { css: '', html: '' };

    const FADE = 0.1;
    const css = chunks.map((c, i) => {
        const pct = (t) => Math.max(0, Math.min(100, (t / duration) * 100)).toFixed(3);
        const a = pct(c.start);
        const b = pct(Math.min(c.start + FADE, c.end));
        const d = pct(c.end);
        return `@keyframes k${i}{0%,${a}%{opacity:0;transform:translateY(10px) scale(0.97)}` +
            `${b}%,${d}%{opacity:1;transform:translateY(0) scale(1)}` +
            `${d}%,100%{opacity:0;transform:translateY(0) scale(1)}}` +
            `.k${i}{animation:k${i} ${duration}s linear forwards}`;
    }).join('');

    const html = chunks
        .map((c, i) => `<div class="cap k${i}">${mark(c.text)}</div>`)
        .join('');

    return { css, html };
}

/** The caption's own styles — position, size, the heavy outline. */
export const KARAOKE_CSS = `
    /* Anchored bottom-centre and growing upward, so a two-line chunk never
       shoves a one-line chunk around. No box behind it: at four or five words a
       chunk the text carries its own contrast from the outline, and the footage
       stays visible the whole time. */
    .caps { position: absolute; z-index: 20; left: 50%; bottom: 110px; width: 1480px;
        transform: translateX(-50%); pointer-events: none; }
    .cap { position: absolute; left: 0; right: 0; bottom: 0; text-align: center; opacity: 0;
        font-size: 58px; font-weight: 900; line-height: 1.22; color: #ffffff;
        letter-spacing: 0.5px;
        text-shadow: 0 0 4px #000, 0 4px 0 rgba(0,0,0,0.5), 0 8px 30px rgba(0,0,0,0.9),
                     -3px -3px 0 #000, 3px -3px 0 #000, -3px 3px 0 #000, 3px 3px 0 #000,
                     -3px 0 0 #000, 3px 0 0 #000, 0 -3px 0 #000, 0 3px 0 #000; }
    .hi { font-style: normal; color: #fde047; font-weight: 900; }
`;
