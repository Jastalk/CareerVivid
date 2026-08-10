/**
 * Choosing readable ink for a colour the user picked.
 *
 * Templates paint headers, sidebars and pills with `themeColor`, then hardcode
 * `text-white` on top. That is fine for navy and wrong for the yellow, pale
 * blue and light grey the same palettes offer — white on `#f1c40f` measures
 * 1.9:1, which is unreadable on screen and worse in print. The same colour used
 * AS text on white paper fails just as often: `#aaaaaa` headings are 2.3:1.
 *
 * Both problems are one problem — a colour was chosen for personality, and
 * nothing checked it could be read. These helpers make that check automatic, so
 * a template can offer any palette without any combination becoming unreadable.
 *
 * Deliberately not a palette cull: resumes already saved carry their colour, so
 * removing a swatch from the picker would not fix a single existing document.
 */

const HEX = /^#?([a-f\d]{3}|[a-f\d]{6})$/i;

export interface Rgb {
    r: number;
    g: number;
    b: number;
}

export function parseHex(hex: string): Rgb | null {
    const m = typeof hex === 'string' ? hex.trim().match(HEX) : null;
    if (!m) return null;
    let body = m[1];
    if (body.length === 3) body = body.split('').map((c) => c + c).join('');
    const n = parseInt(body, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

const toHex = ({ r, g, b }: Rgb): string =>
    `#${[r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('')}`;

/** WCAG relative luminance. */
export function luminance(c: Rgb): number {
    const f = (v: number) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
}

export function contrast(a: Rgb, b: Rgb): number {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
}

/** Near-black rather than pure black: softer in print, still 16:1 on white. */
export const INK_DARK = '#111827';
export const INK_LIGHT = '#ffffff';

/**
 * The readable ink to put ON a background.
 *
 * Near-black is preferred because it is softer in print, but it is not always
 * enough: mid-greys like `#718096` leave it at 4.42:1, where true black reaches
 * 5.27:1. So the candidates are tried in order of preference and the first one
 * that actually clears AA wins. If a colour is so mid-toned that none do, the
 * best available is used rather than a failure — the ink is never the reason
 * something is unreadable, even when the colour is.
 */
export function inkOn(background: string): string {
    const bg = parseHex(background);
    if (!bg) return INK_DARK;
    const candidates = [INK_DARK, '#000000', INK_LIGHT];
    for (const ink of candidates) {
        if (contrast(parseHex(ink)!, bg) >= 4.5) return ink;
    }
    return candidates.reduce((best, ink) =>
        contrast(parseHex(ink)!, bg) > contrast(parseHex(best)!, bg) ? ink : best);
}

/** Softer secondary ink on a coloured panel, still meeting AA for body text. */
export function mutedInkOn(background: string): string {
    const bg = parseHex(background);
    if (!bg) return INK_DARK;
    // Pull the ink toward the panel until it reads as secondary, then stop at
    // the last step that still clears AA — a "subtle" label nobody can read is
    // not subtle, it is missing.
    const base = inkOn(background);
    const target = parseHex(base)!;
    let best = base;
    for (let t = 0.1; t <= 0.55; t += 0.05) {
        const mixed = toHex({
            r: target.r + (bg.r - target.r) * t,
            g: target.g + (bg.g - target.g) * t,
            b: target.b + (bg.b - target.b) * t,
        });
        // Measured after rounding to hex: checking the unrounded mix let a
        // value through that dipped under 4.5 once it became a real colour.
        if (contrast(parseHex(mixed)!, bg) < 4.5) break;
        best = mixed;
    }
    return best;
}

/**
 * The theme colour, darkened just enough to be readable AS text.
 *
 * Hue and saturation are left alone and only lightness moves, so a yellow
 * resume still reads as yellow — it simply stops being invisible. Large display
 * text can use `minRatio` 3, per WCAG.
 */
export function readableAccent(color: string, background = '#ffffff', minRatio = 4.5): string {
    const fg = parseHex(color);
    const bg = parseHex(background);
    if (!fg || !bg) return INK_DARK;
    if (contrast(fg, bg) >= minRatio) return toHex(fg);

    const towardDark = luminance(bg) > 0.5;
    const target = towardDark ? { r: 0, g: 0, b: 0 } : { r: 255, g: 255, b: 255 };

    let best = towardDark ? INK_DARK : INK_LIGHT;
    // 5% steps: fine enough that the colour keeps its character, coarse enough
    // to settle in a handful of iterations.
    for (let t = 0.05; t <= 1; t += 0.05) {
        // Rounded before measuring: a mix can clear the bar as floats and fall
        // under it once it becomes a real hex colour.
        const mixed = toHex({
            r: fg.r + (target.r - fg.r) * t,
            g: fg.g + (target.g - fg.g) * t,
            b: fg.b + (target.b - fg.b) * t,
        });
        if (contrast(parseHex(mixed)!, bg) >= minRatio) {
            best = mixed;
            break;
        }
    }
    return best;
}

/** True when a panel painted this colour needs light text. */
export const isDarkColor = (color: string): boolean => inkOn(color) === INK_LIGHT;

/**
 * A border that stays visible on paper whatever the theme colour.
 *
 * A pale theme colour as a rule under a heading disappears against white, which
 * is what makes several templates look unfinished rather than minimal.
 */
export function readableBorder(color: string, background = '#ffffff'): string {
    return readableAccent(color, background, 2.2);
}
