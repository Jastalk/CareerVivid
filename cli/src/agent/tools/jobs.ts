/**
 * Job-hunting tools for the CareerVivid Job Agent.
 *
 * These tools wrap the existing jobs API methods so the Gemini agent can
 * autonomously hunt for jobs, save them to the tracker, and update statuses
 * using natural language instructions from the user.
 */

import { Tool } from "../Tool.js";
import { Type } from "@google/genai";
import {
  jobsHunt,
  jobsCreate,
  jobsList,
  jobsUpdate,
  resumeGet,
  resumesList,
  resumeUpdate,
  resumeDelete,
  isApiError,
  ApplicationStatus,
} from "../../api.js";

// ---------------------------------------------------------------------------
// Tool: search_jobs
// ---------------------------------------------------------------------------

export const SearchJobsTool: Tool = {
  name: "search_jobs",
  description: `Search for jobs matching a role and location, scored against the user's resume.
Returns a scored list of job opportunities with AI summaries and missing skills.
Use this when the user asks to "find jobs", "search for roles", "look for positions", etc.
By default operates in dry_run mode — results are shown for review, nothing is saved automatically.`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      role: {
        type: Type.STRING,
        description:
          'The job title or role to search for. Examples: "Software Engineer", "Product Manager", "Data Scientist".',
      },
      location: {
        type: Type.STRING,
        description:
          'Optional. Preferred job location. Examples: "San Francisco, CA", "Remote", "New York". Default is remote-friendly if omitted.',
      },
      count: {
        type: Type.NUMBER,
        description: "Optional. Number of job results to return. Default is 10. Maximum is 20.",
      },
      min_score: {
        type: Type.NUMBER,
        description: "Optional. Minimum match score (0-100). Default is 70. Use 80 for excellent matches only.",
      },
      resume_id: {
        type: Type.STRING,
        description: "Optional. Specific resume ID to score against. If omitted, uses the user's latest resume.",
      },
      dry_run: {
        type: Type.BOOLEAN,
        description: "Optional. Default: true. If true, shows results for review without auto-saving. Set false only if user explicitly says to save all results.",
      },
    },
    required: ["role"],
  },
  execute: async (args: {
    role: string;
    location?: string;
    count?: number;
    min_score?: number;
    resume_id?: string;
    dry_run?: boolean;
  }) => {
    // Optionally fetch resume content to include in the scoring request
    let resumeContent: string | undefined;
    try {
      const resumeResult = await resumeGet(args.resume_id);
      if (!isApiError(resumeResult)) {
        resumeContent = resumeResult.cvMarkdown;
      }
    } catch {
      // Proceed without resume — backend will use stored resume
    }

    const result = await jobsHunt({
      resumeContent,
      role: args.role,
      location: args.location,
      count: args.count ?? 10,
      minScore: args.min_score ?? 70,  // default 70 to filter low-quality results
    });

    if (isApiError(result)) {
      return `Error searching jobs: ${result.message}`;
    }

    if (result.jobs.length === 0) {
      return `No jobs found matching "${args.role}"${args.location ? ` in ${args.location}` : ""}. Try broadening your search or adjusting the location.`;
    }

    const jobList = result.jobs
      .map((job, i) => {
        const scoreBar = "█".repeat(Math.round(job.score / 10)) + "░".repeat(10 - Math.round(job.score / 10));
        const missing = job.missingSkills.length > 0 ? `\n   Missing skills: ${job.missingSkills.join(", ")}` : "";
        return (
          `${i + 1}. [${job.scoreLabel.toUpperCase()} ${job.score}/100] ${job.title} @ ${job.company}\n` +
          `   Score: ${scoreBar} ${job.score}%\n` +
          `   Location: ${job.location || "Not specified"}${job.salary ? ` | Salary: ${job.salary}` : ""}\n` +
          `   Summary: ${job.aiSummary}${missing}\n` +
          `   URL: ${job.url}\n` +
          `   Job ID: ${job.id}`
        );
      })
      .join("\n\n");

    const isDryRun = args.dry_run !== false; // default true
    const dryRunNote = isDryRun
      ? `\n\n📋 Review above. Say "add [company] to my tracker" to save specific ones.`
      : "";

    return (
      `Found ${result.total} jobs for "${args.role}"${args.location ? ` in ${args.location}` : ""}. ` +
      `Showing top ${result.jobs.length} (min score ${args.min_score ?? 70}%):\n\n${jobList}` +
      dryRunNote
    );
  },
};

