/**
 * The job list anyone can read, signed in or not.
 *
 * `getRecommendedScrapedJobs` is `onCall` and rejects unauthenticated callers,
 * which is correct for a personalised feed — it ranks against the caller's own
 * profile. But it makes the listings unreachable to two audiences that matter:
 * someone deciding whether to sign up, and Googlebot.
 *
 * So this is deliberately the *impersonal* view of the same collection: newest
 * first, no profile, no scoring. The match score is the thing you sign in for,
 * and it is not withheld as a growth tactic — it genuinely cannot be computed
 * without a resume to compare against.
 *
 * `onRequest` rather than `onCall` because a callable requires the Firebase SDK
 * to invoke it, and a crawler has no SDK. This answers a plain GET.
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

/** One screen of results. The client shows numbered pages over this. */
export const PUBLIC_JOBS_PAGE_SIZE = 24;

/**
 * How deep the pages go.
 *
 * Firestore has no cheap total count and offset paging costs a read per skipped
 * document, so depth is bounded rather than unbounded. Nobody reaches page 40
 * of a job board; they refine instead.
 */
export const MAX_PUBLIC_JOB_PAGES = 25;

const MAX_SCAN = PUBLIC_JOBS_PAGE_SIZE * MAX_PUBLIC_JOB_PAGES;

const NAMED_ENTITIES: Record<string, string> = {
    nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'",
    mdash: "—", ndash: "–", hellip: "…", middot: "·", bull: "•",
    lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”",
    copy: "©", reg: "®", trade: "™", deg: "°",
};

/**
 * Decode the entities a scraped page actually contains.
 *
 * An unrecognised entity is left exactly as it was rather than replaced with a
 * space, which is what the previous `/&[a-z#0-9]+;/` catch-all did — it turned
 * "&copy; 2026 Stripe" into " 2026 Stripe" and every `&#8217;` apostrophe into a
 * hole in the middle of a word.
 */
const decodeEntities = (text: string): string =>
    text.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (whole, body: string) => {
        if (body.startsWith("#")) {
            const code = /^#x/i.test(body)
                ? Number.parseInt(body.slice(2), 16)
                : Number.parseInt(body.slice(1), 10);
            const printable = Number.isFinite(code) && code > 0 && code <= 0x10ffff
                && !(code >= 0xd800 && code <= 0xdfff);
            return printable ? String.fromCodePoint(code) : whole;
        }
        return NAMED_ENTITIES[body.toLowerCase()] ?? whole;
    });

/* Comments first: `<!-- note > here -->` contains a `>`, so a plain tag regex
 * ends the match at that `>` and spills " here -->" onto the card as text. */
const COMMENT = /<!--[\s\S]*?(?:-->|$)/g;

/* An unclosed <script> is why this matches to end-of-string as well as to a
 * closing tag: a truncated scrape ends mid-script, the tag itself gets stripped,
 * and the JavaScript body is left behind looking like part of the job ad. */
const SCRIPTISH = /<(script|style)\b[\s\S]*?(?:<\/\1\s*>|$)/gi;

/* Block-level tags become a space rather than nothing, so "…platform.</p><p>We
 * are…" does not run two sentences together. */
const BLOCK = /<\/?(p|div|br|li|ul|ol|h[1-6]|tr|td|section|table|blockquote)\b[^>]*>/gi;

/* '<' has to be followed by a tag name, a closing '/', a '!' or a '?' for this
 * to count as markup. The obvious /<[^>]*>/ matches "< 100ms, uptime >" in
 * "Latency < 100ms, uptime > 99.9%", deleting the middle of the sentence — and
 * a job ad states a latency budget far more often than a card shows a tag. */
const ANY_TAG = /<[/!?a-z][^>]*>/gi;

/* A scrape cut mid-tag leaves a "<div class=" with no closing bracket, which no
 * tag pattern matches and which reads as garbage at the end of a blurb.
 *
 * The '<' must be followed by a tag name, a '/' or a '!' before this treats it
 * as markup. Matching a bare '<' instead would delete the rest of the sentence
 * in "Latency < 100ms" and "revenue < $1M" — things job ads say far more often
 * than they end mid-tag. */
