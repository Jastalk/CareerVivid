import { Type } from "@google/genai";
import { Tool } from "../../agent/Tool.js";
import { ALL_CODING_TOOLS } from "../../agent/tools/coding.js";
import { ALL_JOB_TOOLS } from "../../agent/tools/jobs.js";
import { ALL_BROWSER_TOOLS } from "../../agent/tools/browser.js";
import { ALL_LOCAL_TRACKER_TOOLS } from "../../agent/tools/local-tracker.js";
import { ALL_URL_VERIFIER_TOOLS } from "../../agent/tools/urlVerifier.js";
import { ALL_PORTFOLIO_TOOLS } from "../../agent/tools/portfolio.js";
import { ALL_COVERLETTER_TOOLS } from "../../agent/tools/coverLetter.js";
import { ALL_JOB_OPENINGS_TOOLS } from "../../agent/tools/jobOpenings.js";
import { ALL_INTERVIEW_TOOLS } from "../../agent/tools/interview.js";
import { publishSingleFile } from "../publish.js";

// ── Publish tools ─────────────────────────────────────────────────────────────

const PublishArticleTool: Tool = {
  name: "publish_article",
  description:
    `Publish a markdown article to CareerVivid.
IMPORTANT: The default visibility is PRIVATE (isPublic = false).
Only set isPublic = true if the user explicitly asks to publish publicly.
If the user says "private", "just for me", "don't share", always pass isPublic = false.`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "Title of the article." },
      content: { type: Type.STRING, description: "Full markdown content." },
      tags: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "List of tags for the article.",
      },
      isPublic: {
        type: Type.BOOLEAN,
        description: "Whether the article is public. Default: false (private). Only set true if user explicitly requests a public post.",
      },
    },
    required: ["title", "content"],
  },
  execute: async (args: { title: string; content: string; tags?: string[]; isPublic?: boolean }) => {
    const fs = await import("fs");
    const path = await import("path");
    const slug = args.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const filePath = path.join(process.cwd(), `${slug || "article"}.md`);
    fs.writeFileSync(filePath, args.content, "utf-8");

    // Bug fix: default to PRIVATE. Only go public when agent explicitly passes true.
    const isPublic = args.isPublic === true;

    const result = await publishSingleFile(
      filePath,
      args.content,
      { title: args.title, type: "article", format: "markdown", tags: (args.tags || []).join(","), public: isPublic },
      true,
    );
    return result.success
      ? `Published (${isPublic ? "public" : "private"})! URL: ${result.url} | ID: ${result.postId}`
      : "Failed to publish article.";
  },
};

const GenerateDiagramTool: Tool = {
  name: "generate_diagram",
  description:
    "Publish a Mermaid diagram as a whiteboard to CareerVivid. Provide valid Mermaid syntax. Default visibility is private.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "Title of the diagram." },
      content: { type: Type.STRING, description: "Mermaid diagram code (e.g. graph TD...)." },
      tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Tags." },
      isPublic: {
        type: Type.BOOLEAN,
        description: "Whether the diagram is public. Default: false (private).",
      },
    },
    required: ["title", "content"],
  },
  execute: async (args: { title: string; content: string; tags?: string[]; isPublic?: boolean }) => {
    const fs = await import("fs");
    const path = await import("path");
    const slug = args.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const filePath = path.join(process.cwd(), `${slug || "diagram"}.mmd`);
    fs.writeFileSync(filePath, args.content, "utf-8");

    const isPublic = args.isPublic === true;

    const result = await publishSingleFile(
      filePath,
      args.content,
      { title: args.title, type: "whiteboard", format: "mermaid", tags: (args.tags || []).join(","), public: isPublic },
      true,
    );
    return result.success
      ? `Published (${isPublic ? "public" : "private"})! URL: ${result.url} | ID: ${result.postId}`
      : "Failed to publish diagram.";
  },
};

// ── Resume CRUD tools (for cv agent --resume) ─────────────────────────────────

/**
 * set_resume_fields: Surgically update specific named fields on a resume using
 * a precision AI refine instruction. Supports both scalar fields (lastName, phone,
 * city) and array fields (skills, experience bullets), as well as the resume title.
 */
