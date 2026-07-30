import * as functions from "firebase-functions/v1";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import { DomUtils, parseDocument } from "htmlparser2";
import { lookup } from "dns/promises";
import { isIP } from "net";
import { GENERATED_ATS_SOURCES } from "./atsBoards.generated";

if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

type AtsSource = {
    provider: "greenhouse" | "lever" | "ashby";
    company: string;
    boardToken: string;
    companyUrl?: string;
};

type LinkValidationStatus = "valid" | "stale" | "expired" | "blocked" | "unknown";

type LinkValidationFields = {
    validationStatus: LinkValidationStatus;
    validatedAt: admin.firestore.Timestamp;
    finalUrl: string;
    validationReason: string;
};

type JobLinkValidationTarget = {
    id: string;
    title: string;
    company: string;
    applyUrl: string;
    provider?: "greenhouse" | "lever" | "ashby";
    sourceJobId?: string;
};

type ScrapedJobListing = {
    id: string;
    title: string;
    company: string;
    location: string;
    workModel: "Remote" | "Hybrid" | "On-site";
    salary: string;
    jobType: string;
    jobFunction: string;
    seniority: string;
    postedAt: string;
    source: "scraped";
    sourceLabel: string;
    applyUrl: string;
    description: string;
    matchedKeywords: string[];
    missingKeywords: string[];
    signals: string[];
    provider: "greenhouse" | "lever" | "ashby";
    sourceKey: string;
    sourceJobId: string;
    active: boolean;
    fetchedAt: admin.firestore.Timestamp;
    updatedAt: admin.firestore.Timestamp;
} & LinkValidationFields;

export type ValidatedScrapedJobSearchInput = {
    role?: string;
    location?: string;
    count?: number;
    minScore?: number;
    targetOrgs?: string[];
    resumeContent?: string;
};

export type ValidatedScrapedJobMatch = {
    id: string;
    title: string;
    company: string;
    location: string;
    description: string;
    url: string;
    salary: string | null;
    score: number;
    scoreLabel: "Excellent" | "Good" | "Fair" | "Low";
    aiSummary: string;
    missingSkills: string[];
    validationStatus: LinkValidationStatus;
    validatedAt: number | null;
    finalUrl: string;
    validationReason: string;
    source: "validated_scraped_feed";
    sourceLabel: string;
    provider: "greenhouse" | "lever" | "ashby";
    sourceKey: string;
    sourceJobId: string;
    workModel: "Remote" | "Hybrid" | "On-site";
    jobType: string;
    jobFunction: string;
    seniority: string;
    matchedKeywords: string[];
    missingKeywords: string[];
    signals: string[];
};

export type ExternalJobLinkValidationInput = {
    url?: string;
    title?: string;
    company?: string;
};

type SourceFetchResult = {
    source: AtsSource;
    jobs: ScrapedJobListing[];
};

const CURATED_ATS_SOURCES: AtsSource[] = [
    { provider: "greenhouse", company: "Databricks", boardToken: "databricks", companyUrl: "https://www.databricks.com/company/careers" },
    { provider: "greenhouse", company: "Airtable", boardToken: "airtable", companyUrl: "https://www.airtable.com/careers" },
    { provider: "greenhouse", company: "DoorDash", boardToken: "doordashusa", companyUrl: "https://careers.doordash.com/" },
    { provider: "greenhouse", company: "Figma", boardToken: "figma", companyUrl: "https://www.figma.com/careers/" },
    { provider: "greenhouse", company: "Discord", boardToken: "discord", companyUrl: "https://discord.com/careers" },
    { provider: "greenhouse", company: "Robinhood", boardToken: "robinhood", companyUrl: "https://careers.robinhood.com/" },
    { provider: "greenhouse", company: "Brex", boardToken: "brex", companyUrl: "https://www.brex.com/careers" },
    { provider: "greenhouse", company: "Asana", boardToken: "asana", companyUrl: "https://asana.com/jobs" },
    { provider: "greenhouse", company: "Lightning AI", boardToken: "lightningai", companyUrl: "https://lightning.ai/careers" },
    { provider: "greenhouse", company: "Anthropic", boardToken: "anthropic", companyUrl: "https://www.anthropic.com/careers" },
    { provider: "greenhouse", company: "Stripe", boardToken: "stripe", companyUrl: "https://stripe.com/jobs" },
    { provider: "greenhouse", company: "Vercel", boardToken: "vercel", companyUrl: "https://vercel.com/careers" },
    { provider: "ashby", company: "OpenAI", boardToken: "openai", companyUrl: "https://openai.com/careers" },
];

/**
 * Full source list = curated entries + boards auto-discovered from the
 * interview-guide companies (scripts/discover-ats-boards.mjs). Curated
 * entries win on conflict because they carry verified company URLs.
 */
const ATS_SOURCES: AtsSource[] = (() => {
    const seen = new Set(CURATED_ATS_SOURCES.map((s) => `${s.provider}:${s.boardToken}`));
    const merged: AtsSource[] = [...CURATED_ATS_SOURCES];
    for (const source of GENERATED_ATS_SOURCES) {
        const key = `${source.provider}:${source.boardToken}`;
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push({ ...source, companyUrl: source.companyUrl || undefined });
    }
    return merged;
})();

type JobFunction =
    | "Engineering"
    | "Data & AI"
    | "Product"
    | "Design"
    | "Marketing"
    | "Sales & Partnerships"
    | "Customer Success"
    | "People & Recruiting"
    | "Finance & Legal"
    | "Operations"
    | "Other";

const JOB_FUNCTION_ORDER: JobFunction[] = [
    "Engineering",
    "Data & AI",
    "Product",
    "Design",
    "Marketing",
    "Sales & Partnerships",
    "Customer Success",
    "People & Recruiting",
    "Finance & Legal",
    "Operations",
    "Other",
];

const PRIMARY_PROFILE_KEYWORDS = [
    "React",
    "TypeScript",
    "JavaScript",
    "HTML",
    "CSS",
    "REST",
    "API",
    "SQL",
    "Cloud",
    "CI/CD",
    "Testing",
    "Accessibility",
    "Frontend",
    "Full stack",
    "System design",
];

const APPLY_PAGE_PATTERN = /\b(apply|apply for this job|submit application|job application|application for)\b/i;
const CLOSED_JOB_PATTERN = /\b(no longer accepting|job is closed|position has been filled|position is closed|job no longer available|not accepting applications|this job has expired|404|not found)\b/i;
const BLOCKED_PAGE_PATTERN = /\b(access denied|captcha|cloudflare|verify you are human|too many requests|temporarily blocked)\b/i;
const LINK_VALIDATION_CONCURRENCY = 8;
// Keep the validation workload bounded while reserving room for every job
// function. The prior title filter only retained technical roles.
const MAX_JOBS_PER_SOURCE = 40;
const FEED_VALIDATION_STALE_MS = 6 * 60 * 60 * 1000;
const OPEN_VALIDATION_STALE_MS = 30 * 60 * 1000;
const CLI_JOB_VALIDATION_STALE_MS = 2 * 60 * 60 * 1000;
const SEARCH_STOP_WORDS = new Set([
    "a",
    "an",
    "and",
    "at",
    "for",
    "from",
    "in",
    "job",
    "jobs",
    "of",
    "on",
    "or",
    "role",
    "the",
    "to",
    "with",
]);