const TRUNCATED_TAG = /<[/!a-z][^>]*$/i;

const stripMarkup = (input: string): string =>
    input.replace(COMMENT, " ").replace(SCRIPTISH, " ").replace(BLOCK, " ")
        .replace(ANY_TAG, "").replace(TRUNCATED_TAG, " ");

/**
 * Turn a scraped description into a sentence a person can read.
 *
 * These come out of Greenhouse, Lever and Ashby as raw HTML, so the card was
 * showing `<h2>Who we are</h2> <h3>About Stripe</h3> <p>Stripe is a financial…`
 * — the markup rendered as text, on the page whose whole job is to make the
 * listings look worth trusting.
 *
 * Stripping and decoding run to a fixed point rather than once each, because
 * either step can produce input for the other: removing `<b>` from `<<b>i>`
 * leaves `<i>`, and decoding `&lt;script&gt;` produces a tag that a single
 * earlier pass has already gone past. One pass leaves markup in the output.
 *
 * Consequence worth knowing: a listing that deliberately writes about HTML
 * loses the tag name from its teaser, because "&lt;div&gt;" decodes to markup
 * and is then stripped. That is the right way round for a page of listings from
 * sources we do not control — the alternative shows scraped script source to
 * strangers as if the ad had been written that way.
 *
 * This is a formatter, not a security boundary. Everything it returns is HTML
 * escaped again by `esc()` in functions/src/seo/renderSeoContent.ts before it
 * reaches a page, and React escapes it in the client. Neither depends on this.
 */
const plainText = (value: unknown): string => {
    let text = String(value ?? "");

    for (let pass = 0; pass < 5; pass += 1) {
        const before = text;
        text = decodeEntities(stripMarkup(text));
        if (text === before) break;
    }

    // Input crafted to never converge still must not return markup, so the last
    // word is a strip rather than a decode.
    return stripMarkup(text).replace(/\s+/g, " ").trim();
};

/** Trim a description to a readable card blurb without cutting mid-word. */
const blurb = (value: unknown, max = 260): string => {
    const text = plainText(value);
    if (text.length <= max) return text;
    const cut = text.slice(0, max);
    const lastSpace = cut.lastIndexOf(" ");
    return `${lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut}…`;
};

/**
 * A salary, or nothing.
 *
 * Scrapers write "Not listed" into the field rather than leaving it empty, and
 * a truthy string renders — so cards were showing "Not listed" in the slot
 * where a number goes, which reads worse than showing nothing at all.
 */
