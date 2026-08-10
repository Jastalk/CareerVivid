/**
 * Human-readable timestamps for document lists.
 *
 * Cards were rendering `new Date(x).toLocaleString()`, which produces
 * "8/8/2026, 4:57:35 AM" — seconds of precision nobody reads, in a format that
 * changes shape by locale and so cannot be sized or aligned reliably. What a
 * list of resumes actually answers is "how recently did I touch this", so the
 * recent past is relative and anything older falls back to a plain date.
 *
 * `Intl.RelativeTimeFormat` handles the pluralisation and translation, so this
 * stays correct in every language the product ships.
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/** Past this, "5 weeks ago" is less useful than the date itself. */
const ABSOLUTE_AFTER = 4 * WEEK;

type Stamp = string | number | Date | null | undefined;

const toDate = (value: Stamp): Date | null => {
    if (value === null || value === undefined) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

export function formatRelativeTime(value: Stamp, locale?: string): string {
    const date = toDate(value);
    if (!date) return '';

    const diff = Date.now() - date.getTime();

    // Clock skew and optimistic writes can land a moment in the future; showing
    // "in 3 seconds" for something the user just saved reads like a bug.
    if (diff < MINUTE) return 'just now';

    if (diff < ABSOLUTE_AFTER) {
        const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
        if (diff < HOUR) return rtf.format(-Math.floor(diff / MINUTE), 'minute');
        if (diff < DAY) return rtf.format(-Math.floor(diff / HOUR), 'hour');
        if (diff < WEEK) return rtf.format(-Math.floor(diff / DAY), 'day');
        return rtf.format(-Math.floor(diff / WEEK), 'week');
    }

    return date.toLocaleDateString(locale, {
        year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

/** The full timestamp, for a `title` tooltip on the relative label. */
export function formatAbsoluteTime(value: Stamp, locale?: string): string {
    const date = toDate(value);
    return date ? date.toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' }) : '';
}