const OMITTED_TEXT_TAGS = new Set(["noscript", "script", "style", "template"]);
const BLOCK_TEXT_TAGS = new Set(["article", "br", "div", "h1", "h2", "h3", "h4", "h5", "h6", "li", "p", "section"]);

const stripHtml = (value: string): string => {
    const collectText = (nodes: ReturnType<typeof parseDocument>["children"]): string => nodes.map((node) => {
        if (DomUtils.isText(node)) return node.data;
        if (!DomUtils.hasChildren(node)) return "";
        if (DomUtils.isTag(node) && OMITTED_TEXT_TAGS.has(node.name.toLowerCase())) return "";

        const text = collectText(node.children);
        return DomUtils.isTag(node) && BLOCK_TEXT_TAGS.has(node.name.toLowerCase()) ? ` ${text} ` : text;
    }).join("");

    return collectText(parseDocument(value || "").children).replace(/\s+/g, " ").trim();
};

const stableId = (parts: string[]): string => {
    const base = parts.join("-").toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    return base.slice(0, 180) || `job-${Date.now()}`;
};

const detectWorkModel = (location: string, text: string): "Remote" | "Hybrid" | "On-site" => {
    const lower = `${location} ${text}`.toLowerCase();
    if (lower.includes("remote")) return "Remote";
    if (lower.includes("hybrid")) return "Hybrid";
    return "On-site";
};

const detectSeniority = (title: string, text: string): string => {
    const lower = `${title} ${text}`.toLowerCase();
    if (/\b(intern|internship)\b/.test(lower)) return "Internship";
    if (/\b(principal|staff|lead)\b/.test(lower)) return "Lead";
    if (/\b(senior|sr\.?)\b/.test(lower)) return "Senior";
    if (/\b(junior|jr\.?|entry)\b/.test(lower)) return "Entry Level";
    return "Mid Level";
};

const detectJobFunction = (title: string, context = ""): JobFunction => {
    const text = `${title} ${context}`.toLowerCase();
    if (/\b(recruit|talent|people|human resources|hr)\b/.test(text)) return "People & Recruiting";
    if (/\b(marketing|brand|content|communications|public relations|growth)\b/.test(text)) return "Marketing";
    if (/\b(account executive|sales|business development|partnership|revenue)\b/.test(text)) return "Sales & Partnerships";
    if (/\b(customer success|customer support|support|implementation|solutions consultant|technical account)\b/.test(text)) return "Customer Success";
    if (/\b(product manager|product management|product operations|product owner)\b/.test(text)) return "Product";
    if (/\b(design|ux|ui|creative|researcher)\b/.test(text)) return "Design";
    if (/\b(finance|accounting|legal|counsel|compliance|tax|audit)\b/.test(text)) return "Finance & Legal";
    if (/\b(operations|program manager|project manager|workplace|business operations)\b/.test(text)) return "Operations";
    if (/\b(data|analytics|machine learning|artificial intelligence| ai |research scientist)\b/.test(` ${text} `)) return "Data & AI";
    if (/\b(engineer|developer|software|devops|site reliability|security|infrastructure|it )\b/.test(text)) return "Engineering";
    return "Other";
};

const selectDiverseJobs = <T>(
    jobs: T[],
    getJobFunction: (job: T) => JobFunction
): T[] => {
    const buckets = new Map<JobFunction, T[]>();
    JOB_FUNCTION_ORDER.forEach((jobFunction) => buckets.set(jobFunction, []));
    jobs.forEach((job) => buckets.get(getJobFunction(job))?.push(job));

    const selected: T[] = [];
    while (selected.length < MAX_JOBS_PER_SOURCE) {
        let selectedThisPass = false;
        for (const jobFunction of JOB_FUNCTION_ORDER) {
            const nextJob = buckets.get(jobFunction)?.shift();
            if (!nextJob) continue;
            selected.push(nextJob);
            selectedThisPass = true;
            if (selected.length >= MAX_JOBS_PER_SOURCE) break;
        }
        if (!selectedThisPass) break;
    }
    return selected;
};

const keywordFit = (title: string, description: string) => {
    const text = `${title} ${description}`.toLowerCase();
    const matched = PRIMARY_PROFILE_KEYWORDS.filter((keyword) => text.includes(keyword.toLowerCase()));
    return { matchedKeywords: matched.slice(0, 8), missingKeywords: [] };
};

const normalizeSalary = (text: string): string => {
    const match = text.match(/\$\s?\d{2,3}(?:,\d{3})?\s?(?:-|–|to)\s?\$?\s?\d{2,3}(?:,\d{3})?/i);
    return match ? match[0].replace(/\s+/g, " ") : "Not listed";
};

const scoreLabel = (score: number): ValidatedScrapedJobMatch["scoreLabel"] => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Fair";
    return "Low";
};