// ---------------------------------------------------------------------------
// Tool: save_job
// ---------------------------------------------------------------------------

export const SaveJobTool: Tool = {
  name: "kanban_add_job",
  description: `Save a job to the user's CareerVivid job tracker Kanban board.
The job will appear in the "To Apply" column of the /job-tracker page.
Use this after finding interesting jobs via search_jobs, or when the user asks to "save", "add", or "track" a specific job.`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      job_title: {
        type: Type.STRING,
        description: "The job title / position name.",
      },
      company_name: {
        type: Type.STRING,
        description: "The name of the company.",
      },
      location: {
        type: Type.STRING,
        description: "Optional. Job location (city, state, or 'Remote').",
      },
      job_url: {
        type: Type.STRING,
        description: "Optional. URL to the job posting.",
      },
      job_description: {
        type: Type.STRING,
        description: "Optional. Brief description or key details of the role.",
      },
      ai_score: {
        type: Type.NUMBER,
        description: "Optional. AI match score (0-100) from search_jobs results.",
      },
      ai_summary: {
        type: Type.STRING,
        description: "Optional. AI-generated summary of the job from search_jobs results.",
      },
      notes: {
        type: Type.STRING,
        description: "Optional. Personal notes about this job opportunity.",
      },
    },
    required: ["job_title", "company_name"],
  },
  execute: async (args: {
    job_title: string;
    company_name: string;
    location?: string;
    job_url?: string;
    job_description?: string;
    ai_score?: number;
    ai_summary?: string;
    notes?: string;
  }) => {
    const result = await jobsCreate({
      jobTitle: args.job_title,
      companyName: args.company_name,
      location: args.location,
      jobPostURL: args.job_url,
      jobDescription: args.job_description,
      aiScore: args.ai_score,
      aiSummary: args.ai_summary,
      notes: args.notes,
    });

    if (isApiError(result)) {
      return `Error saving job: ${result.message}`;
    }

    return (
      `✅ Saved "${args.job_title}" at ${args.company_name} to your job tracker!\n` +
      `   Status: To Apply\n` +
      `   Job ID: ${result.id}\n` +
      `   View it at: https://careervivid.app/job-tracker\n\n` +
      `Agent Instruction: Please tell the user that the job is saved and remind them that they need to apply for it. Also let them know that you can help them update the job application status (To Apply, Applied, Interviewing, Offered, Rejected) whenever they are ready.`
    );
  },
};

// ---------------------------------------------------------------------------
// Tool: list_jobs
// ---------------------------------------------------------------------------