const SetResumeFieldsTool: Tool = {
  name: "set_resume_fields",
  description: `Update specific fields on the user's resume without rewriting the whole thing.
Use this when the user asks to:
- Set or fix their last name, phone, address, city, country
- Update their job title, current company, LinkedIn, GitHub, portfolio URLs
- Add, remove, or update a specific skill
- Change the resume title
- Correct any specific piece of information in their resume

Examples:
- "set my last name to Zhu"  → fields: { lastName: "Zhu" }
- "add Python to my skills"  → fields: { addSkill: "Python" }
- "update my phone to +1-408-599-4164" → fields: { phone: "+1-408-599-4164" }
- "change my job title to Senior Engineer" → fields: { jobTitle: "Senior Engineer" }

IMPORTANT: Always call get_resume first to load the current content, then call this tool with only the fields that need to change.`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      resume_id: {
        type: Type.STRING,
        description: "The ID of the resume to update.",
      },
      fields: {
        type: Type.OBJECT,
        description: `Object of field name → new value pairs. Supported fields:
- firstName, lastName (string)
- email, phone (string)
- address, city, state, country, postalCode (string)
- jobTitle, currentCompany (string)
- linkedin, github, portfolio (string URL)
- summary (string — professional summary / objective)
- addSkill (string — add a single skill)
- removeSkill (string — remove a single skill)
- resumeTitle (string — the name of the resume document itself)`,
        properties: {
          firstName: { type: Type.STRING },
          lastName: { type: Type.STRING },
          email: { type: Type.STRING },
          phone: { type: Type.STRING },
          address: { type: Type.STRING },
          city: { type: Type.STRING },
          state: { type: Type.STRING },
          country: { type: Type.STRING },
          postalCode: { type: Type.STRING },
          jobTitle: { type: Type.STRING },
          currentCompany: { type: Type.STRING },
          linkedin: { type: Type.STRING },
          github: { type: Type.STRING },
          portfolio: { type: Type.STRING },
          summary: { type: Type.STRING },
          addSkill: { type: Type.STRING },
          removeSkill: { type: Type.STRING },
          resumeTitle: { type: Type.STRING },
        },
      },
    },
    required: ["resume_id", "fields"],
  },
  execute: async (args: { resume_id: string; fields: Record<string, string> }) => {
    const { resumeUpdate, isApiError } = await import("../../api.js");

    // Build a precise instruction from the field map
    const instructions: string[] = [];
    const f = args.fields;

    if (f.firstName)     instructions.push(`Set first name to: ${f.firstName}`);
    if (f.lastName)      instructions.push(`Set last name to: ${f.lastName}`);
    if (f.email)         instructions.push(`Set email address to: ${f.email}`);
    if (f.phone)         instructions.push(`Set phone number to: ${f.phone}`);
    if (f.address)       instructions.push(`Set street address to: ${f.address}`);
    if (f.city)          instructions.push(`Set city to: ${f.city}`);
    if (f.state)         instructions.push(`Set state/province to: ${f.state}`);
    if (f.country)       instructions.push(`Set country to: ${f.country}`);
    if (f.postalCode)    instructions.push(`Set postal/zip code to: ${f.postalCode}`);
    if (f.jobTitle)      instructions.push(`Set job title / headline to: ${f.jobTitle}`);
    if (f.currentCompany) instructions.push(`Set current company to: ${f.currentCompany}`);
    if (f.linkedin)      instructions.push(`Set LinkedIn URL to: ${f.linkedin}`);
    if (f.github)        instructions.push(`Set GitHub URL to: ${f.github}`);
    if (f.portfolio)     instructions.push(`Set portfolio/website URL to: ${f.portfolio}`);
    if (f.summary)       instructions.push(`Replace professional summary with: "${f.summary}"`);
    if (f.addSkill)      instructions.push(`Add the following skill if not already present: ${f.addSkill}`);
    if (f.removeSkill)   instructions.push(`Remove the following skill if present: ${f.removeSkill}`);

    if (instructions.length === 0) {
      return "❌ No fields provided. Please specify at least one field to update (e.g. { lastName: 'Zhu' }).";
    }

    const instruction = [
      "Make ONLY the following precise changes to the resume. Do NOT alter any other content.",
      "Do not rephrase, rewrite, or embellish any other section.",
      "",
      ...instructions.map((i, idx) => `${idx + 1}. ${i}`),
    ].join("\n");

    const result = await resumeUpdate({
      resumeId: args.resume_id,
      action: "refine",
      instruction,
      newTitle: f.resumeTitle,
    });

    if (isApiError(result)) {
      return `❌ Failed to update resume fields: ${result.message}`;
    }

    const url = `https://careervivid.app/edit/${result.resumeId}`;
    const changedList = instructions.map((i) => `  ✓ ${i}`).join("\n");
    return [
      `✅ Resume updated successfully!`,
      ``,
      `Changes applied:`,
      changedList,
      ``,
      `🔗 Review / edit: ${url}`,
      ``,
      `Agent Instruction: Show the user the above URL as a clickable link and tell them to review the changes in their browser.`,
    ].join("\n");
  },
};