const tokenizeSearchText = (value: string): string[] => {
    const tokens = value
        .toLowerCase()
        .split(/[^a-z0-9+#.]+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 2 && !SEARCH_STOP_WORDS.has(token));

    return Array.from(new Set(tokens)).slice(0, 18);
};

const normalizeProfileKeywordInput = (value: unknown): string[] => {
    if (!Array.isArray(value)) return [];

    return Array.from(new Set(
        value
            .map((keyword) => String(keyword || "").trim())
            .filter((keyword) => keyword.length >= 2)
            .slice(0, 40)
    ));
};

type ProfileScorableListing = Pick<ScrapedJobListing, "title" | "company" | "description" | "matchedKeywords" | "signals">;
type RecommendationScorableListing = ProfileScorableListing & Pick<ScrapedJobListing, "location" | "workModel">;

type RecommendationLocationPreferences = {
    country: string;
    locations: string[];
    workModelPreference: "remote" | "hybrid" | "onsite" | "flexible";
};

const scoreListingForProfileKeywords = (job: ProfileScorableListing, profileKeywords: string[]): number => {
    if (!profileKeywords.length) return 0;

    const searchableJobText = `${job.title} ${job.company} ${job.description} ${job.matchedKeywords.join(" ")} ${job.signals.join(" ")}`.toLowerCase();
    const normalizedKeywords = profileKeywords
        .map((keyword) => keyword.toLowerCase().trim())
        .filter(Boolean);
    const directHits = normalizedKeywords.filter((keyword) => searchableJobText.includes(keyword)).length;
    const tokenHits = normalizedKeywords.flatMap(tokenizeSearchText)
        .filter((token) => searchableJobText.includes(token)).length;

    return Math.min(100, directHits * 12 + tokenHits * 4);
};

const normalizeComparable = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const normalizeLocationPreferences = (data: unknown): RecommendationLocationPreferences => {
    const candidate = data && typeof data === "object" ? data as Record<string, unknown> : {};
    const workModel = String(candidate.workModelPreference || "flexible").toLowerCase();
    const locations = Array.isArray(candidate.locations)
        ? candidate.locations
            .map((location) => String(location || "").trim())
            .filter(Boolean)
            .slice(0, 8)
        : [];

    return {
        country: String(candidate.country || "").trim(),
        locations: Array.from(new Set(locations)),
        workModelPreference: ["remote", "hybrid", "onsite", "flexible"].includes(workModel)
            ? workModel as RecommendationLocationPreferences["workModelPreference"]
            : "flexible",
    };
};

const countryAliases = (country: string): string[] => {
    const normalized = normalizeComparable(country);
    if (["united states", "usa", "us"].includes(normalized)) return ["united states", "usa", "us"];
    if (["united kingdom", "uk", "great britain"].includes(normalized)) return ["united kingdom", "uk", "great britain"];
    return normalized ? [normalized] : [];
};

const locationIncludes = (jobLocation: string, preference: string): boolean => {
    const normalizedPreference = normalizeComparable(preference);
    if (!normalizedPreference) return false;
    if (jobLocation.includes(normalizedPreference)) return true;

    const tokens = normalizedPreference.split(" ").filter((token) => token.length > 2);
    if (tokens.length > 0 && tokens.every((token) => jobLocation.includes(token))) return true;
    return tokens.length > 1 && jobLocation.includes(tokens[0]);
};

const scoreListingForLocationPreferences = (
    job: Pick<ScrapedJobListing, "location" | "workModel">,
    preferences: RecommendationLocationPreferences
): number => {
    const jobLocation = normalizeComparable(`${job.location} ${job.workModel}`);
    if (preferences.locations.some((location) => locationIncludes(jobLocation, location))) return 34;
    if (countryAliases(preferences.country).some((country) => locationIncludes(jobLocation, country))) return 22;

    const isRemote = job.workModel === "Remote" || jobLocation.includes("remote");
    if (isRemote && preferences.workModelPreference === "remote") return 18;
    if (isRemote && preferences.workModelPreference === "flexible") return 8;
    if (job.workModel === "Hybrid" && preferences.workModelPreference === "hybrid") return 12;
    if (job.workModel === "On-site" && preferences.workModelPreference === "onsite") return 12;
    return 0;
};

const scoreListingForRecommendation = (
    job: RecommendationScorableListing,
    profileKeywords: string[],
    locationPreferences: RecommendationLocationPreferences
): number => scoreListingForProfileKeywords(job, profileKeywords)
    + scoreListingForLocationPreferences(job, locationPreferences);

const requestedCompanyMatch = (job: ScrapedJobListing, targetOrgs?: string[]): boolean => {
    if (!Array.isArray(targetOrgs) || targetOrgs.length === 0) return false;
    const company = normalizeComparable(job.company);
    return targetOrgs.some((org) => {
        const normalizedOrg = normalizeComparable(org);
        return Boolean(normalizedOrg) && (company.includes(normalizedOrg) || normalizedOrg.includes(company));
    });
};

const requestedLocationScore = (job: ScrapedJobListing, location?: string): number => {
    const requested = normalizeComparable(location || "");
    if (!requested) return 4;

    const jobLocation = normalizeComparable(`${job.location} ${job.workModel}`);
    if (requested.includes("remote")) return jobLocation.includes("remote") ? 14 : 0;
    if (requested === "us" || requested.includes("united states") || requested.includes("usa")) {
        return /\b(us|usa|united states|remote)\b/.test(jobLocation) ? 10 : 3;
    }

    return jobLocation.includes(requested) ? 14 : 0;
};

const compactDescription = (description: string, maxLength = 260): string => {
    const normalized = stripHtml(description).replace(/\s+/g, " ").trim();
    if (!normalized) return "Validated job listing from the company ATS.";
    if (normalized.length <= maxLength) return normalized;

    const clipped = normalized.slice(0, maxLength);
    const lastBoundary = Math.max(clipped.lastIndexOf("."), clipped.lastIndexOf(";"), clipped.lastIndexOf(","));
    return `${clipped.slice(0, lastBoundary > 140 ? lastBoundary : maxLength).trim()}...`;
};

const scoreValidatedJob = (
    job: ScrapedJobListing,
    input: ValidatedScrapedJobSearchInput
): number => {
    const roleTokens = tokenizeSearchText(input.role || "");
    const resumeTokens = tokenizeSearchText(input.resumeContent || "");
    const searchableJobText = `${job.title} ${job.company} ${job.description} ${job.signals.join(" ")} ${job.matchedKeywords.join(" ")}`.toLowerCase();

    const roleHits = roleTokens.filter((token) => searchableJobText.includes(token)).length;
    const resumeHits = resumeTokens.filter((token) => searchableJobText.includes(token)).length;
    const keywordHits = job.matchedKeywords.length;
    const companyBoost = requestedCompanyMatch(job, input.targetOrgs) ? 18 : 0;
    const locationBoost = requestedLocationScore(job, input.location);
    const roleBoost = Math.min(28, roleHits * 7);
    const resumeBoost = Math.min(12, resumeHits * 3);
    const keywordBoost = Math.min(18, keywordHits * 3);
    const validationBoost = job.validationStatus === "valid" && job.finalUrl ? 8 : 0;

    const score = 38 + roleBoost + resumeBoost + keywordBoost + companyBoost + locationBoost + validationBoost;
    return Math.max(0, Math.min(97, Math.round(score)));
};

const buildMatchSummary = (job: ScrapedJobListing, score: number): string => {
    const matched = job.matchedKeywords.slice(0, 3);
    const matchText = matched.length ? `Strongest signals: ${matched.join(", ")}.` : "The listing is relevant to the requested role.";
    return `Verified ${job.sourceLabel} listing with a ${score}/100 CareerVivid fit score. ${matchText}`;
};

const toValidatedJobMatch = (
    job: ScrapedJobListing,
    input: ValidatedScrapedJobSearchInput
): ValidatedScrapedJobMatch => {
    const score = scoreValidatedJob(job, input);
    const finalUrl = job.finalUrl || job.applyUrl;

    return {
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        description: compactDescription(job.description),
        url: finalUrl,
        salary: job.salary && job.salary !== "Not listed" ? job.salary : null,
        score,
        scoreLabel: scoreLabel(score),
        aiSummary: buildMatchSummary(job, score),
        missingSkills: job.missingKeywords,
        validationStatus: job.validationStatus,
        validatedAt: job.validatedAt?.toMillis?.() || null,
        finalUrl,
        validationReason: job.validationReason,
        source: "validated_scraped_feed",
        sourceLabel: job.sourceLabel,
        provider: job.provider,
        sourceKey: job.sourceKey,
        sourceJobId: job.sourceJobId,
        workModel: job.workModel,
        jobType: job.jobType,
        jobFunction: job.jobFunction,
        seniority: job.seniority,
        matchedKeywords: job.matchedKeywords,
        missingKeywords: job.missingKeywords,
        signals: job.signals,
    };
};

const isHttpUrl = (url: string): boolean => /^https?:\/\//i.test(url);

const isPrivateIPv4 = (address: string): boolean => {
    const parts = address.split(".").map((part) => Number(part));
    if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) return true;
    const [first, second] = parts;

    return first === 10
        || first === 127
        || (first === 172 && second >= 16 && second <= 31)
        || (first === 192 && second === 168)
        || (first === 169 && second === 254)
        || first === 0;
};

const isPrivateIPv6 = (address: string): boolean => {
    const normalized = address.toLowerCase();
    return normalized === "::1"
        || normalized.startsWith("fc")
        || normalized.startsWith("fd")
        || normalized.startsWith("fe80")
        || normalized.startsWith("::ffff:10.")
        || normalized.startsWith("::ffff:127.")
        || normalized.startsWith("::ffff:169.254.")
        || normalized.startsWith("::ffff:172.16.")
        || normalized.startsWith("::ffff:172.17.")
        || normalized.startsWith("::ffff:172.18.")
        || normalized.startsWith("::ffff:172.19.")
        || normalized.startsWith("::ffff:172.2")
        || normalized.startsWith("::ffff:172.30.")
        || normalized.startsWith("::ffff:172.31.")
        || normalized.startsWith("::ffff:192.168.");
};

const isUnsafeAddress = (address: string): boolean => {
    const version = isIP(address);
    if (version === 4) return isPrivateIPv4(address);
    if (version === 6) return isPrivateIPv6(address);
    return true;
};

const assertSafeExternalUrl = async (url: string): Promise<void> => {
    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        throw new Error("Invalid URL.");
    }

    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        throw new Error("Only http and https URLs can be validated.");
    }

    const hostname = parsed.hostname.toLowerCase();
    if (
        hostname === "localhost"
        || hostname === "metadata.google.internal"
        || hostname.endsWith(".localhost")
        || hostname.endsWith(".local")
        || hostname.endsWith(".internal")
    ) {
        throw new Error("Unsafe host.");
    }

    if (isIP(hostname)) {
        if (isUnsafeAddress(hostname)) throw new Error("Unsafe host.");
        return;
    }

    const addresses = await lookup(hostname, { all: true, verbatim: false });
    if (!addresses.length || addresses.some((entry) => isUnsafeAddress(entry.address))) {
        throw new Error("Unsafe host.");
    }
};