export const ListJobsTool: Tool = {
  name: "kanban_list_jobs",
  description: `List the user's jobs from their CareerVivid job tracker Kanban board.
Can filter by status. Use this when the user asks "what jobs do I have?", "show my tracker",
"what's in my job pipeline?", "check my interviews", etc.`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      status: {
        type: Type.STRING,
        description:
          'Optional. Filter by application status. One of: "To Apply", "Applied", "Interviewing", "Offered", "Rejected". If omitted, returns all jobs.',
      },
    },
  },
  execute: async (args: { status?: string }) => {
    const validStatuses: ApplicationStatus[] = [
      "To Apply", "Applied", "Interviewing", "Offered", "Rejected",
    ];
    const status = validStatuses.includes(args.status as ApplicationStatus)
      ? (args.status as ApplicationStatus)
      : undefined;

    const result = await jobsList(status);

    if (isApiError(result)) {
      return `Error fetching job tracker: ${result.message}`;
    }

    if (result.jobs.length === 0) {
      const statusMsg = status ? ` with status "${status}"` : "";
      return `Your job tracker is empty${statusMsg}. Use search_jobs to find opportunities and save_job to add them!`;
    }

    // Group by status for a clear overview
    const grouped: Record<string, typeof result.jobs> = {};
    for (const job of result.jobs) {
      const s = job.applicationStatus;
      if (!grouped[s]) grouped[s] = [];
      grouped[s].push(job);
    }

    const statusOrder: ApplicationStatus[] = ["To Apply", "Applied", "Interviewing", "Offered", "Rejected"];
    const lines: string[] = [`Your Job Tracker (${result.total} total):\n`];

    for (const s of statusOrder) {
      const jobs = grouped[s];
      if (!jobs || jobs.length === 0) continue;

      lines.push(`── ${s.toUpperCase()} (${jobs.length}) ──`);
      for (const job of jobs) {
        const score = job.aiScore !== null ? ` [${job.aiScore}%]` : "";
        const updated = job.updatedAt
          ? ` | Updated: ${new Date(job.updatedAt).toLocaleDateString()}`
          : "";
        lines.push(`  • ${job.jobTitle} @ ${job.companyName}${score} | ${job.location || "N/A"}${updated}`);
        lines.push(`    ID: ${job.id} | URL: ${job.jobPostURL || "N/A"}`);
        if (job.notes) lines.push(`    Notes: ${job.notes}`);
      }
      lines.push("");
    }

    return lines.join("\n");
  },
};

// ---------------------------------------------------------------------------
// Tool: update_job_status
// ---------------------------------------------------------------------------

export const UpdateJobStatusTool: Tool = {
  name: "kanban_update_status",
  description: `Move a job to a different status on the CareerVivid Kanban board.
Use this when the user mentions: "I got an interview", "I applied to X", "I got an offer",
"X rejected me", "move Y to applied", etc. The change will be visible in the /job-tracker UI.`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      job_id: {
        type: Type.STRING,
        description:
          "The job ID to update. Get this from list_jobs or from a previous save_job call.",
      },
      new_status: {
        type: Type.STRING,
        description:
          'The new application status. Must be one of: "To Apply", "Applied", "Interviewing", "Offered", "Rejected".',
      },
      notes: {
        type: Type.STRING,
        description:
          "Optional. Add or update notes about this status change (e.g. interview date, interviewer name, feedback).",
      },
    },
    required: ["job_id", "new_status"],
  },
  execute: async (args: { job_id: string; new_status: string; notes?: string }) => {
    const validStatuses: ApplicationStatus[] = [
      "To Apply", "Applied", "Interviewing", "Offered", "Rejected",
    ];

    if (!validStatuses.includes(args.new_status as ApplicationStatus)) {
      return (
        `Invalid status "${args.new_status}". ` +
        `Valid options are: ${validStatuses.join(", ")}.`
      );
    }

    const result = await jobsUpdate({
      jobId: args.job_id,
      status: args.new_status as ApplicationStatus,
      notes: args.notes,
    });

    if (isApiError(result)) {
      return `Error updating job: ${result.message}`;
    }

    const notesMsg = args.notes ? `\n   Notes: "${args.notes}"` : "";
    return (
      `✅ Job tracker updated!\n` +
      `   Job ID: ${result.jobId}\n` +
      `   New Status: ${result.newStatus}${notesMsg}\n` +
      `   View your board at: https://careervivid.app/job-tracker`
    );
  },
};

// ---------------------------------------------------------------------------
// Tool: get_resume
// ---------------------------------------------------------------------------