// ── All resume tools for cv agent --resume ────────────────────────────────────

const RESUME_TOOLS: Tool[] = ALL_JOB_TOOLS.filter((t) =>
  ["get_resume", "list_resumes", "tailor_resume", "delete_resume"].includes(t.name)
);

export function getTools(options: { jobs?: boolean; resume?: boolean; coding?: boolean }): Tool[] {
  if (options.jobs) {
    // Jobs mode: all job tools + browser + tracker + url verifier + publish
    const tools: Tool[] = [PublishArticleTool, GenerateDiagramTool];
    for (const t of ALL_JOB_TOOLS) {
      if (!tools.find((x) => x.name === t.name)) tools.push(t);
    }
    for (const t of ALL_BROWSER_TOOLS) {
      if (!tools.find((x) => x.name === t.name)) tools.push(t);
    }
    for (const t of ALL_LOCAL_TRACKER_TOOLS) {
      if (!tools.find((x) => x.name === t.name)) tools.push(t);
    }
    for (const t of ALL_URL_VERIFIER_TOOLS) {
      if (!tools.find((x) => x.name === t.name)) tools.push(t);
    }
    for (const t of ALL_COVERLETTER_TOOLS) {
      if (!tools.find((x) => x.name === t.name)) tools.push(t);
    }
    for (const t of ALL_JOB_OPENINGS_TOOLS) {
      if (!tools.find((x) => x.name === t.name)) tools.push(t);
    }
    for (const t of ALL_INTERVIEW_TOOLS) {
      if (!tools.find((x) => x.name === t.name)) tools.push(t);
    }
    return tools;
  }

  if (options.resume) {
    // Resume mode: resume CRUD + portfolio API tools
    // NOTE: NO coding/file-system tools — prevents agent editing local source files.
    const tools: Tool[] = [PublishArticleTool, GenerateDiagramTool];
    for (const t of RESUME_TOOLS) {
      if (!tools.find((x) => x.name === t.name)) tools.push(t);
    }
    if (!tools.find((x) => x.name === "set_resume_fields")) {
      tools.push(SetResumeFieldsTool);
    }
    for (const t of ALL_PORTFOLIO_TOOLS) {
      if (!tools.find((x) => x.name === t.name)) tools.push(t);
    }
    for (const t of ALL_COVERLETTER_TOOLS) {
      if (!tools.find((x) => x.name === t.name)) tools.push(t);
    }
    for (const t of ALL_INTERVIEW_TOOLS) {
      if (!tools.find((x) => x.name === t.name)) tools.push(t);
    }
    return tools;
  }

  // Default coding mode: file system tools + browser debugging tools
  // Browser tools are included for dev debugging (inspect layout, check errors, verify local server).
  // publish_article is NOT included — agent writes code to disk, not to community posts.
  return [...ALL_CODING_TOOLS, ...ALL_BROWSER_TOOLS];
}