const validationFields = (
    status: LinkValidationStatus,
    finalUrl: string,
    reason: string
): LinkValidationFields => ({
    validationStatus: status,
    validatedAt: admin.firestore.Timestamp.now(),
    finalUrl,
    validationReason: reason,
});

const initialValidationFields = (): LinkValidationFields => validationFields(
    "unknown",
    "",
    "Apply URL has not been validated yet."
);

const fetchWithTimeout = async (url: string, timeoutMs: number): Promise<Response> => {
    let nextUrl = url;

    for (let redirectCount = 0; redirectCount < 5; redirectCount += 1) {
        await assertSafeExternalUrl(nextUrl);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetch(nextUrl, {
                redirect: "manual",
                signal: controller.signal,
                headers: {
                    "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
                    "User-Agent": "CareerVividJobIngestion/1.0 (+https://careervivid.app)",
                },
            });

            if ([301, 302, 303, 307, 308].includes(response.status)) {
                const location = response.headers.get("location");
                if (!location) return response;
                nextUrl = new URL(location, nextUrl).toString();
                continue;
            }

            return response;
        } finally {
            clearTimeout(timeout);
        }
    }

    throw new Error("Too many redirects.");
};

const normalizedTextIncludes = (text: string, needle: string): boolean => {
    const normalizedText = text.toLowerCase();
    const normalizedNeedle = needle.toLowerCase().trim();
    return Boolean(normalizedNeedle) && normalizedText.includes(normalizedNeedle);
};

