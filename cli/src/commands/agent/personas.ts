/**
 * personas.ts — Extensible Persona Registry for cv agent
 *
 * Each persona defines:
 *   - id:             unique key (matches the CLI flag name)
 *   - label:          human-readable name shown in the banner
 *   - menuItems:      first-turn autocomplete menu entries
 *   - pickUpPrompt:   the system message injected when the user chooses
 *                     "Pick up where we left off" — workspace-aware, not job-aware
 *   - contextGather:  async function returning a markdown context snapshot
 *                     of the current environment relevant to this persona
 *
 * ── Adding a new persona ──────────────────────────────────────────────────────
 * 1. Add a new PersonaDefinition entry in PERSONAS below.
 * 2. Register the matching --flag in index.ts (one line).
 * 3. Done. The menu, context, and system prompt routing all work automatically.
 */

import { execSync } from "child_process";
import { existsSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { loadCodingSession } from "../../agent/memory.js";

export interface PersonaDefinition {
  id: string;
  label: string;
  /** Displayed in the first-turn autocomplete menu */
  menuItems: string[];
  /**
   * Optional per-item prompt overrides.
   * Key = exact menu item string. Value = the prompt sent to the agent.
   * Items without an entry get the default emoji-stripped text.
   */
  menuPrompts?: Record<string, string>;
  /** Used as the agent prompt when "Pick up where we left off" is selected */
  pickUpPrompt: string;
  /** Gathers live workspace context for the pick-up prompt */
  contextGather: () => Promise<string>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared context helpers
// ─────────────────────────────────────────────────────────────────────────────

function tryExec(cmd: string): string {
  try {
    return execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "";
  }
}

function getRecentlyModifiedFiles(dir: string, maxFiles = 8): string[] {
  const results: { path: string; mtime: number }[] = [];

  function walk(current: string, depth = 0) {
    if (depth > 3) return;
    let entries: string[];
    try {
      entries = readdirSync(current);
    } catch {
      return;
    }
    for (const name of entries) {
      if (name.startsWith(".") || name === "node_modules" || name === "__pycache__" || name === ".git") continue;
      const full = join(current, name);
      try {
        const st = statSync(full);
        if (st.isDirectory()) {
          walk(full, depth + 1);
        } else if (/\.(ts|tsx|js|jsx|py|go|rs|java|cs|cpp|c|md|json|yaml|yml|sh|toml)$/.test(name)) {
          results.push({ path: full.replace(dir + "/", ""), mtime: st.mtimeMs });
        }
      } catch {
        // skip
      }
    }
  }

  walk(dir);
  return results
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, maxFiles)
    .map((f) => f.path);
}

// ─────────────────────────────────────────────────────────────────────────────
// Coding Persona
// ─────────────────────────────────────────────────────────────────────────────

async function gatherCodingContext(): Promise<string> {
  const cwd = process.cwd();
  const lines: string[] = [];

  // Git branch + last commit
  const branch = tryExec("git branch --show-current");
  const lastCommit = tryExec("git log --oneline -1");
  const gitStatus = tryExec("git status --short").split("\n").slice(0, 10).join("\n");

  if (branch) lines.push(`**Git branch:** \`${branch}\``);
  if (lastCommit) lines.push(`**Last commit:** ${lastCommit}`);
  if (gitStatus) lines.push(`**Uncommitted changes:**\n\`\`\`\n${gitStatus}\n\`\`\``);

  // Recent files
  const recentFiles = getRecentlyModifiedFiles(cwd);
  if (recentFiles.length > 0) {
    lines.push(`**Recently modified files:**\n${recentFiles.map((f) => `  • \`${f}\``).join("\n")}`);
  }

  // Package.json / pyproject.toml project name
  const pkgPath = join(cwd, "package.json");
  const pyPath = join(cwd, "pyproject.toml");
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(require("fs").readFileSync(pkgPath, "utf-8"));
      lines.push(`**Project:** ${pkg.name ?? "unknown"} v${pkg.version ?? "?"} (Node.js)`);
    } catch { /* ok */ }
  } else if (existsSync(pyPath)) {
    const name = tryExec("grep '^name' pyproject.toml | head -1");
    if (name) lines.push(`**Project (Python):** ${name}`);
  }

  return lines.length > 0 ? lines.join("\n") : "No git repo or recognised project found in current directory.";
}

const CODING_PERSONA: PersonaDefinition = {
  id: "coding",
  label: "Coding",
  menuItems: [
    "🔍 Analyze the current codebase or a specific file",
    "🛠️  Debug an error or failing test",
    "🏗️  Scaffold a new feature or module into an existing project",
    "🔄 Refactor or optimize existing code",
    "📖 Explain how a piece of code works",
    "🧪 Write or improve tests",
    "🆕 Create a brand-new project or app in a new folder",
    "🌐 Debug or test in the browser",
    "🗓️  Pick up where we left off",
  ],

  menuPrompts: {
    "🔍 Analyze the current codebase or a specific file": [
      `The user wants to analyze their codebase. Current working directory: \`${process.cwd()}\`.`,
      `1. Run get_file_tree on the current directory to show the project structure.`,
      `2. Ask the user: "Which file or directory would you like me to analyze? Or should I give you an overview of the whole project?"`,
      `3. Wait for their answer before reading any files.`,
    ].join("\n"),

    "🛠️  Debug an error or failing test": [
      `The user wants to debug an error or failing test. Current working directory: \`${process.cwd()}\`.`,
      `1. Ask the user: "Please paste the full error message or test output, and tell me which file it's coming from."`,
      `2. Once you have the error, read the relevant file(s) and identify the root cause.`,
      `3. Apply a targeted fix with patch_file. Verify with run_command (e.g., npm test or tsc --noEmit).`,
    ].join("\n"),

    "🏗️  Scaffold a new feature or module into an existing project": [
      `The user wants to scaffold a feature or module into their EXISTING project. Current working directory: \`${process.cwd()}\`.`,
      ``,
      `Before writing ANY files, ask the user these two questions in a single message:`,
      `1. "What feature or module would you like to add?" — e.g., authentication, API route, React component, database model`,
      `2. "Which directory should I add it to?" — e.g., src/components, src/api, lib/`,
      ``,
      `Do NOT write any files until you have both answers.`,
      `Once you have the answers: read the relevant existing files first → Plan → write_file/patch_file → run_command to verify → Report all changed paths.`,
    ].join("\n"),

    "🆕 Create a brand-new project or app in a new folder": [
      `The user wants to create a BRAND-NEW standalone project in a new folder. Current working directory: \`${process.cwd()}\`.`,
      ``,
      `Ask the user ONE message with these two questions:`,
      `1. "What would you like to build?"`,
      `   Give them examples to spark ideas:`,
      `   • A modern HTML/CSS/JS dashboard visualising my CareerVivid job pipeline`,
      `   • A React + Vite app with TypeScript`,
      `   • A FastAPI Python REST API`,
      `   • A Next.js full-stack app`,
      `   • A Node.js CLI tool`,
      `   • A static landing page`,
      `   • Or describe anything else`,
      `2. "What should the folder be called?" (e.g., job-dashboard, my-api, cool-app)`,
      ``,
      `Do NOT create any files or run any commands until you have both answers.`,
      ``,
      `Once you have the answers, follow this execution loop:`,
      `  a. Plan: list every file you will create with a one-line description of each`,
      `  b. Create the folder and write EVERY file using write_file`,
      `     — For HTML/CSS/JS projects: write index.html, style.css, app.js (and any sub-files) with REAL, complete, production-quality code — NO placeholders`,
      `     — For Node/Python projects: write package.json/pyproject.toml, README.md, and all source files`,
      `     — For React/Next/Vite apps: write all config files AND source components`,
      `  c. Run run_command to verify (e.g., \`tsc --noEmit\`, \`python -m py_compile\`, or \`open index.html\`)`,
      `  d. Report: list every file created with its absolute path so the user can open them immediately`,
      ``,
      `Special case — Job Pipeline Dashboard:`,
      `If the user asks for a dashboard based on their job application pipeline or CareerVivid data:`,
      `  1. Run run_command with \`cat ~/career-vivid/jobs.csv\` to read their real job data`,
      `  2. Parse the CSV and embed the actual data as a JavaScript array in the dashboard`,
      `  3. Build a beautiful, modern HTML/CSS/JS single-file dashboard with:`,
      `     — Kanban-style status columns (To Apply / Applied / Interview / Offer / Rejected)`,
      `     — Cards for each job showing company, role, status, excitement score`,
      `     — Summary stats bar (total jobs, applied %, top companies)`,
      `     — A color-coded priority chart`,
      `     — Responsive design that works on mobile`,
      `  4. Write it to \`job-dashboard/index.html\` as a self-contained file (inline CSS + JS)`,
      `  5. Run \`open job-dashboard/index.html\` so the user sees it immediately in their browser`,
    ].join("\n"),

    "🔄 Refactor or optimize existing code": [
      `The user wants to refactor or optimize code. Current working directory: \`${process.cwd()}\`.`,
      `1. Ask: "Which file or function would you like me to refactor? What's the goal — performance, readability, type safety, or something else?"`,
      `2. Wait for their answer. Then read the file, propose a brief Plan, and apply changes with patch_file.`,
    ].join("\n"),

    "📖 Explain how a piece of code works": [
      `The user wants an explanation of some code. Current working directory: \`${process.cwd()}\`.`,
      `Ask: "Which file, function, or class would you like me to explain?"`,
      `Once they answer, read the file and give a clear, structured explanation.`,
    ].join("\n"),

    "🧪 Write or improve tests": [
      `The user wants to write or improve tests. Current working directory: \`${process.cwd()}\`.`,
      `1. Ask: "Which file or function should I write tests for? And do you want unit tests, integration tests, or browser-based E2E tests?"`,
      `2. Once they answer:`,
      `   • For unit/integration tests: read the source file, detect the test framework (check package.json), write test files to disk with write_file, run with run_command.`,
      `   • For browser E2E tests: use browser_navigate to open the app, browser_state to inspect, browser_click/browser_type to simulate user actions, browser_screenshot to verify results.`,
      `3. Report all test files created and test results.`,
    ].join("\n"),

    "🌐 Debug or test in the browser": [
      `The user wants to debug a visual/runtime issue OR test a feature directly in the browser. Current working directory: \`${process.cwd()}\`.`,
      ``,
      `First, ask ONE clarifying question: "What would you like to do?"`,
      `Give these options:`,
      `  • Debug a visual or layout bug in my running app`,
      `  • Debug a JavaScript runtime error`,
      `  • Smoke test / manually test a feature in the browser`,
      `  • Run a browser-based E2E test on my app`,
      `  • Verify my generated HTML/CSS/JS file looks correct`,
      ``,
      `Once you know what they want, follow the browser debug/test loop:`,
      `1. Ask for the URL if not provided (e.g., http://localhost:3000 or a file path like ./index.html)`,
      `2. Call browser_navigate(url) to open it`,
      `3. Call browser_state() to get the page structure`,
      `4. Call browser_screenshot() to visually inspect the page`,
      `5. For debugging: identify the root cause, patch_file to fix it, browser_navigate to reload and verify`,
      `6. For testing: browser_click / browser_type to simulate user interactions, browser_screenshot to confirm the expected result`,
      `7. Report what was found and fixed/verified`,
      ``,
      `If the user's dev server is not running, offer to start it: run_command with \`npm run dev\` or equivalent.`,
    ].join("\n"),
  },

  pickUpPrompt: (() => {
    // Read the coding session file synchronously — this is O(1), no tool calls.
    const last = loadCodingSession();

    if (last) {
      const fileList = last.filesChanged.length > 0
        ? `Files changed last session:\n${last.filesChanged.slice(0, 10).map(f => `  • \`${f}\``).join("\n")}`
        : "";
      return [
        `## Resuming Last Coding Session`,
        ``,
        `Here is the context from the last coding session (read from local memory — no tool calls needed):`,
        ``,
        `- **Directory:** \`${last.cwd}\``,
        `- **Git branch:** ${last.branch || "(no git repo)"}`,
        `- **Last built:** ${last.lastBuilt || "(unknown)"}`,
        `- **Session saved:** ${new Date(last.savedAt).toLocaleString()}`,
        ``,
        `**What happened last time:**`,
        last.summary,
        ``,
        fileList,
        ``,
        `The current working directory is now: \`${process.cwd()}\``,
        ``,
        `Greet the user with a ONE-LINE recap of what was worked on last time and ask what they want to continue or start next.`,
        `Do NOT run any git commands or scan the filesystem — you already have the context above.`,
        `Only call tools if the user asks for something new.`,
      ].filter(Boolean).join("\n");
    }

    // No previous session — do a lightweight orientation
    return [
      `No previous coding session found in memory.`,
      `Current working directory: \`${process.cwd()}\`.`,
      ``,
      `Ask the user: "What would you like to work on today?" — give them the menu options as a reminder.`,
      `Do NOT run any commands or scan files until they answer.`,
    ].join("\n");
  })(),

  contextGather: gatherCodingContext,
};

