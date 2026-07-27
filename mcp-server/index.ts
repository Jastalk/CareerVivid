#!/usr/bin/env node
/**
 * CareerVivid MCP Server — Full Platform
 *
 * Exposes MCP tools that mirror the full `cv` CLI surface:
 *   • Publishing (articles, whiteboards)
 *   • Portfolio management
 *   • Job hunting & tracking
 *   • Resume management + AI tailoring
 *   • Cover letter generation
 *   • Referral stats
 *
 * Environment variables:
 *   CV_API_KEY        — CareerVivid API key (cv_live_...)
 *   CV_API_URL        — Publish proxy (default: https://careervivid.app/api)
 *   CV_FUNCTIONS_URL  — Cloud Functions base (default: https://us-west1-jastalk-firebase.cloudfunctions.net)
 *
 * Cursor / Claude Desktop setup (mcp_settings.json):
 * {
 *   "mcpServers": {
 *     "careervivid": {
 *       "command": "node",
 *       "args": ["/absolute/path/to/mcp-server/dist/index.js"],
 *       "env": { "CV_API_KEY": "cv_live_..." }
 *     }
 *   }
 * }
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// ── Configuration ─────────────────────────────────────────────────────────────

// Single source of truth for the version — it used to be hardcoded in the
// User-Agent, the server descriptor and the startup banner, which drifted.
const VERSION: string = JSON.parse(
    readFileSync(join(__dirname, "..", "package.json"), "utf8")
).version;

const CV_API_KEY = process.env.CV_API_KEY || "";
const CV_API_URL = process.env.CV_API_URL || "https://careervivid.app/api";
const CV_FUNCTIONS_URL =
    process.env.CV_FUNCTIONS_URL ||
    "https://us-west1-jastalk-firebase.cloudfunctions.net";

// A hung request would otherwise block the MCP client forever — there is no
// user-visible cancel for a stdio tool call.
const REQUEST_TIMEOUT_MS = Number(process.env.CV_TIMEOUT_MS || 60_000);

if (!CV_API_KEY) {
    process.stderr.write(
        "[CareerVivid MCP] ERROR: CV_API_KEY is not set.\n" +
        "  Get your key at: https://careervivid.app/developer\n"
    );
    process.exit(1);
}

// ── Shared helpers ────────────────────────────────────────────────────────────

const HEADERS = {
    "Content-Type": "application/json",
    "x-api-key": CV_API_KEY,
    "User-Agent": `careervivid-mcp/${VERSION}`,
};

async function cfFetch(url: string, init: RequestInit) {
    try {
        return await fetch(url, {
            ...init,
            headers: HEADERS,
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
    } catch (e: any) {
        // AbortSignal.timeout rejects with a TimeoutError; surface it as
        // something the caller can show rather than a bare "fetch failed".
        if (e?.name === "TimeoutError") {
            throw new Error(`Request timed out after ${REQUEST_TIMEOUT_MS}ms`);
        }
        throw e;
    }
}

async function cfGet(fn: string, params?: Record<string, string>) {
    let url = `${CV_FUNCTIONS_URL}/${fn}`;
    if (params && Object.keys(params).length > 0) {
        url += "?" + new URLSearchParams(params).toString();
    }
    return cfFetch(url, { method: "GET" });
}

async function cfPost(fn: string, body: unknown) {
    return cfFetch(`${CV_FUNCTIONS_URL}/${fn}`, {
        method: "POST",
        body: JSON.stringify(body),
    });
}

function ok(text: string) {
    return { content: [{ type: "text" as const, text }] };
}

function err(text: string) {
    return { content: [{ type: "text" as const, text }], isError: true };
}

async function jsonOrErr(res: Response): Promise<any> {
    const text = await res.text();
    try { return JSON.parse(text); } catch { return { error: text }; }
}

// ── Create MCP Server ─────────────────────────────────────────────────────────

const server = new McpServer({
    name: "careervivid",
    version: VERSION,
});

// ════════════════════════════════════════════════════════════════════════════
// PUBLISHING  (cv publish / cv update / cv whiteboard)
// ════════════════════════════════════════════════════════════════════════════

server.tool(
    "cv_publish",
    [
        "Publish a piece of content to the user's CareerVivid profile.",
        "Use for: tech articles (markdown), architecture diagrams (mermaid), portfolio announcements.",
        "The post appears immediately at https://careervivid.app/community and on the user's public profile.",
    ].join("\n"),
    {
        type: z.enum(["article", "whiteboard"])
            .describe("'article' for written posts, 'whiteboard' for Mermaid diagrams."),

        dataFormat: z.enum(["markdown", "mermaid"])
            .describe("'markdown' for articles, 'mermaid' for diagram source."),

        title: z.string().min(1).max(200)
            .describe("Clear headline. E.g. 'How I Built a Multi-Tenant SaaS on Firebase'."),

        content: z.string().min(1)
            .describe(
                "Full body. For markdown: complete article with code blocks. " +
                "For mermaid: raw diagram source only (no triple-backtick fence). " +
                "Aim for 600-2000 words for articles."
            ),

        tags: z.array(z.string()).max(5).optional()
            .describe("Up to 5 topic tags. E.g. ['typescript','firebase','system-design']."),

        coverImage: z.string().url().optional()
            .describe("Optional URL to a cover image."),

        isPublic: z.boolean().optional()
            .describe("Whether the post is publicly visible. Defaults to true."),
    },
    async ({ type, dataFormat, title, content, tags, coverImage, isPublic }) => {
        try {
            const response = await cfFetch(`${CV_API_URL}/publish`, {
                method: "POST",
                body: JSON.stringify({ type, dataFormat, title, content, tags: tags || [], coverImage, isPublic }),
            });
            const data = await jsonOrErr(response);
            if (!response.ok) {
                let detail = data.error || JSON.stringify(data);
                if (data.fields) {
                    detail += "\n\nField errors:\n" + data.fields.map((f: any) => `  • ${f.field}: ${f.message}`).join("\n");
                }
                return err(`❌ Publish failed (HTTP ${response.status}):\n\n${detail}\n\nPlease fix and retry.`);
            }
            return ok([
                `✅ Published successfully!`,
                ``,
                `📝 Title: ${title}`,
                `🔗 URL: ${data.url || "https://careervivid.app/community"}`,
                `🆔 Post ID: ${data.postId || "N/A"}`,
                ``,
                `The post is now live on CareerVivid.`,
            ].join("\n"));
        } catch (e: any) {
            return err(`❌ Network error: ${e.message}`);
        }
    }
);

// ════════════════════════════════════════════════════════════════════════════
// PORTFOLIO  (cv portfolio)
// ════════════════════════════════════════════════════════════════════════════

server.tool(
    "cv_portfolio_init",
    "Create a new CareerVivid developer portfolio site.",
    {
        title: z.string().describe("Brand title for the portfolio."),
        templateId: z.string().optional().describe("Template ID e.g. 'minimalist' or 'developer'."),
    },
    async ({ title, templateId }) => {
        try {
            const res = await cfFetch(`${CV_API_URL}/portfolio/init`, {
                method: "POST",
                body: JSON.stringify({ title, templateId }),
            });
            const data = await jsonOrErr(res);
            if (!res.ok) return err(`❌ Init failed: ${data.error}`);
            return ok(`✅ Portfolio created!\nID: ${data.portfolioId}\nURL: ${data.url}`);
        } catch (e: any) { return err(`❌ Error: ${e.message}`); }
    }
);

server.tool(
    "cv_portfolio_add_projects",
    "Add or update projects/case studies on an existing portfolio. Use after reading a codebase.",
    {
        portfolioId: z.string().describe("Portfolio ID to update."),
        projects: z.array(z.record(z.string(), z.any()))
            .describe("Array of project objects: title, description, link, imageUrl, etc."),
        techStack: z.array(z.string()).optional()
            .describe("Technologies to append to the portfolio's overall tech stack."),
    },
    async ({ portfolioId, projects, techStack }) => {
        try {
            const res = await cfFetch(`${CV_API_URL}/portfolio/projects`, {
                method: "PATCH",
                body: JSON.stringify({ portfolioId, projects, techStack }),
            });
            const data = await jsonOrErr(res);
            if (!res.ok) return err(`❌ Sync failed: ${data.error}`);
            return ok(`✅ Projects synced to portfolio ${portfolioId}!`);
        } catch (e: any) { return err(`❌ Error: ${e.message}`); }
    }
);

server.tool(
    "cv_portfolio_upload_image",
    "Upload a base64-encoded image (e.g. UI screenshot) to the user's portfolio storage.",
    {
        image: z.string().describe("Base64 encoded image string (WITHOUT the data:image/...;base64, prefix)."),
        path: z.string().describe("Target storage path e.g. 'projects/my-app-screenshot.png'."),
        mimeType: z.string().describe("MIME type e.g. 'image/png'."),
    },
    async ({ image, path, mimeType }) => {
        try {
            const res = await cfFetch(`${CV_API_URL}/portfolio/assets`, {
                method: "POST",
                body: JSON.stringify({ image, path, mimeType }),
            });
            const data = await jsonOrErr(res);
            if (!res.ok) return err(`❌ Upload failed: ${data.error}`);
            return ok(`✅ Upload successful!\nURL: ${data.downloadUrl}`);
        } catch (e: any) { return err(`❌ Error: ${e.message}`); }
    }
);

server.tool(
    "cv_portfolio_set_theme",
    "Apply a CSS theme to the user's portfolio based on project vibe.",
    {
        portfolioId: z.string().describe("Portfolio ID to update."),
        theme: z.record(z.string(), z.any())
            .describe("Theme object: primaryColor, typography, darkMode, etc."),
    },
    async ({ portfolioId, theme }) => {
        try {
            const res = await cfFetch(`${CV_API_URL}/portfolio/hero`, {
                method: "PATCH",
                body: JSON.stringify({ portfolioId, theme }),
            });
            const data = await jsonOrErr(res);
            if (!res.ok) return err(`❌ Theme update failed: ${data.error}`);
            return ok(`✅ Theme applied to portfolio ${portfolioId}!`);
        } catch (e: any) { return err(`❌ Error: ${e.message}`); }
    }
);

// ════════════════════════════════════════════════════════════════════════════
// JOBS  (cv jobs)
// ════════════════════════════════════════════════════════════════════════════

server.tool(
    "cv_jobs_hunt",
    [
        "Search validated ATS job listings and score them against the user's resume.",
        "Returns verified external job links ranked by fit. Use this when the user asks to find jobs, search openings, or hunt for opportunities.",
    ].join("\n"),
    {
        role: z.string().describe("Job title or role to search for. E.g. 'Senior TypeScript Engineer'."),
        location: z.string().optional().describe("Location filter. E.g. 'Remote' or 'San Francisco, CA'."),
        count: z.number().int().min(1).max(25).optional()
            .describe("Number of results to return (default: 10)."),
        minScore: z.number().min(0).max(100).optional()
            .describe("Minimum CareerVivid fit score 0-100. Only return jobs at or above this threshold."),
        targetOrgs: z.array(z.string()).optional()
            .describe("Preferred companies to prioritize. E.g. ['Stripe','Vercel','Linear']."),
        resumeContent: z.string().optional()
            .describe("Resume markdown to score against. If omitted, uses the user's saved resume."),
    },
    async ({ role, location, count, minScore, targetOrgs, resumeContent }) => {
        try {
            const res = await cfPost("cliJobsHunt", { role, location, count, minScore, targetOrgs, resumeContent });
            const data = await jsonOrErr(res);
            if (!res.ok) return err(`❌ Job hunt failed: ${data.error}`);

            const jobs = data.jobs || [];
            if (jobs.length === 0) {
                return ok(data.message || "No verified matching jobs found. Try broadening role or location.");
            }

            const lines = jobs.map((j: any, i: number) =>
                `${i + 1}. [${j.scoreLabel} — ${j.score}/100] ${j.title} @ ${j.company}\n` +
                `   📍 ${j.location || "Remote/Unknown"}${j.salary ? " | 💰 " + j.salary : ""}\n` +
                `   🔗 Verified apply link: ${j.finalUrl || j.url}\n` +
                `   ✅ ${j.validationReason || "Validated by CareerVivid"}\n` +
                `   📝 ${j.aiSummary}`
            ).join("\n\n");

            return ok(`Found ${data.total} verified jobs (showing ${jobs.length}):\n\n${lines}`);
        } catch (e: any) { return err(`❌ Error: ${e.message}`); }
    }
);

server.tool(
    "cv_jobs_list",
    "List jobs currently in the user's application tracker (Kanban board).",
    {
        status: z.enum(["To Apply", "Applied", "Interviewing", "Offered", "Rejected"]).optional()
            .describe("Filter by status. Omit to return all tracked jobs."),
    },
    async ({ status }) => {
        try {
            const params: Record<string, string> = {};
            if (status) params.status = status;
            const res = await cfGet("cliJobsList", Object.keys(params).length ? params : undefined);
            const data = await jsonOrErr(res);
            if (!res.ok) return err(`❌ Failed to list jobs: ${data.error}`);

            const jobs = data.jobs || [];
            if (jobs.length === 0) return ok("No jobs in tracker" + (status ? ` with status '${status}'` : "") + ".");

            const lines = jobs.map((j: any) =>
                `• [${j.applicationStatus}] ${j.jobTitle} @ ${j.companyName}\n` +
                `  📍 ${j.location || "N/A"} | Score: ${j.aiScore ?? "N/A"}/100\n` +
                `  🆔 ${j.id}`
            ).join("\n\n");

            // `total` is the page size, not the tracker size — say so rather than
            // implying the user has exactly this many jobs.
            const more = data.hasMore
                ? `\n\nShowing the ${data.total} most recently updated; more exist beyond this page.`
                : "";
            return ok(`Tracked jobs (${data.total} shown):\n\n${lines}${more}`);
        } catch (e: any) { return err(`❌ Error: ${e.message}`); }
    }
);

server.tool(
    "cv_jobs_add",
    "Add a job to the user's application tracker.",
    {
        jobTitle: z.string().describe("Job title."),
        companyName: z.string().describe("Company name."),
        location: z.string().optional().describe("Job location."),
        jobPostURL: z.string().url().optional().describe("URL to the job posting."),
        jobDescription: z.string().optional().describe("Full job description text."),
        aiScore: z.number().min(0).max(100).optional().describe("AI fit score 0-100."),
        notes: z.string().optional().describe("Optional notes about this application."),
    },
    async ({ jobTitle, companyName, location, jobPostURL, jobDescription, aiScore, notes }) => {
        try {
            const res = await cfPost("cliJobsCreate", { jobTitle, companyName, location, jobPostURL, jobDescription, aiScore, notes });
            const data = await jsonOrErr(res);
            if (!res.ok) return err(`❌ Failed to add job: ${data.error}`);
            return ok(`✅ Job added to tracker!\nTitle: ${jobTitle} @ ${companyName}\n🆔 ID: ${data.id}`);
        } catch (e: any) { return err(`❌ Error: ${e.message}`); }
    }
);

server.tool(
    "cv_jobs_update_status",
    "Move a job to a new status on the Kanban board (e.g. from 'Applied' to 'Interviewing').",
    {
        jobId: z.string().describe("Job ID (from cv_jobs_list or cv_jobs_add)."),
        status: z.enum(["To Apply", "Applied", "Interviewing", "Offered", "Rejected"])
            .describe("New status for this application."),
        notes: z.string().optional().describe("Optional notes to append."),
    },
    async ({ jobId, status, notes }) => {
        try {
            const res = await cfPost("cliJobsUpdate", { jobId, status, notes });
            const data = await jsonOrErr(res);
            if (!res.ok) return err(`❌ Status update failed: ${data.error}`);
            return ok(`✅ Job ${jobId} moved to '${data.newStatus}'.`);
        } catch (e: any) { return err(`❌ Error: ${e.message}`); }
    }
);

// ════════════════════════════════════════════════════════════════════════════
// RESUMES  (cv resumes)
// ════════════════════════════════════════════════════════════════════════════

server.tool(
    "cv_resumes_list",
    "List all of the user's AI-parsed resumes stored on CareerVivid.",
    {},
    async () => {
        try {
            const res = await cfGet("cliResumesList");
            const data = await jsonOrErr(res);
            if (!res.ok) return err(`❌ Failed to list resumes: ${data.error}`);

            const resumes = data.resumes || [];
            if (resumes.length === 0) return ok("No resumes found. Upload one at https://careervivid.app.");

            const lines = resumes.map((r: any, i: number) =>
                `${i + 1}. ${r.title || "Untitled"}\n   🆔 ${r.id} | Updated: ${r.updatedAt || "N/A"}`
            ).join("\n\n");

            return ok(`Your resumes (${data.total} total):\n\n${lines}`);
        } catch (e: any) { return err(`❌ Error: ${e.message}`); }
    }
);

server.tool(
    "cv_resumes_get",
    "Fetch the full markdown content of a specific resume.",
    {
        resumeId: z.string().optional()
            .describe("Resume ID. Omit to get the most recent resume."),
    },
    async ({ resumeId }) => {
        try {
            const params: Record<string, string> = {};
            if (resumeId) params.resumeId = resumeId;
            const res = await cfGet("cliResumeGet", Object.keys(params).length ? params : undefined);
            const data = await jsonOrErr(res);
            if (!res.ok) return err(`❌ Failed to fetch resume: ${data.error}`);
            return ok(
                `Resume: ${data.title || "Untitled"}\nID: ${data.resumeId}\nUpdated: ${data.updatedAt || "N/A"}\n\n---\n\n${data.cvMarkdown}`
            );
        } catch (e: any) { return err(`❌ Error: ${e.message}`); }
    }
);

server.tool(
    "cv_resumes_tailor",
    [
        "Tailor a resume to a specific job description using AI.",
        "Creates a new copy optimized for the target role. Use before applying to a job.",
    ].join("\n"),
    {
        resumeId: z.string().describe("ID of the resume to tailor."),
        jobDescription: z.string().describe("Full text of the job description to tailor against."),
        newTitle: z.string().optional()
            .describe("Title for the tailored copy. Defaults to the original title with a suffix."),
    },
    async ({ resumeId, jobDescription, newTitle }) => {
        try {
            const res = await cfPost("cliResumeUpdate", { resumeId, action: "tailor", jobDescription, newTitle, copy: true });
            const data = await jsonOrErr(res);
            if (!res.ok) return err(`❌ Tailor failed: ${data.error}`);
            return ok(`✅ Resume tailored!\nNew resume ID: ${data.resumeId}\n${data.message}`);
        } catch (e: any) { return err(`❌ Error: ${e.message}`); }
    }
);

server.tool(
    "cv_resumes_refine",
    "AI-refine a resume with a specific instruction (e.g. 'make bullet points more quantitative').",
    {
        resumeId: z.string().describe("ID of the resume to refine."),
        instruction: z.string().describe("Specific improvement instruction."),
    },
    async ({ resumeId, instruction }) => {
        try {
            const res = await cfPost("cliResumeUpdate", { resumeId, action: "refine", instruction });
            const data = await jsonOrErr(res);
            if (!res.ok) return err(`❌ Refine failed: ${data.error}`);
            return ok(`✅ Resume refined!\n${data.message}`);
        } catch (e: any) { return err(`❌ Error: ${e.message}`); }
    }
);

// ════════════════════════════════════════════════════════════════════════════
// COVER LETTERS  (cv resumes cover-letter / jobs cover)
// ════════════════════════════════════════════════════════════════════════════

server.tool(
    "cv_cover_letter_generate",
    "Generate a tailored cover letter for a job application using AI.",
    {
        resumeId: z.string().describe("ID of the resume to use as the base."),
        jobTitle: z.string().describe("Title of the role being applied for."),
        companyName: z.string().describe("Name of the company."),
        jobDescription: z.string().describe("Full job description text."),
    },
    async ({ resumeId, jobTitle, companyName, jobDescription }) => {
        try {
            const res = await cfPost("cliCoverLetterCreate", { resumeId, jobTitle, companyName, jobDescription });
            const data = await jsonOrErr(res);
            if (!res.ok) return err(`❌ Cover letter generation failed: ${data.error}`);
            const cl = data.coverLetter;
            return ok(`✅ Cover letter generated!\n🆔 ID: ${cl?.id || "N/A"}\n\n---\n\n${cl?.content || "(empty)"}`);
        } catch (e: any) { return err(`❌ Error: ${e.message}`); }
    }
);

server.tool(
    "cv_cover_letters_list",
    "List previously generated cover letters.",
    {
        jobId: z.string().optional()
            .describe("Filter by job tracker ID. Omit to return all cover letters."),
    },
    async ({ jobId }) => {
        try {
            const params: Record<string, string> = {};
            if (jobId) params.jobId = jobId;
            const res = await cfGet("cliCoverLettersList", Object.keys(params).length ? params : undefined);
            const data = await jsonOrErr(res);
            if (!res.ok) return err(`❌ Failed: ${data.error}`);

            const letters = data.coverLetters || [];
            if (letters.length === 0) return ok("No cover letters found.");

            const lines = letters.map((cl: any, i: number) =>
                `${i + 1}. ${cl.jobTitle} @ ${cl.companyName}\n   🆔 ${cl.id} | ${cl.createdAt || "N/A"}`
            ).join("\n\n");

            return ok(`Cover letters (${data.total} total):\n\n${lines}`);
        } catch (e: any) { return err(`❌ Error: ${e.message}`); }
    }
);

// ════════════════════════════════════════════════════════════════════════════
// REFERRALS  (cv referral)
// ════════════════════════════════════════════════════════════════════════════

server.tool(
    "cv_referral_stats",
    [
        "Get the user's referral code, shareable link, and full referral stats.",
        "Each successful referral earns the referrer 1 month of free Pro. Referred users get 2 months free.",
    ].join("\n"),
    {},
    async () => {
        try {
            const res = await cfGet("cliReferralStats");
            const data = await jsonOrErr(res);
            if (!res.ok) return err(`❌ Failed: ${data.error}`);

            const link = `https://careervivid.app/referral?ref=${data.code}`;
            const remaining = Math.max(0, data.maxReferrals - data.totalReferred);
            const userList = (data.referredUsers || []).length === 0
                ? "  None yet."
                : (data.referredUsers || []).map((u: any, i: number) =>
                    `  ${i + 1}. ${u.email} — joined ${u.signupDate ? new Date(u.signupDate).toLocaleDateString() : "recently"}`
                ).join("\n");

            return ok([
                `🎁 Referral Dashboard`,
                ``,
                `Code:  ${data.code}`,
                `Link:  ${link}`,
                ``,
                `Progress: ${data.totalReferred}/${data.maxReferrals} (${remaining} remaining)`,
                ``,
                `Referred Users:`,
                userList,
                ``,
                `Rewards:`,
                `  • THEY GET: 2 months Pro + 1000 AI credits`,
                `  • YOU GET:  1 month Pro per referral (up to ${data.maxReferrals} months)`,
            ].join("\n"));
        } catch (e: any) { return err(`❌ Error: ${e.message}`); }
    }
);

// ════════════════════════════════════════════════════════════════════════════
// Start server
// ════════════════════════════════════════════════════════════════════════════

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    process.stderr.write(`[CareerVivid MCP] Server v${VERSION} running.\n`);
}

main().catch((e) => {
    process.stderr.write(`[CareerVivid MCP] Fatal error: ${e.message}\n`);
    process.exit(1);
});