const significantTitleTokens = (title: string): string[] => {
    const stopWords = new Set(["and", "for", "the", "with", "from", "engineer", "software", "developer", "senior", "staff", "full", "stack"]);
    return title
        .toLowerCase()
        .split(/[^a-z0-9+#.]+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 3 && !stopWords.has(token))
        .slice(0, 8);
};

const pageLooksRelevantToJob = (job: JobLinkValidationTarget, pageText: string): boolean => {
    if (normalizedTextIncludes(pageText, job.company)) return true;
    if (job.sourceJobId && normalizedTextIncludes(pageText, job.sourceJobId)) return true;

    const tokens = significantTitleTokens(job.title);
    if (!tokens.length) return normalizedTextIncludes(pageText, job.title.slice(0, 24));

    const lowerText = pageText.toLowerCase();
    const matchedTokens = tokens.filter((token) => lowerText.includes(token)).length;
    return matchedTokens >= Math.min(2, tokens.length);
};

const finalUrlLooksGenericCareerHub = (finalUrl: string): boolean => {
    try {
        const parsed = new URL(finalUrl);
        const host = parsed.hostname.toLowerCase();
        const pathSegments = parsed.pathname.split("/").filter(Boolean);
        const query = parsed.search.toLowerCase();
        if (/(gh_jid|job_id|jobid|lever-source|posting|requisition|reqid|sourcejobid)=/.test(query)) return false;
        const hasJobIdHint = pathSegments.some((segment) => /\d{4,}|[a-f0-9-]{16,}/i.test(segment));
        const hasJobPath = pathSegments.some((segment) => /^(job|jobs|position|positions|posting|postings)$/i.test(segment));

        if (/(\.|^)greenhouse\.io$/.test(host)) {
            return !hasJobIdHint || !pathSegments.some((segment) => /^(job|jobs)$/i.test(segment));
        }

        if (host === "jobs.lever.co") {
            return pathSegments.length < 2 || (!hasJobIdHint && !hasJobPath && pathSegments.length <= 2);
        }

        if (host === "jobs.ashbyhq.com") {
            return !pathSegments.includes("application") && !hasJobIdHint && pathSegments.length <= 2;
        }

        if (pathSegments.length <= 1) {
            return /^(careers?|jobs?|employment|open-positions?|job-openings?|openings?|positions?|opportunities?|search|job-search|search-results?|results?|listings?)$/i.test(pathSegments[0] || "");
        }

        const lastSegment = pathSegments[pathSegments.length - 1] || "";
        if (/^(careers?|jobs?|employment|open-positions?|job-openings?|openings?|positions?|opportunities?|search|job-search|search-results?|results?|listings?|all-jobs?|available-jobs?)$/i.test(lastSegment) && !hasJobIdHint) {
            return true;
        }

        return pathSegments.some((segment) => /^(search|job-search|search-results?|results?|open-positions?|openings?|positions?|all-jobs?|available-jobs?)$/i.test(segment))
            && !hasJobIdHint;
    } catch {
        return true;
    }
};

export const __scrapedJobsTestInternals = {
    finalUrlLooksGenericCareerHub,
    detectJobFunction,
    selectDiverseJobs,
    normalizeProfileKeywordInput,
    scoreListingForProfileKeywords,
};

const pageLooksRelevantToExternalJob = (job: JobLinkValidationTarget, pageText: string, finalUrl: string): boolean => {
    const lowerText = pageText.toLowerCase();
    const titleTokens = significantTitleTokens(job.title);
    const matchedTitleTokens = titleTokens.filter((token) => lowerText.includes(token)).length;
    const titleMatches = normalizedTextIncludes(pageText, job.title)
        || (titleTokens.length > 0 && matchedTitleTokens >= Math.min(2, titleTokens.length));
    const companyMatches = !job.company || normalizedTextIncludes(pageText, job.company);

    if (job.sourceJobId && (normalizedTextIncludes(pageText, job.sourceJobId) || finalUrl.toLowerCase().includes(job.sourceJobId.toLowerCase()))) {
        return true;
    }

    if (!titleMatches) return false;
    if (companyMatches) return true;

    return matchedTitleTokens >= Math.min(3, titleTokens.length) && !finalUrlLooksGenericCareerHub(finalUrl);
};

const hasExpectedHost = (value: string, expectedHost: string): boolean => {
    try {
        const hostname = new URL(value).hostname.toLowerCase();
        return hostname === expectedHost || hostname.endsWith(`.${expectedHost}`);
    } catch {
        return false;
    }
};

const finalUrlLooksJobSpecific = (job: JobLinkValidationTarget, finalUrl: string): boolean => {
    const lowerUrl = finalUrl.toLowerCase();
    const sourceJobId = (job.sourceJobId || "").toLowerCase();

    if (sourceJobId && lowerUrl.includes(sourceJobId)) return true;

    if (job.provider === "greenhouse") {
        return lowerUrl.includes(`gh_jid=${sourceJobId}`)
            || lowerUrl.includes(`/jobs/${sourceJobId}`)
            || lowerUrl.includes(`/job/${sourceJobId}`);
    }

    if (job.provider === "lever") {
        return lowerUrl.includes(`/jobs/${sourceJobId}`)
            || lowerUrl.endsWith(`/${sourceJobId}`);
    }

    if (job.provider === "ashby") {
        return Boolean(sourceJobId)
            && lowerUrl.includes(sourceJobId)
            && (lowerUrl.includes("/application") || hasExpectedHost(finalUrl, "jobs.ashbyhq.com"));
    }

    return false;
};

const updateJobValidation = async (
    jobId: string,
    validation: LinkValidationFields,
    active?: boolean
) => {
    await db.collection("scrapedJobListings").doc(jobId).set({
        ...validation,
        ...(typeof active === "boolean" ? { active } : {}),
        updatedAt: admin.firestore.Timestamp.now(),
    }, { merge: true });
};

const validateApplyUrl = async (
    job: JobLinkValidationTarget,
    options: { requireAtsSpecificUrl?: boolean; requireApplyAction?: boolean } = {}
): Promise<LinkValidationFields> => {
    if (!isHttpUrl(job.applyUrl)) {
        return validationFields("unknown", "", "Missing or invalid apply URL.");
    }

    try {
        const response = await fetchWithTimeout(job.applyUrl, 12000);
        const finalUrl = response.url || job.applyUrl;

        if ([401, 403, 429].includes(response.status)) {
            return validationFields("blocked", finalUrl, `Apply page returned HTTP ${response.status}.`);
        }

        if ([404, 410].includes(response.status)) {
            return validationFields("expired", finalUrl, `Apply page returned HTTP ${response.status}.`);
        }

        if (response.status >= 500) {
            return validationFields("stale", finalUrl, `Apply page returned temporary HTTP ${response.status}.`);
        }

        if (!response.ok) {
            return validationFields("unknown", finalUrl, `Apply page returned HTTP ${response.status}.`);
        }

        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("text/html")) {
            return validationFields("unknown", finalUrl, `Apply page returned non-HTML content type: ${contentType || "unknown"}.`);
        }

        const pageText = await response.text();
        if (BLOCKED_PAGE_PATTERN.test(pageText)) {
            return validationFields("blocked", finalUrl, "Apply page appears to be blocking automated validation.");
        }

        if (CLOSED_JOB_PATTERN.test(pageText)) {
            return validationFields("expired", finalUrl, "Apply page says the job is closed or unavailable.");
        }

        const requireAtsSpecificUrl = options.requireAtsSpecificUrl ?? Boolean(job.provider);
        const requireApplyAction = options.requireApplyAction ?? requireAtsSpecificUrl;

        if (requireAtsSpecificUrl && !finalUrlLooksJobSpecific(job, finalUrl)) {
            return validationFields("unknown", finalUrl, "Final apply URL does not look job-specific.");
        }

        if (!requireAtsSpecificUrl && finalUrlLooksGenericCareerHub(finalUrl)) {
            return validationFields("unknown", finalUrl, "Apply link leads to a generic careers page, not a specific job.");
        }

        const looksRelevant = requireAtsSpecificUrl
            ? pageLooksRelevantToJob(job, pageText)
            : pageLooksRelevantToExternalJob(job, pageText, finalUrl);

        if (!looksRelevant) {
            return validationFields("unknown", finalUrl, "Apply page did not include enough matching job title or company text.");
        }

        if (requireApplyAction && !APPLY_PAGE_PATTERN.test(pageText)) {
            return validationFields("unknown", finalUrl, "Apply page did not expose an application action.");
        }

        return validationFields(
            "valid",
            finalUrl,
            requireApplyAction
                ? "Apply page is job-specific, relevant, and has an application action."
                : "Apply page is job-specific and relevant to the saved role."
        );
    } catch (error) {
        console.warn(`[validateApplyUrl] ${job.id} failed link validation: ${job.applyUrl}`, error);
        return validationFields("stale", job.applyUrl, "Apply page could not be reached during validation.");
    }
};

const validateApplyJobs = async (jobs: ScrapedJobListing[]): Promise<ScrapedJobListing[]> => {
    const validatedJobs: ScrapedJobListing[] = [];
    let nextIndex = 0;

    const worker = async () => {
        while (nextIndex < jobs.length) {
            const job = jobs[nextIndex];
            nextIndex += 1;
            const validation = await validateApplyUrl(job);
            validatedJobs.push({
                ...job,
                ...validation,
                active: validation.validationStatus === "valid",
                applyUrl: validation.validationStatus === "valid" && validation.finalUrl ? validation.finalUrl : job.applyUrl,
                updatedAt: admin.firestore.Timestamp.now(),
            });

            if (validation.validationStatus !== "valid") {
                console.warn(`[validateApplyJobs] ${job.id} excluded: ${validation.validationStatus} - ${validation.validationReason}`);
            }
        }
    };

    const workerCount = Math.min(LINK_VALIDATION_CONCURRENCY, Math.max(jobs.length, 1));
    await Promise.all(Array.from({ length: workerCount }, worker));
    return validatedJobs;
};

const isValidationStale = (job: ScrapedJobListing, staleMs: number): boolean => {
    const validatedAtMs = job.validatedAt?.toMillis?.() || 0;
    return job.validationStatus !== "valid" || !validatedAtMs || Date.now() - validatedAtMs > staleMs;
};

const serializeScrapedJob = (doc: admin.firestore.QueryDocumentSnapshot | admin.firestore.DocumentSnapshot) => {
    const data = doc.data() as Partial<ScrapedJobListing> | undefined;
    if (!data) return null;

    return serializeScrapedJobListing({ ...data, id: doc.id } as ScrapedJobListing);
};

const serializeScrapedJobListing = (job: ScrapedJobListing) => {
    return {
        ...job,
        fetchedAt: job.fetchedAt?.toMillis?.() || null,
        updatedAt: job.updatedAt?.toMillis?.() || null,
        validatedAt: job.validatedAt?.toMillis?.() || null,
    };
};

const listingFromDocument = (doc: admin.firestore.QueryDocumentSnapshot | admin.firestore.DocumentSnapshot): ScrapedJobListing | null => {
    const data = doc.data() as ScrapedJobListing | undefined;
    if (!data) return null;
    return { ...data, id: doc.id };
};

const revalidateListingIfNeeded = async (
    doc: admin.firestore.QueryDocumentSnapshot | admin.firestore.DocumentSnapshot,
    staleMs: number
): Promise<ScrapedJobListing | null> => {
    const job = listingFromDocument(doc);
    if (!job) return null;

    if (!isValidationStale(job, staleMs)) {
        return job;
    }

    try {
        const validation = await validateApplyUrl(job);
        const active = validation.validationStatus === "valid";
        const validatedJob: ScrapedJobListing = {
            ...job,
            ...validation,
            active,
            applyUrl: active && validation.finalUrl ? validation.finalUrl : job.applyUrl,
            updatedAt: admin.firestore.Timestamp.now(),
        };

        await updateJobValidation(job.id, {
            validationStatus: validatedJob.validationStatus,
            validatedAt: validatedJob.validatedAt,
            finalUrl: validatedJob.finalUrl,
            validationReason: validatedJob.validationReason,
        }, active);

        return validatedJob;
    } catch (error) {
        // If re-validation itself throws (network error, timeout, etc.),
        // keep the job with its previous validation status instead of
        // returning null — a transient ATS outage shouldn't nuke the feed.
        console.warn(`[revalidateListingIfNeeded] ${job.id} re-validation threw; keeping previous status:`, error);
        return job;
    }
};

const fetchJson = async <T>(url: string): Promise<T> => {
    const response = await fetch(url, {
        headers: {
            "Accept": "application/json",
            "User-Agent": "CareerVividJobIngestion/1.0 (+https://careervivid.app)",
        },
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status} for ${url}`);
    }

    return await response.json() as T;
};

const fetchLeverJobs = async (source: AtsSource): Promise<ScrapedJobListing[]> => {
    type LeverPosting = {
        id: string;
        text: string;
        hostedUrl?: string;
        applyUrl?: string;
        categories?: {
            location?: string;
            commitment?: string;
            team?: string;
        };
        descriptionPlain?: string;
        description?: string;
        additionalPlain?: string;
        createdAt?: number;
    };

    const postings = await fetchJson<LeverPosting[]>(
        `https://api.lever.co/v0/postings/${encodeURIComponent(source.boardToken)}?mode=json`
    );

    return selectDiverseJobs(
        postings.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
        (posting) => detectJobFunction(posting.text, posting.categories?.team || "")
    )
        .map((posting) => {
            const description = stripHtml(`${posting.descriptionPlain || posting.description || ""} ${posting.additionalPlain || ""}`);
            const location = posting.categories?.location || "Location not listed";
            const jobFunction = detectJobFunction(posting.text, `${posting.categories?.team || ""} ${description}`);
            const { matchedKeywords, missingKeywords } = keywordFit(posting.text, description);
            const createdAt = posting.createdAt ? new Date(posting.createdAt) : null;
            const sourceJobId = posting.id || stableId([source.provider, source.boardToken, posting.text, location]);

            return {
                id: stableId([source.provider, source.boardToken, sourceJobId]),
                title: posting.text,
                company: source.company,
                location,
                workModel: detectWorkModel(location, description),
                salary: normalizeSalary(description),
                jobType: posting.categories?.commitment || "Full-time",
                jobFunction,
                seniority: detectSeniority(posting.text, description),
                postedAt: createdAt ? createdAt.toISOString() : "Recently",
                source: "scraped" as const,
                sourceLabel: "Lever ATS",
                applyUrl: posting.hostedUrl || posting.applyUrl || "",
                description: description.slice(0, 1200),
                matchedKeywords,
                missingKeywords,
                signals: [jobFunction, posting.categories?.team, detectWorkModel(location, description), "ATS verified"].filter((signal): signal is string => Boolean(signal)),
                provider: source.provider,
                sourceKey: source.boardToken,
                sourceJobId,
                active: true,
                fetchedAt: admin.firestore.Timestamp.now(),
                updatedAt: admin.firestore.Timestamp.now(),
                ...initialValidationFields(),
            };
        });
};

const fetchGreenhouseJobs = async (source: AtsSource): Promise<ScrapedJobListing[]> => {
    type GreenhouseJob = {
        id: number;
        title: string;
        absolute_url?: string;
        location?: { name?: string };
        content?: string;
        updated_at?: string;
        departments?: Array<{ name?: string }>;
    };

    const data = await fetchJson<{ jobs?: GreenhouseJob[] }>(
        `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(source.boardToken)}/jobs?content=true`
    );

    const sortedJobs = (data.jobs || [])
        .sort((a, b) => {
            const bUpdated = b.updated_at ? Date.parse(b.updated_at) || 0 : 0;
            const aUpdated = a.updated_at ? Date.parse(a.updated_at) || 0 : 0;
            return bUpdated - aUpdated;
        });

    return selectDiverseJobs(
        sortedJobs,
        (job) => detectJobFunction(job.title, job.departments?.map((department) => department.name || "").join(" ") || "")
    )
        .map((job) => {
            const description = stripHtml(job.content || "");
            const location = job.location?.name || "Location not listed";
            const department = job.departments?.[0]?.name || "";
            const jobFunction = detectJobFunction(job.title, `${department} ${description}`);
            const { matchedKeywords, missingKeywords } = keywordFit(job.title, description);
            const sourceJobId = String(job.id);

            return {
                id: stableId([source.provider, source.boardToken, sourceJobId]),
                title: job.title,
                company: source.company,
                location,
                workModel: detectWorkModel(location, description),
                salary: normalizeSalary(description),
                jobType: "Full-time",
                jobFunction,
                seniority: detectSeniority(job.title, description),
                postedAt: job.updated_at || "Recently",
                source: "scraped" as const,
                sourceLabel: "Greenhouse ATS",
                applyUrl: job.absolute_url || "",
                description: description.slice(0, 1200),
                matchedKeywords,
                missingKeywords,
                signals: [jobFunction, department, detectWorkModel(location, description), "ATS verified"].filter((signal): signal is string => Boolean(signal)),
                provider: source.provider,
                sourceKey: source.boardToken,
                sourceJobId,
                active: true,
                fetchedAt: admin.firestore.Timestamp.now(),
                updatedAt: admin.firestore.Timestamp.now(),
                ...initialValidationFields(),
            };
        });
};

const fetchAshbyJobs = async (source: AtsSource): Promise<ScrapedJobListing[]> => {
    type AshbyLocation = string | {
        location?: string;
        name?: string;
    };
    type AshbyJob = {
        id: string;
        title: string;
        department?: string;
        team?: string;
        employmentType?: string;
        location?: string;
        secondaryLocations?: AshbyLocation[];
        publishedAt?: string;
        isListed?: boolean;
        isRemote?: boolean | null;
        workplaceType?: string | null;
        address?: {
            postalAddress?: {
                addressRegion?: string;
                addressCountry?: string;
                addressLocality?: string;
            };
        };
        jobUrl?: string;
        applyUrl?: string;
        descriptionHtml?: string;
    };

    const data = await fetchJson<{ jobs?: AshbyJob[] }>(
        `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(source.boardToken)}`
    );

    const formatAshbyLocation = (job: AshbyJob): string => {
        const secondaryLocations = (job.secondaryLocations || [])
            .map((location) => (typeof location === "string" ? location : location.location || location.name || ""))
            .filter(Boolean);
        const postalAddress = job.address?.postalAddress;
        const addressLocation = [
            postalAddress?.addressLocality,
            postalAddress?.addressRegion,
            postalAddress?.addressCountry,
        ].filter(Boolean).join(", ");

        return [job.location, ...secondaryLocations, addressLocation]
            .filter(Boolean)
            .join("; ") || "Location not listed";
    };

    const normalizeEmploymentType = (employmentType?: string): string => {
        const normalized = (employmentType || "FullTime")
            .replace(/([a-z])([A-Z])/g, "$1 $2")
            .replace(/\s+/g, " ")
            .trim();

        return normalized === "Full Time" ? "Full-time" : normalized || "Full-time";
    };

    const sortedJobs = (data.jobs || [])
        .filter((job) => job.isListed !== false)
        .sort((a, b) => {
            const bPublished = b.publishedAt ? Date.parse(b.publishedAt) || 0 : 0;
            const aPublished = a.publishedAt ? Date.parse(a.publishedAt) || 0 : 0;
            return bPublished - aPublished;
        });

    return selectDiverseJobs(
        sortedJobs,
        (job) => detectJobFunction(job.title, `${job.team || ""} ${job.department || ""}`)
    )
        .map((job) => {
            const description = stripHtml(job.descriptionHtml || "");
            const location = formatAshbyLocation(job);
            const workplaceText = `${job.workplaceType || ""} ${job.isRemote ? "remote" : ""}`;
            const workModel = job.isRemote || /remote/i.test(workplaceText)
                ? "Remote"
                : /hybrid/i.test(workplaceText)
                    ? "Hybrid"
                    : detectWorkModel(location, `${description} ${workplaceText}`);
            const jobFunction = detectJobFunction(job.title, `${job.team || ""} ${job.department || ""} ${description}`);
            const { matchedKeywords, missingKeywords } = keywordFit(job.title, description);
            const sourceJobId = job.id || stableId([source.provider, source.boardToken, job.title, location]);

            return {
                id: stableId([source.provider, source.boardToken, sourceJobId]),
                title: job.title,
                company: source.company,
                location,
                workModel,
                salary: normalizeSalary(description),
                jobType: normalizeEmploymentType(job.employmentType),
                jobFunction,
                seniority: detectSeniority(job.title, description),
                postedAt: job.publishedAt || "Recently",
                source: "scraped" as const,
                sourceLabel: "Ashby ATS",
                applyUrl: job.applyUrl || job.jobUrl || "",
                description: description.slice(0, 1200),
                matchedKeywords,
                missingKeywords,
                signals: [jobFunction, job.team || job.department, workModel, "ATS verified"].filter((signal): signal is string => Boolean(signal)),
                provider: source.provider,
                sourceKey: source.boardToken,
                sourceJobId,
                active: true,
                fetchedAt: admin.firestore.Timestamp.now(),
                updatedAt: admin.firestore.Timestamp.now(),
                ...initialValidationFields(),
            };
        });
};

const fetchSourceJobs = async (source: AtsSource): Promise<ScrapedJobListing[]> => {
    if (source.provider === "ashby") return fetchAshbyJobs(source);
    if (source.provider === "lever") return fetchLeverJobs(source);
    return fetchGreenhouseJobs(source);
};

export const scrapeRecommendedJobsNow = async (): Promise<{ fetched: number; activeIds: string[] }> => {
    const results = await Promise.allSettled(
        ATS_SOURCES.map(async (source): Promise<SourceFetchResult> => ({
            source,
            jobs: await fetchSourceJobs(source),
        }))
    );
    const activeIdsBySource = new Map<string, Set<string>>();
    const jobs: ScrapedJobListing[] = [];
    const fetchedJobs: ScrapedJobListing[] = [];
    let rawFetchedCount = 0;
    let removedCount = 0;
    const validationCounts: Record<LinkValidationStatus, number> = {
        valid: 0,
        stale: 0,
        expired: 0,
        blocked: 0,
        unknown: 0,
    };

    for (const [index, result] of results.entries()) {
        if (result.status === "fulfilled") {
            const sourceKey = `${result.value.source.provider}:${result.value.source.boardToken}`;
            rawFetchedCount += result.value.jobs.length;
            activeIdsBySource.set(sourceKey, new Set<string>());
            fetchedJobs.push(...result.value.jobs);
            continue;
        }

        console.warn(`[scrapeRecommendedJobsNow] Source failed: ${ATS_SOURCES[index].provider}/${ATS_SOURCES[index].boardToken}`, result.reason);
    }

    const validatedJobs = await validateApplyJobs(fetchedJobs);
    validatedJobs.forEach((job) => {
        validationCounts[job.validationStatus] += 1;
        if (job.validationStatus === "valid") {
            const sourceKey = `${job.provider}:${job.sourceKey}`;
            activeIdsBySource.get(sourceKey)?.add(job.id);
        }
    });
    removedCount = validatedJobs.filter((job) => job.validationStatus !== "valid").length;
    jobs.push(...validatedJobs);

    const uniqueJobs = new Map<string, ScrapedJobListing>();
    jobs.forEach((job) => {
        if (job.applyUrl) uniqueJobs.set(job.id, job);
    });

    let batch = db.batch();
    let pendingWrites = 0;
    const queueWrite = async (write: (writeBatch: admin.firestore.WriteBatch) => void) => {
        write(batch);
        pendingWrites += 1;
        if (pendingWrites >= 450) {
            await batch.commit();
            batch = db.batch();
            pendingWrites = 0;
        }
    };

    const activeIds = Array.from(uniqueJobs.values())
        .filter((job) => job.validationStatus === "valid")
        .map((job) => job.id);
    for (const job of Array.from(uniqueJobs.values())) {
        await queueWrite((writeBatch) => {
            writeBatch.set(db.collection("scrapedJobListings").doc(job.id), job, { merge: true });
        });
    }

    for (const source of ATS_SOURCES) {
        const sourceKey = `${source.provider}:${source.boardToken}`;
        const sourceActiveIds = activeIdsBySource.get(sourceKey);
        if (!sourceActiveIds) continue;

        const existingSnapshot = await db.collection("scrapedJobListings")
            .where("provider", "==", source.provider)
            .where("sourceKey", "==", source.boardToken)
            .get();

        for (const doc of existingSnapshot.docs) {
            if (sourceActiveIds.has(doc.id)) continue;
            await queueWrite((writeBatch) => {
                writeBatch.set(doc.ref, {
                    active: false,
                    validationStatus: "expired",
                    validatedAt: admin.firestore.Timestamp.now(),
                    validationReason: "Job disappeared from the source board during the latest ingestion.",
                    updatedAt: admin.firestore.Timestamp.now(),
                }, { merge: true });
            });
        }
    }

    if (pendingWrites > 0) {
        await batch.commit();
    }
    await db.collection("jobIngestionRuns").add({
        source: "public_ats",
        sourceCount: ATS_SOURCES.length,
        rawFetchedCount,
        fetchedCount: activeIds.length,
        removedCount,
        validationCounts,
        activeIds,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { fetched: activeIds.length, activeIds };
};

export const findValidatedScrapedJobMatches = async (
    input: ValidatedScrapedJobSearchInput
): Promise<ValidatedScrapedJobMatch[]> => {
    const count = Math.min(Math.max(Number(input.count || 10), 1), 25);
    const minScore = Math.min(Math.max(Number(input.minScore || 0), 0), 100);
    const readLimit = Math.min(Math.max(count * 8, 80), 200);

    const snapshot = await db.collection("scrapedJobListings")
        .where("active", "==", true)
        .orderBy("fetchedAt", "desc")
        .limit(readLimit)
        .get();

    const revalidatedJobs = await Promise.all(
        snapshot.docs.map((doc) => revalidateListingIfNeeded(doc, CLI_JOB_VALIDATION_STALE_MS))
    );

    return revalidatedJobs
        .filter((job): job is ScrapedJobListing => Boolean(job && job.active && job.validationStatus === "valid" && (job.finalUrl || job.applyUrl)))
        .map((job) => toValidatedJobMatch(job, input))
        .filter((job) => job.score >= minScore)
        .sort((a, b) => b.score - a.score)
        .slice(0, count);
};

export const getRecommendedScrapedJobs = functions.region("us-west1").runWith({
    timeoutSeconds: 30,
    memory: "512MB",
}).https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
    }

    const limit = Math.min(Math.max(Number(data?.limit || 40), 1), 120);
    const profileKeywords = normalizeProfileKeywordInput(data?.profileKeywords);
    const locationPreferences = normalizeLocationPreferences(data?.locationPreferences);
    // Read a broader validated pool before ranking so country and city
    // preferences can surface matching roles across more than the newest ATS boards.
    const readLimit = Math.min(Math.max(limit * 5, 300), 600);

    // Read path: trust the cron-validated status. Do NOT re-validate every
    // listing on every user request — that causes mass failures when ATS
    // sites rate-limit, timeout, or return Cloudflare challenges, which
    // was the root cause of the intermittent empty feed.
    const snapshot = await db.collection("scrapedJobListings")
        .where("active", "==", true)
        .where("validationStatus", "==", "valid")
        .orderBy("fetchedAt", "desc")
        .limit(readLimit)
        .get();

    const jobs = snapshot.docs
        .map((doc) => {
            const listing = listingFromDocument(doc);
            return listing ? serializeScrapedJobListing(listing) : null;
        })
        .filter((job): job is NonNullable<typeof job> => Boolean(job && job.applyUrl))
        .sort((a, b) => {
            const aScore = scoreListingForRecommendation(a, profileKeywords, locationPreferences);
            const bScore = scoreListingForRecommendation(b, profileKeywords, locationPreferences);
            if (aScore !== bScore) return bScore - aScore;
            return (b.fetchedAt || 0) - (a.fetchedAt || 0);
        })
        .slice(0, limit);

    return {
        jobs,
    };
});