export const GetResumeTool: Tool = {
  name: "get_resume",
  description: `Fetch the user's resume from their CareerVivid profile.
Use this to understand the user's background, skills, and experience when giving
personalized job advice, tailoring cover letters, or analyzing job fit.`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      resume_id: {
        type: Type.STRING,
        description: "Optional. Specific resume ID to retrieve. If omitted, fetches the latest resume.",
      },
    },
  },
  execute: async (args: { resume_id?: string }) => {
    const result = await resumeGet(args.resume_id);

    if (isApiError(result)) {
      return `Error fetching resume: ${result.message}`;
    }

    const updated = result.updatedAt
      ? `\nLast updated: ${new Date(result.updatedAt).toLocaleDateString()}`
      : "";

    const url = `https://careervivid.app/edit/${result.resumeId}`;
    return (
      `Resume: "${result.title}" (ID: ${result.resumeId})${updated}\n` +
      `🔗 View / edit: ${url}\n\n` +
      `--- RESUME CONTENT ---\n${result.cvMarkdown}\n--- END OF RESUME ---`
    );
  },
};

// ---------------------------------------------------------------------------
// Tool: list_resumes
// ---------------------------------------------------------------------------

export const ListResumesTool: Tool = {
  name: "list_resumes",
  description: `List all of the user's resumes on CareerVivid.
Use this when the user asks "how many resumes do I have?", "list my resumes", or "show my resumes".
This returns lightweight metadata including resume ID and title, which can be useful when calling search_jobs or get_resume.`,
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
  execute: async () => {
    const result = await resumesList();

    if (isApiError(result)) {
      return `Error fetching resumes: ${result.message}`;
    }

    if (result.total === 0 || !result.resumes || result.resumes.length === 0) {
      return "You don't have any resumes uploaded yet. Visit CareerVivid to upload one!";
    }

    const lines = [`You have ${result.total} resume(s) on CareerVivid:\n`];
    for (const res of result.resumes) {
      const updated = res.updatedAt ? ` (Updated: ${new Date(res.updatedAt).toLocaleDateString()})` : "";
      lines.push(`- "${res.title}" [ID: ${res.id}]${updated}`);
    }

    lines.push("\nUse get_resume with a specific ID to view its content.");
    return lines.join("\n");
  },
};

// ---------------------------------------------------------------------------
// Tool: tailor_resume
// ---------------------------------------------------------------------------

export const TailorResumeTool: Tool = {
  name: "tailor_resume",
  description: `Tailor or refine the user's resume using AI. 
Use this when the user asks to "update my resume", "tailor my resume for this job", "add X skill to my resume", etc.
You must provide either a target job_description to tailor to, or an instruction for how to refine it.`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      resume_id: {
        type: Type.STRING,
        description: "The ID of the resume to update.",
      },
      action: {
        type: Type.STRING,
        description: "Whether to 'tailor' (match a JD) or 'refine' (general improvements via instruction)",
        enum: ["tailor", "refine"],
      },
      job_description: {
        type: Type.STRING,
        description: "Optional. The target job description to tailor the resume for. Required if action is 'tailor'.",
      },
      instruction: {
        type: Type.STRING,
        description: "Optional. Specific instructions on how to refine the resume. Required if action is 'refine'.",
      },
      new_title: {
        type: Type.STRING,
        description: "Optional. A title for the new updated resume.",
      },
      copy: {
        type: Type.BOOLEAN,
        description: "Optional. If true, creates a new resume copy instead of modifying in-place. Good for tailoring to specific jobs.",
      },
    },
    required: ["resume_id", "action"],
  },
  execute: async (args: {
    resume_id: string;
    action: "tailor" | "refine";
    job_description?: string;
    instruction?: string;
    new_title?: string;
    copy?: boolean;
  }) => {
    if (args.action === "tailor" && !args.job_description) {
      return "Error: job_description is required when action is 'tailor'.";
    }
    if (args.action === "refine" && !args.instruction) {
      return "Error: instruction is required when action is 'refine'.";
    }

    const result = await resumeUpdate({
      resumeId: args.resume_id,
      action: args.action,
      jobDescription: args.job_description,
      instruction: args.instruction,
      newTitle: args.new_title,
      copy: args.copy,
    });

    if (isApiError(result)) {
      return `Error tailoring resume: ${result.message}`;
    }

    const url = `https://careervivid.app/edit/${result.resumeId}`;
    return `✅ AI Resume Update Successful!\n${result.message}\n\n🔗 View / edit your resume here: ${url}\n\nAgent Instruction: Always show the user the above URL as a clickable link and tell them they can open it to view or further edit their resume.`;
  },
};