// ─────────────────────────────────────────────────────────────────────────────
// Jobs Persona (default)
// ─────────────────────────────────────────────────────────────────────────────

const JOBS_PERSONA: PersonaDefinition = {
  id: "jobs",
  label: "Jobs & Applications",
  menuItems: [
    "📄 View or update my resume",
    "🔍 Search for job opportunities",
    "📊 Check my job pipeline / tracker",
    "✉️  Draft a cover letter or tailor my resume",
    "🎙  Start an AI mock interview (voice or text)",
    "📈 Get an overview of my job search progress",
    "🗓️  Pick up where we left off",
  ],
  pickUpPrompt:
    "The user wants to pick up their last job-search session. Check their resume list (cv tracker resume list), review their job tracker pipeline (cv tracker list), and provide a concise overview of where they left off. Suggest the most impactful next action.",
  contextGather: async () => "",
};

// ─────────────────────────────────────────────────────────────────────────────
// Resume Persona
// ─────────────────────────────────────────────────────────────────────────────

const RESUME_PERSONA: PersonaDefinition = {
  id: "resume",
  label: "Resume Builder",
  menuItems: [
    "📄 View or load my current resume",
    "✏️  Update a section of my resume",
    "🎯 Tailor my resume for a specific job",
    "🔗 Sync resume to my portfolio",
    "💡 Get suggestions to improve my resume",
    "🗓️  Pick up where we left off",
  ],
  pickUpPrompt:
    "The user wants to pick up their last resume session. List their resumes with get_resume or list_resumes, identify the most recently updated one, and summarise what was last worked on. Suggest the next improvement.",
  contextGather: async () => "",
};

// ─────────────────────────────────────────────────────────────────────────────
// Persona registry
// ─────────────────────────────────────────────────────────────────────────────

const PERSONA_MAP: Record<string, PersonaDefinition> = {
  coding: CODING_PERSONA,
  jobs:   JOBS_PERSONA,
  resume: RESUME_PERSONA,
  // Future:
  // ceo:       CEO_PERSONA,
  // finance:   FINANCE_PERSONA,
  // marketing: MARKETING_PERSONA,
};

/**
 * Resolve the active PersonaDefinition from the CLI options object.
 * Falls back to the jobs persona.
 */
export function resolvePersona(options: Record<string, any>): PersonaDefinition {
  for (const key of Object.keys(PERSONA_MAP)) {
    if (options[key]) return PERSONA_MAP[key];
  }
  return JOBS_PERSONA;
}

/** All registered personas — useful for dynamic --help generation. */
export const ALL_PERSONAS = Object.values(PERSONA_MAP);