export const validateRecommendedJobOpen = functions.region("us-west1").runWith({
    timeoutSeconds: 30,
    memory: "512MB",
}).https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
    }

    const jobId = String(data?.jobId || "").replace(/^scraped-/, "").trim();
    if (!jobId) {
        throw new functions.https.HttpsError("invalid-argument", "jobId is required");
    }

    const docRef = db.collection("scrapedJobListings").doc(jobId);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Recommended job was not found.");
    }

    const job = await revalidateListingIfNeeded(docSnap, OPEN_VALIDATION_STALE_MS);
    if (!job || job.validationStatus !== "valid" || !job.finalUrl) {
        if (job?.validationStatus === "expired") {
            await docRef.set({ active: false, updatedAt: admin.firestore.Timestamp.now() }, { merge: true });
        }

        throw new functions.https.HttpsError(
            "failed-precondition",
            job?.validationReason || "This job link could not be validated.",
            {
                validationStatus: job?.validationStatus || "unknown",
                validationReason: job?.validationReason || "This job link could not be validated.",
            }
        );
    }

    return {
        jobId,
        finalUrl: job.finalUrl,
        validationStatus: job.validationStatus,
        validationReason: job.validationReason,
        validatedAt: job.validatedAt.toMillis(),
    };
});

export const validateExternalJobLink = functions.region("us-west1").runWith({
    timeoutSeconds: 30,
    memory: "512MB",
}).https.onCall(async (data: ExternalJobLinkValidationInput, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
    }

    const applyUrl = String(data?.url || "").trim();
    const title = String(data?.title || "").trim();
    const company = String(data?.company || "").trim();

    if (!isHttpUrl(applyUrl)) {
        throw new functions.https.HttpsError("invalid-argument", "A valid http or https job URL is required.");
    }

    if (!title || title.length < 3) {
        throw new functions.https.HttpsError("invalid-argument", "A job title is required to verify this link.");
    }

    const validation = await validateApplyUrl({
        id: stableId(["external", company, title, applyUrl]),
        title,
        company,
        applyUrl,
    }, {
        requireAtsSpecificUrl: false,
        requireApplyAction: true,
    });

    if (validation.validationStatus !== "valid" || !validation.finalUrl) {
        throw new functions.https.HttpsError(
            "failed-precondition",
            validation.validationReason || "This job link could not be validated.",
            {
                validationStatus: validation.validationStatus,
                validationReason: validation.validationReason,
                finalUrl: validation.finalUrl || applyUrl,
            }
        );
    }

    return {
        finalUrl: validation.finalUrl,
        validationStatus: validation.validationStatus,
        validationReason: validation.validationReason,
        validatedAt: validation.validatedAt.toMillis(),
    };
});

