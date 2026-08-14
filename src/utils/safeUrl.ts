const HTTP_PROTOCOLS = new Set(['http:', 'https:']);

/** Returns a normalized http(s) URL, or null for unsafe and malformed values. */
export const toSafeExternalUrl = (value: string | undefined | null): string | null => {
  if (!value) return null;

  try {
    const url = new URL(value);
    return HTTP_PROTOCOLS.has(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
};

/** Restricts post-auth navigation to a route owned by the current web origin. */
export const toSafeInternalPath = (value: string | null, fallback: string): string => {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return fallback;

  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
};

/**
 * Scheme allow-listing for user-authored links.
 *
 * Resume owners type their own website URLs, and those strings end up in an
 * `<a href>` that a recruiter — or anyone viewing a public resume — will click.
 * React escapes the *text* of an attribute but happily renders
 * `href="javascript:..."`, so an owner could turn their resume into a
 * one-click script runner on careervivid.app. Everything here exists to make
 * that impossible while leaving honest links untouched.
 */

/** Schemes we are willing to put in an href. Everything else is dropped. */
const ALLOWED_SCHEMES = new Set(['http:', 'https:', 'mailto:']);

/**
 * Control characters browsers strip from a URL *before* resolving its scheme.
 * `java\tscript:alert(1)` and `java&#10;script:alert(1)` both navigate, so the
 * same characters have to come out before we look at the scheme ourselves.
 * Covers C0, DEL, and the C1 range, plus the Unicode space separators that
 * `String.prototype.trim` removes but a naive `\s` class in a URL would not.
 */
const STRIPPED_CHARS = /[\u0000-\u0020\u007f-\u00a0\u1680\u2000-\u200f\u2028\u2029\u202f\u205f\u3000\ufeff]/g;

/** A scheme, per RFC 3986: ALPHA *( ALPHA / DIGIT / "+" / "-" / "." ) ":" */
const SCHEME_PATTERN = /^([a-zA-Z][a-zA-Z0-9+.-]*):/;

/**
 * Returns `url` when it is safe to use as an `href`, otherwise `undefined`.
 *
 * Safe means: an absolute URL on http/https/mailto, or a relative URL (which
 * can only ever resolve against our own origin). `undefined` is deliberate —
 * spreading it onto a JSX prop renders no attribute at all, so the link
 * degrades to plain text rather than becoming a live `javascript:` trigger.
 */
export const safeUrl = (url: string | null | undefined): string | undefined => {
  if (typeof url !== 'string') return undefined;

  const trimmed = url.trim();
  if (!trimmed) return undefined;

  // Test the scheme against the string the *browser* will see, not the one the
  // user typed: tabs, newlines, and NULs inside "java\tscript:" are discarded
  // during navigation, so they have to be discarded here first.
  const normalized = trimmed.replace(STRIPPED_CHARS, '');
  if (!normalized) return undefined;

  const scheme = SCHEME_PATTERN.exec(normalized);

  // No scheme at all: a relative URL, an anchor, or a bare "example.com".
  // None of these can escape our origin, so they pass through. A
  // protocol-relative "//evil.example" is still just http/https.
  if (!scheme) return trimmed;

  if (!ALLOWED_SCHEMES.has(`${scheme[1].toLowerCase()}:`)) return undefined;

  return trimmed;
};
