/**
 * API client — thin fetch wrapper around the CareerVivid API.
 *
 * All functions throw on network errors; on HTTP errors they return
 * a structured ApiError for clean CLI error messages.
 */

import { getApiKey, getApiUrl, DEFAULT_API_URL } from "./config.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export type PostType = "article" | "whiteboard";
export type DataFormat = "markdown" | "mermaid";

export interface PublishPayload {
    type: PostType;
    dataFormat: DataFormat;
    title: string;
    content: string;
    tags?: string[];
    coverImage?: string;
    isOfficialPost?: boolean;
    isPublic?: boolean;
}

export interface PublishResult {
    success: boolean;
    postId: string;
    url: string;
    message: string;
    title?: string;
}

export interface VerifyResult {
    userId: string;
    name: string;
    email: string | null;
    avatar: string;
    role: string;
    isAdmin: boolean;
}

export interface ApiError {
    isError: true;
    statusCode: number;
    message: string;
    fields?: { field: string; message: string }[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const CLI_VERSION = "1.10.0";

function requireApiKey(): string {
    const key = getApiKey();
    if (!key) {
        throw new Error(
            "No API key configured.\n\n" +
            "  Human users:  cv login\n" +
            "  AI agents:    cv auth set-key <key>\n" +
            "  Environment:  export CV_API_KEY=cv_live_...\n\n" +
            "  Get your key at: https://careervivid.app/#/developer"
        );
    }
    return key;
}

function getVerifyUrl(): string {
    // The verify endpoint lives at a fixed Cloud Function URL, separate from the publish endpoint.
    // Use env override if set.
    return (
        process.env.CV_VERIFY_URL ||
        "https://us-west1-jastalk-firebase.cloudfunctions.net/verifyAuth"
    );
}

async function apiRequest<T>(
    method: "GET" | "POST" | "PATCH",
    path: string,
    body?: unknown,
    key?: string
): Promise<T | ApiError> {
    const apiKey = key ?? requireApiKey();
    const baseUrl = getApiUrl().replace(/\/+$/, "");
    const url = `${baseUrl}${path === "" ? "" : "/" + path}`;

    const response = await fetch(url, {
        method,
        headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "User-Agent": `careervivid-cli/${CLI_VERSION}`,
        },
        body: body ? JSON.stringify(body) : undefined,
    });

    const text = await response.text();
    let parsed: any = {};
    try { parsed = JSON.parse(text); } catch { parsed = { message: text }; }

    if (!response.ok) {
        return {
            isError: true,
            statusCode: response.status,
            message: parsed.error || parsed.message || `HTTP ${response.status}`,
            fields: parsed.fields,
        } as ApiError;
    }

    return parsed as T;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function publishPost(
    payload: PublishPayload,
    dryRun = false
): Promise<PublishResult | ApiError> {
    if (dryRun) {
        if (!payload.title || payload.title.trim() === "") {
            return { isError: true, statusCode: 0, message: "Title is required." };
        }
        if (!payload.content || payload.content.trim() === "") {
            return { isError: true, statusCode: 0, message: "Content is required." };
        }
        return {
            success: true,
            postId: "dry-run-no-id",
            url: "https://careervivid.app/community (dry-run — not published)",
            message: "Dry run passed. No post was created.",
        };
    }
    return apiRequest<PublishResult>("POST", "publish", payload);
}

export async function getPost(
    postId: string
): Promise<PublishResult | ApiError> {
    return apiRequest<PublishResult>("GET", `publish/${postId}`);
}

export async function updatePost(
    postId: string,
    payload: Partial<PublishPayload>
): Promise<PublishResult | ApiError> {
    return apiRequest<PublishResult>("PATCH", "publish", { ...payload, postId });
}

/**
 * Verify an API key against the /verifyAuth endpoint.
 * Optionally accepts a specific key (for set-key validation).
 */
export async function verifyKey(key?: string): Promise<VerifyResult | ApiError> {
    const apiKey = key ?? getApiKey();
    if (!apiKey) {
        return {
            isError: true,
            statusCode: 0,
            message: "No API key provided.",
        };
    }

    const verifyUrl = getVerifyUrl();
    try {
        const response = await fetch(verifyUrl, {
            method: "GET",
            headers: {
                "x-api-key": apiKey,
                "User-Agent": `careervivid-cli/${CLI_VERSION}`,
            },
        });

        const text = await response.text();
        let parsed: any = {};
        try { parsed = JSON.parse(text); } catch { parsed = { message: text }; }

        if (!response.ok) {
            return {
                isError: true,
                statusCode: response.status,
                message: parsed.error || parsed.message || `HTTP ${response.status}`,
            };
        }

        return parsed as VerifyResult;
    } catch (err: any) {
        return {
            isError: true,
            statusCode: 0,
            message: `Network error: ${err.message}`,
        };
    }
}

/**
 * @deprecated Use verifyKey() instead for richer identity information.
 */
export async function pingAuth(): Promise<{ ok: boolean; error?: string }> {
    const result = await verifyKey();
    if (isApiError(result)) {
        return { ok: false, error: result.message };
    }
    return { ok: true };
}

export async function initPortfolio(title?: string, templateId?: string): Promise<{ success: boolean; portfolioId: string; url: string } | ApiError> {
    return apiRequest<{ success: boolean; portfolioId: string; url: string }>("POST", "portfolio/init", { title, templateId });
}

export async function portfolioList(): Promise<{ portfolios: { id: string; title: string; url: string; updatedAt: string | null }[] } | ApiError> {
    return apiRequest<{ portfolios: { id: string; title: string; url: string; updatedAt: string | null }[] }>("GET", "portfolio/list");
}

export async function updatePortfolioProjects(portfolioId: string, projects: any[], techStack?: string[]): Promise<{ success: boolean; message: string } | ApiError> {
    return apiRequest<{ success: boolean; message: string }>("PATCH", "portfolio/projects", { portfolioId, projects, techStack });
}

export async function updatePortfolioHero(portfolioId: string, hero?: any, theme?: any, seoMetadata?: any): Promise<{ success: boolean; message: string } | ApiError> {
    return apiRequest<{ success: boolean; message: string }>("PATCH", "portfolio/hero", { portfolioId, hero, theme, seoMetadata });
}

export async function uploadPortfolioAsset(image: string, path: string, mimeType: string): Promise<{ success: boolean; downloadUrl: string } | ApiError> {
    return apiRequest<{ success: boolean; downloadUrl: string }>("POST", "portfolio/assets", { image, path, mimeType });
}

export function isApiError(v: unknown): v is ApiError {
    return typeof v === "object" && v !== null && (v as any).isError === true;
}

// ── Cloud Function base URL ───────────────────────────────────────────────────
// The CLI job-hunt endpoints are deployed as standalone Cloud Functions,
// not via the /api proxy used by publishPost. This mirrors the verifyAuth pattern.

const CLI_FUNCTIONS_BASE =
    process.env.CV_FUNCTIONS_URL ||
    "https://us-west1-jastalk-firebase.cloudfunctions.net";

async function cfRequest<T>(
    method: "GET" | "POST" | "PATCH",
    functionName: string,
    body?: unknown,
    queryParams?: Record<string, string>
): Promise<T | ApiError> {
    const apiKey = requireApiKey();
    let url = `${CLI_FUNCTIONS_BASE}/${functionName}`;
    if (queryParams) {
        const qs = new URLSearchParams(queryParams).toString();
        if (qs) url += `?${qs}`;
    }

    const response = await fetch(url, {
        method,
        headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "User-Agent": `careervivid-cli/${CLI_VERSION}`,
        },
        body: body ? JSON.stringify(body) : undefined,
    });

    const text = await response.text();
    let parsed: any = {};
    try { parsed = JSON.parse(text); } catch { parsed = { message: text }; }

    if (!response.ok) {
        return {
            isError: true,
            statusCode: response.status,
            message: parsed.error || parsed.message || `HTTP ${response.status}`,
        } as ApiError;
    }
    return parsed as T;
}

// ── Job Hunt Types ────────────────────────────────────────────────────────────

export type ApplicationStatus = "To Apply" | "Applied" | "Interviewing" | "Offered" | "Rejected";

export interface ScoredJob {
    id: string;
    title: string;
    company: string;
    location: string;
    description: string;
    url: string;
    salary?: string;
    score: number;
    scoreLabel: "Excellent" | "Good" | "Fair" | "Low";
    aiSummary: string;
    missingSkills: string[];
}

export interface JobTrackerItem {
    id: string;
    jobTitle: string;
    companyName: string;
    location: string;
    applicationStatus: ApplicationStatus;
    aiScore: number | null;
    jobPostURL: string;
    updatedAt: string | null;
    notes: string;
}

export interface ResumeResult {
    resumeId: string;
    title: string;
    cvMarkdown: string;
    updatedAt: string | null;
}

export interface ResumesListResult {
    resumes: {
        id: string;
        title: string;
        updatedAt: string | null;
    }[];
    total: number;
}

// ── Job Hunt API Methods ──────────────────────────────────────────────────────

/** Fetch the user's latest resume from CareerVivid via API key */
export async function resumeGet(resumeId?: string): Promise<ResumeResult | ApiError> {
    const params: Record<string, string> = {};
    if (resumeId) params.resumeId = resumeId;
    return cfRequest<ResumeResult>("GET", "cliResumeGet", undefined, Object.keys(params).length ? params : undefined);
}

/** Fetch a lightweight list of the user's resumes */
export async function resumesList(): Promise<ResumesListResult | ApiError> {
    return cfRequest<ResumesListResult>("GET", "cliResumesList");
}

export async function resumeUpdate(payload: {
    resumeId: string;
    action: "refine" | "tailor";
    jobDescription?: string;
    instruction?: string;
    newTitle?: string;
    copy?: boolean;
}): Promise<{ success: boolean; resumeId: string; message: string } | ApiError> {
    return cfRequest<{ success: boolean; resumeId: string; message: string }>("POST", "cliResumeUpdate", payload);
}

/** Parse raw text into a structured Resume and save it */
export async function resumeCreate(payload: {
    title?: string;
    baseContent: string;
}): Promise<{ success: boolean; title: string; resumeId: string } | ApiError> {
    return cfRequest<{ success: boolean; title: string; resumeId: string }>("POST", "cliResumeCreate", payload);
}

export async function resumeDelete(payload: {
    resumeId: string;
}): Promise<{ success: boolean; message: string } | ApiError> {
    return cfRequest<{ success: boolean; message: string }>("POST", "cliResumeDelete", payload);
}

/** Run an agentic job search scored against the resume */
export async function jobsHunt(payload: {
    resumeContent?: string;
    role: string;
    location?: string;
    count?: number;
    minScore?: number;
    targetOrgs?: string[];
}): Promise<{ jobs: ScoredJob[]; total: number } | ApiError> {
    return cfRequest<{ jobs: ScoredJob[]; total: number }>("POST", "cliJobsHunt", payload);
}

/** Add a job to the user's Kanban tracker */
export async function jobsCreate(payload: {
    jobTitle: string;
    companyName: string;
    location?: string;
    jobPostURL?: string;
    jobDescription?: string;
    aiScore?: number;
    aiSummary?: string;
    notes?: string;
}): Promise<{ success: boolean; id: string; message: string } | ApiError> {
    return cfRequest<{ success: boolean; id: string; message: string }>("POST", "cliJobsCreate", payload);
}

/** Move a job to a new status on the Kanban board */
export async function jobsUpdate(payload: {
    jobId: string;
    status: ApplicationStatus;
    notes?: string;
}): Promise<{ success: boolean; jobId: string; newStatus: string; message: string } | ApiError> {
    return cfRequest<{ success: boolean; jobId: string; newStatus: string; message: string }>("POST", "cliJobsUpdate", payload);
}

/** List jobs currently in the user's tracker */
export async function jobsList(status?: ApplicationStatus): Promise<{ jobs: JobTrackerItem[]; total: number } | ApiError> {
    const params: Record<string, string> = {};
    if (status) params.status = status;
    return cfRequest<{ jobs: JobTrackerItem[]; total: number }>("GET", "cliJobsList", undefined, Object.keys(params).length ? params : undefined);
}

/** Delete a job entry from the user's tracker */
export async function jobsDelete(payload: {
    jobId: string;
}): Promise<{ success: boolean; message: string } | ApiError> {
    return cfRequest<{ success: boolean; message: string }>("POST", "cliJobsDelete", payload);
}

// ── Apply Answers Types ───────────────────────────────────────────────────────

export interface ApplyFormField {
    label: string;
    type: string;
    required: boolean;
    options?: string[];
    placeholder?: string;
}

export interface ApplyAnswerResult {
    answers: Record<string, string>; // field label → answer text
    coverLetter?: string;
    meta: {
        resumeId: string;
        jobUrl: string;
        platform: string;
    };
}

/**
 * Call the generateApplyAnswers Cloud Function to get AI-tailored answers
 * for all form fields in a job application.
 */
export async function getApplyAnswers(payload: {
    jobUrl: string;
    jobTitle: string;
    companyName: string;
    jobDescription?: string;
    resumeId?: string;
    platform: string;
    fields: ApplyFormField[];
    generateCoverLetter?: boolean;
}): Promise<ApplyAnswerResult | ApiError> {
    return cfRequest<ApplyAnswerResult>("POST", "generateApplyAnswers", payload);
}

// ── Cover Letters ─────────────────────────────────────────────────────────────

export interface CoverLetter {
    id: string;
    jobTitle: string;
    companyName: string;
    createdAt?: string;
    content?: string;
}

/** Generate and save a new cover letter natively */
export async function generateCoverLetter(payload: {
    resumeId: string;
    jobTitle: string;
    companyName: string;
    jobDescription: string;
}): Promise<{ success: boolean; coverLetter: CoverLetter } | ApiError> {
    return cfRequest<{ success: boolean; coverLetter: CoverLetter }>("POST", "cliCoverLetterCreate", payload);
}

/** List previously generated cover letters */
export async function listCoverLetters(jobId?: string): Promise<{ coverLetters: CoverLetter[]; total: number } | ApiError> {
    const params: Record<string, string> = {};
    if (jobId) params.jobId = jobId;
    return cfRequest<{ coverLetters: CoverLetter[]; total: number }>("GET", "cliCoverLettersList", undefined, Object.keys(params).length ? params : undefined);
}

// ── Referrals ─────────────────────────────────────────────────────────────────

export interface ReferredUser {
    uid: string;
    email: string;
    signupDate: string | null;
}

export interface ReferralStatsResult {
    code: string;
    totalReferred: number;
    maxReferrals: number;
    referredUsers: ReferredUser[];
}

/** Fetch user's referral code and stats */
export async function getReferralStats(): Promise<ReferralStatsResult | ApiError> {
    return cfRequest<ReferralStatsResult>("GET", "cliReferralStats");
}