const NON_SALARY = /^(not\s*(listed|specified|provided|disclosed)|n\/?a|none|unspecified|tbd|-+|—)$/i;
const salaryOf = (value: unknown): string => {
    const text = String(value ?? "").replace(/\s+/g, " ").trim();
    return !text || NON_SALARY.test(text) ? "" : text;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * A date a person reads, not a timestamp.
 *
 * Cards were printing `2026-07-01T11:25:04-04:00`. Formatted here rather than
 * in the browser so the crawler HTML and the rendered page agree — and without
 * toLocaleDateString, whose output depends on the server's locale.
 */
const postedOn = (value: unknown): string => {
    const raw = String(value ?? "").trim();
    if (!raw) return "";
    const ms = Date.parse(raw);
    if (Number.isNaN(ms)) return raw.length <= 24 ? raw : "";
    const d = new Date(ms);
    return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
};

export interface PublicJob {
    id: string;
    title: string;
    company: string;
    location: string;
    workModel: string;
    jobType: string;
    seniority: string;
    salary: string;
    postedAt: string;
    sourceLabel: string;
    applyUrl: string;
    description: string;
}

/**
 * Shape a stored listing into what a signed-out visitor may see.
 *
 * An allowlist, not a redaction: `matchedKeywords`, `missingKeywords` and
 * `signals` are derived from a user's profile and must never leave the server
 * on an unauthenticated response. Spreading the document and deleting fields
 * would leak the next field somebody adds.
 */
export function toPublicJob(id: string, data: any): PublicJob | null {
    const title = String(data?.title ?? "").trim();
    const applyUrl = String(data?.applyUrl ?? "").trim();
    // A listing you cannot apply to is not a listing.
    if (!title || !applyUrl) return null;

    return {
        id,
        title,
        company: String(data?.company ?? "").trim(),
        location: String(data?.location ?? "").trim(),
        workModel: String(data?.workModel ?? "").trim(),
        jobType: String(data?.jobType ?? "").trim(),
        seniority: String(data?.seniority ?? "").trim(),
        salary: salaryOf(data?.salary),
        postedAt: postedOn(data?.postedAt),
        sourceLabel: String(data?.sourceLabel ?? "").trim(),
        applyUrl,
        description: blurb(data?.description),
    };
}

/** Clamp a page number arriving from a URL. */
export const normalizePage = (raw: unknown): number => {
    const n = Math.floor(Number(raw));
    if (!Number.isFinite(n) || n < 1) return 1;
    return Math.min(n, MAX_PUBLIC_JOB_PAGES);
};

/**
 * Read one page of validated, still-open listings.
 *
 * Shared with the crawler renderer so the HTML Google reads and the JSON the
 * browser fetches can never describe different jobs — a mismatch there is
 * cloaking, whether or not anyone intended it.
 */
export async function readPublicJobs(page: unknown): Promise<{
    jobs: PublicJob[];
    page: number;
    pageSize: number;
    totalPages: number;
    hasMore: boolean;
}> {
    const safePage = normalizePage(page);

    // The same filters the signed-in feed trusts: cron marks a listing invalid
    // once its apply URL stops resolving, and inactive ones are never shown.
    const snapshot = await db.collection("scrapedJobListings")
        .where("active", "==", true)
        .where("validationStatus", "==", "valid")
        .orderBy("fetchedAt", "desc")
        .limit(Math.min(safePage * PUBLIC_JOBS_PAGE_SIZE + 1, MAX_SCAN + 1))
        .get();

    const all = snapshot.docs
        .map((doc) => toPublicJob(doc.id, doc.data()))
        .filter((job): job is PublicJob => job !== null);

    const start = (safePage - 1) * PUBLIC_JOBS_PAGE_SIZE;
    const jobs = all.slice(start, start + PUBLIC_JOBS_PAGE_SIZE);
    const hasMore = all.length > start + PUBLIC_JOBS_PAGE_SIZE;

    return {
        jobs,
        page: safePage,
        pageSize: PUBLIC_JOBS_PAGE_SIZE,
        // Pages proven to exist. Growing by one while there is more keeps the
        // pager honest without a count query: it never promises a page that
        // turns out to be empty.
        totalPages: Math.min(hasMore ? safePage + 1 : safePage, MAX_PUBLIC_JOB_PAGES),
        hasMore: hasMore && safePage < MAX_PUBLIC_JOB_PAGES,
    };
}

export const publicJobFeed = functions.region("us-west1").runWith({
    timeoutSeconds: 30,
    memory: "256MB",
}).https.onRequest(async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    if (req.method === "OPTIONS") {
        res.set("Access-Control-Allow-Methods", "GET");
        res.status(204).send("");
        return;
    }

    try {
        const result = await readPublicJobs(req.query.page);
        // Public and identical for everyone, so it can sit on the CDN. Ten
        // minutes is well inside how often the scraper adds listings, and
        // stale-while-revalidate means nobody waits on a cold read.
        res.set("Cache-Control", "public, max-age=600, s-maxage=600, stale-while-revalidate=3600");
        res.status(200).json(result);
    } catch (error) {
        functions.logger.error("publicJobFeed failed", error);
        res.status(500).json({ error: "Could not load jobs right now." });
    }
});