// ---------------------------------------------------------------------------
// Tool: delete_resume
// ---------------------------------------------------------------------------

export const DeleteResumeTool: Tool = {
  name: "delete_resume",
  description: `Delete a user's resume from CareerVivid.
Use this when the user explicitly asks to "delete my resume", "remove resume X", etc.
MAKE SURE the user actually intends to delete it, as this is permanent.`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      resume_id: {
        type: Type.STRING,
        description: "The ID of the resume to delete.",
      },
    },
    required: ["resume_id"],
  },
  execute: async (args: { resume_id: string }) => {
    const result = await resumeDelete({ resumeId: args.resume_id });

    if (isApiError(result)) {
      return `Error deleting resume: ${result.message}`;
    }

    return `✅ Resume successfully deleted!`;
  },
};

// ---------------------------------------------------------------------------
// Tool: apply_to_job
// ---------------------------------------------------------------------------

export const ApplyToJobTool: Tool = {
  name: "browser_autofill_application",
  description: `Open a job application in the user's Chrome browser and auto-fill it with AI-tailored answers.
This tool launches Playwright, navigates to the job URL, extracts the form fields, fills them
with AI-generated answers from the user's resume, and shows the user a final preview before submitting.

Use this when the user says:
- "Apply to this job for me"
- "Auto-apply to [company] job"
- "Fill out the application at [url]"
- "Submit my application to [job]"

IMPORTANT: Always confirm with the user before calling this tool — applying to a job is a significant action.`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      job_url: {
        type: Type.STRING,
        description: "The full URL to the job application page (Greenhouse, Lever, Ashby, LinkedIn Easy Apply, or any ATS).",
      },
      job_id: {
        type: Type.STRING,
        description: "Optional. The job ID from the CareerVivid tracker. If provided, the job status will be updated to 'Applied' after submission.",
      },
      job_title: {
        type: Type.STRING,
        description: "The job title (for context in AI answer generation).",
      },
      company_name: {
        type: Type.STRING,
        description: "The company name (for context in AI answer generation).",
      },
      resume_id: {
        type: Type.STRING,
        description: "Optional. Specific resume ID to tailor answers from. If omitted, uses the user's latest resume.",
      },
      dry_run: {
        type: Type.BOOLEAN,
        description: "Optional. If true, extracts and shows the form fields and proposed answers without opening a browser or submitting.",
      },
      enable_linkedin: {
        type: Type.BOOLEAN,
        description: "Optional. Set true to allow LinkedIn Easy Apply automation. The user must explicitly opt in.",
      },
      model: {
        type: Type.STRING,
        description: "Optional. Gemini model to use for the browser-use agent. Default: gemini-1.5-flash.",
      },
    },
    required: ["job_url"],
  },
  execute: async (args: {
    job_url: string;
    job_id?: string;
    job_title?: string;
    company_name?: string;
    resume_id?: string;
    dry_run?: boolean;
    enable_linkedin?: boolean;
    model?: string;
  }) => {
    // ── 1. Load resume ─────────────────────────────────────────────────────
    let resumeMarkdown = "";
    try {
      const resumeResult = await resumeGet(args.resume_id);
      if (!isApiError(resumeResult)) resumeMarkdown = resumeResult.cvMarkdown || "";
    } catch { /* proceed without resume */ }

    // ── 2. Load local apply profile (name, phone, location etc.) ──────────
    const { loadProfile } = await import("../../apply/gemini-agent.js");
    const profile = loadProfile();

    // ── 3. Build a rich task description for browser-use ──────────────────
    const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ");
    const location = [profile.city, profile.state, profile.country].filter(Boolean).join(", ");

    let task = `Fill out the job application form at the URL below. Use the information provided — do NOT make up any data not listed here.

URL: ${args.job_url}
${args.job_title    ? `Job Title: ${args.job_title}`    : ""}
${args.company_name ? `Company:   ${args.company_name}` : ""}

APPLICANT DETAILS:
- Full Name:          ${fullName   || "(see resume)"}
- Email:              ${profile.email    || "(see resume)"}
- Phone:              ${profile.phone    || "(see resume)"}
- Location:           ${location   || "(see resume)"}
- LinkedIn:           ${profile.linkedin || ""}
- GitHub:             ${profile.github   || ""}
- Portfolio/Website:  ${profile.portfolio || ""}
- Work Authorization: ${profile.workAuthorization || "Authorized to work in the US"}
- Years of Experience: ${profile.yearsOfExperience || "(see resume)"}
- Current Title:      ${profile.currentTitle   || "(see resume)"}
- Current Company:    ${profile.currentCompany || "(see resume)"}

${resumeMarkdown ? `RESUME (use for work history, skills, education, cover letter content):\n${resumeMarkdown.substring(0, 8000)}` : ""}

FILLING RULES:
1. Navigate to the URL. If there is an "Apply" or "Apply Now" button, click it first.
2. Wait for the form to fully load before filling.
3. Fill every visible field using the details above.
4. For work experience: use the resume. For education: use the resume.
5. For cover letter / motivations / "why this role": write 2-3 sentences tailored to the role.
6. For EEO/demographic questions (race, gender, veteran, disability): select "Decline to self-identify" or "I prefer not to say".
7. For salary: leave blank or enter "Negotiable".
8. For "how did you hear about us": select "LinkedIn" or "Job Board".
9. For multi-page forms: advance to the next page and continue filling.
10. STOP before clicking the final Submit/Apply button — the user will review and submit manually.
11. Report which fields you filled and any you could not complete.`;

    if (args.dry_run) {
      return `[DRY RUN] Would launch browser-use with:\n\n${task.substring(0, 600)}...`;
    }

    // ── 4. Resolve Python and sidecar path ─────────────────────────────────
    const { existsSync } = await import("fs");
    const { spawn }      = await import("child_process");
    const pathMod        = await import("path");
    const { fileURLToPath } = await import("url");

    const PYTHON_CANDIDATES = [
      pathMod.join(pathMod.dirname(fileURLToPath(import.meta.url)), "../../../..", "browser-use", ".venv", "bin", "python"),
      "/Users/jiawenzhu/careervivid/browser-use/.venv/bin/python",
      "/opt/homebrew/bin/python3.11",
      "/usr/local/bin/python3.11",
      "/usr/bin/python3.11",
    ];
    const pythonBin = PYTHON_CANDIDATES.find(existsSync);
    if (!pythonBin) {
      return "\u274c Python 3.11 not found.\n   Install: brew install python@3.11\n   Then: pip3.11 install browser-use";
    }

    const __dirname = pathMod.dirname(fileURLToPath(import.meta.url));
    // dist/agent/tools/ → ../../../ → project root → src/apply/
    const sidecarFromDist = pathMod.resolve(__dirname, "../../../src/apply/browser_sidecar.py");
    const sidecarFromSrc  = pathMod.resolve(__dirname, "../../apply/browser_sidecar.py");
    const sidecarPath = existsSync(sidecarFromDist) ? sidecarFromDist : sidecarFromSrc;
    if (!existsSync(sidecarPath)) {
      return `\u274c browser_sidecar.py not found at expected path: ${sidecarPath}`;
    }

    // ── 5. Resolve LLM config ─────────────────────────────────────────
    // CV_SESSION_LLM_* env vars are injected at agent startup and reflect
    // the provider/model the user actually picked — always use them first.
    const { loadConfig, getGeminiKey, getLlmConfig } = await import("../../config.js");
    const cfg = loadConfig();
    const llmCfg = getLlmConfig();

    const sessionProvider = process.env.CV_SESSION_LLM_PROVIDER;
    const sessionModel    = process.env.CV_SESSION_LLM_MODEL;
    const sessionApiKey   = process.env.CV_SESSION_LLM_APIKEY;
    const sessionBaseUrl  = process.env.CV_SESSION_LLM_BASE_URL;

    const llmConfig: { provider: string; model: string; apiKey: string; baseUrl?: string } = {
      provider: sessionProvider ?? llmCfg.provider,
      model:    args.model || sessionModel || llmCfg.model || "gemini-1.5-flash",
      apiKey:   sessionApiKey || llmCfg.apiKey || cfg.geminiKey || cfg.llmApiKey || getGeminiKey() || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "",
      baseUrl:  sessionBaseUrl || llmCfg.baseUrl,
    };

    // For CareerVivid Cloud, use the CV account key for the proxy — no personal LLM key needed
    if (llmConfig.provider === "careervivid") {
      llmConfig.apiKey = cfg.apiKey || process.env.CV_API_KEY || "";
    } else if (!llmConfig.apiKey) {
      return [
        `❌ No API key found for provider: ${llmConfig.provider}`,
        "   Run `cv agent config` and choose your provider to set a key.",
      ].join("\n");
    }

    const { homedir } = await import("os");
    const profileDir = pathMod.join(homedir(), ".careervivid", "browser-session");

    // ── 6. Spawn browser-use sidecar ─────────────────────────────────────────
    const chalk = (await import("chalk")).default;
    console.log(chalk.cyan(`\n🤖 Launching browser-use agent → ${args.job_url}\n`));
    console.log(chalk.dim("   Chrome will open and fill the form autonomously."));
    console.log(chalk.dim("   It will stop BEFORE the Submit button — you review and submit.\n"));

    // Build input payload using the new llm_config format
    const inputPayload = JSON.stringify({
      url:             args.job_url,
      llm_config:      llmConfig,
      resume_pdf_path: "",
      profile:         {},
      profile_dir:     profileDir,
      task_override:   task, // sidecar uses this full task string
    });

    return new Promise<string>((resolve) => {
      let finalResult = "";

      const child = spawn(pythonBin, [sidecarPath], {
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env, PYTHONUNBUFFERED: "1" },
      });

      child.stdin.write(inputPayload);
      child.stdin.end();

      let buffer = "";
      child.stdout.on("data", (data: Buffer) => {
        buffer += data.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const msg = JSON.parse(trimmed);
            if (msg.type === "step")  console.log(chalk.dim(`   ${msg.message}`));
            if (msg.type === "done") { finalResult = msg.result || "Form filled."; console.log(chalk.green(`\n✅ ${finalResult}\n`)); }
            if (msg.type === "error") { finalResult = `Error: ${msg.message}`; console.log(chalk.red(`\n❌ ${msg.message}\n`)); }
          } catch {
            if (trimmed) console.log(chalk.dim(`   [py] ${trimmed}`));
          }
        }
      });

      child.stderr.on("data", (data: Buffer) => {
        const str = data.toString().trim();
        if (str && !str.includes("DeprecationWarning") && !str.includes("ExperimentalWarning")) {
          console.log(chalk.yellow(`   [py-err] ${str}`));
        }
      });

      child.on("close", (code) => {
        const trackerNote = args.job_id
          ? "\n\n💡 After submitting tell me: 'mark job as Applied' to update your tracker."
          : "";
        resolve(
          finalResult ||
          (code === 0
            ? `Browser-use agent finished. Review the browser and submit when ready.${trackerNote}`
            : `Agent exited (code ${code}). The browser window may still be open — check it.${trackerNote}`)
        );
      });

      child.on("error", (err) => resolve(`❌ Failed to start browser-use: ${err.message}`));
    });
  },
};

// ---------------------------------------------------------------------------
// All job tools export
// ---------------------------------------------------------------------------

export const ALL_JOB_TOOLS: Tool[] = [
  GetResumeTool,
  ListResumesTool,
  TailorResumeTool,
  DeleteResumeTool,
  SearchJobsTool,
  SaveJobTool,
  ListJobsTool,
  UpdateJobStatusTool,
  ApplyToJobTool,
];