export const openRecommendedJob = functions.region("us-west1").runWith({
    timeoutSeconds: 30,
    memory: "512MB",
}).https.onRequest(async (req, res) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
        res.status(405).send("Method not allowed");
        return;
    }

    const pathJobId = decodeURIComponent((req.path || "").split("/").filter(Boolean).pop() || "");
    const queryJobId = typeof req.query.jobId === "string" ? req.query.jobId : "";
    const jobId = (queryJobId || pathJobId).replace(/^scraped-/, "").trim();

    if (!jobId) {
        res.status(400).send("Missing job id.");
        return;
    }

    const docRef = db.collection("scrapedJobListings").doc(jobId);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
        res.status(404).send("Recommended job was not found.");
        return;
    }

    const job = await revalidateListingIfNeeded(docSnap, OPEN_VALIDATION_STALE_MS);
    if (!job || job.validationStatus !== "valid" || !job.finalUrl) {
        if (job?.validationStatus === "expired") {
            await docRef.set({ active: false, updatedAt: admin.firestore.Timestamp.now() }, { merge: true });
        }

        res
            .status(job?.validationStatus === "expired" ? 410 : 409)
            .set("Cache-Control", "no-store")
            .send(`This job link is not currently verified. ${job?.validationReason || "Please return to CareerVivid for updated recommendations."}`);
        return;
    }

    res
        .status(302)
        .set("Cache-Control", "no-store")
        .set("Location", job.finalUrl)
        .send(`Redirecting to ${job.finalUrl}`);
});

export const scrapeRecommendedJobs = functions.region("us-west1").runWith({
    timeoutSeconds: 180,
    memory: "512MB",
}).https.onCall(async (_data, context) => {
    if (!context.auth?.token?.admin) {
        throw new functions.https.HttpsError("permission-denied", "Admin access required");
    }

    return await scrapeRecommendedJobsNow();
});

export const scrapeRecommendedJobsCron = onSchedule({
    schedule: "every 6 hours",
    timeZone: "America/Los_Angeles",
    timeoutSeconds: 300,
    memory: "512MiB",
    region: "us-west1",
}, async () => {
    console.log("[scrapeRecommendedJobsCron] Starting public ATS scrape...");
    const result = await scrapeRecommendedJobsNow();
    console.log(`[scrapeRecommendedJobsCron] Stored ${result.fetched} active job listings.`);
});
