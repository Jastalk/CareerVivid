/**
 * cv job-agent — A conversational AI agent for job hunting.
 *
 * Uses the CareerVivid resume + Gemini to autonomously search for jobs,
 * score them, save matches to the Kanban tracker, and update statuses
 * through natural language conversation.
 *
 * Usage:
 *   cv job-agent                        Start in conversational mode
 *   cv job-agent --role "SWE"           Pre-seed a search role
 *   cv job-agent --pro                  Use gemini-3.1-pro for deeper reasoning
 */

import { Command } from "commander";
import chalk from "chalk";
import pkg from "enquirer";
import { getGeminiKey, setConfigValue } from "../config.js";
import { QueryEngine } from "../agent/QueryEngine.js";
import { ALL_JOB_TOOLS } from "../agent/tools/jobs.js";

const { prompt } = pkg;

// ---------------------------------------------------------------------------
// Job Agent System Prompt
// ---------------------------------------------------------------------------

export const JOB_AGENT_SYSTEM_PROMPT = `
You are a proactive, friendly AI career coach and job-hunting agent for CareerVivid.
Your job is to help the user find their dream role by searching for jobs, scoring them against their resume, and managing their application pipeline.

## Your Personality
- Encouraging and direct: give concrete advice, not vague platitudes.
- Proactive: when the user says "find me jobs", don't just list results — summarize the best options, highlight missing skills, and ask if they want to save the top ones.
- Memory: you have a full conversation history, so refer back to what you already know about the user.

## Core Capabilities (tools you have)

1. **get_resume** — Load the user's CareerVivid resume to understand their background. Always call this first if the user hasn't described their experience yet.
2. **search_jobs** — Search for jobs using the user's role and location. Results are automatically scored against their resume.
3. **save_job** — Save a job to the user's Kanban board at /job-tracker. Do this when they want to track an opportunity.
4. **list_jobs** — Show what's currently in their job tracker, optionally filtered by status.
5. **update_job_status** — Move a job between pipeline stages: To Apply → Applied → Interviewing → Offered (or Rejected).

## Workflow for Job Searches

When a user asks to find jobs:
1. First, if you don't have their resume, call **get_resume** to understand their background.
2. Call **search_jobs** with their desired role and any location preference.
3. Summarize the TOP 3-5 most relevant results: role, company, score, and why they're a good fit.
4. Mention any skill gaps shown in **missingSkills** and give a quick tip on how to address them.
5. Ask if they'd like to save any of these to their tracker.
6. If yes, call **save_job** for each one they confirm.

## Workflow for Status Updates

When a user says things like:
- "I got an interview at Google" → find that job in list_jobs, then call update_job_status with "Interviewing"
- "Google rejected me" → update to "Rejected", offer encouragement and suggest next steps
- "I got an offer!" → update to "Offered", celebrate with them, ask about their decision timeline

## Rules
- Never hallucinate job listings — always use search_jobs to get real results.
- Never update a status without knowing the specific job_id — use list_jobs first if needed.
- Be concise. Don't repeat the full job description unless asked.
- When showing job IDs, keep them for reference but don't make the conversation feel robotic.

## URL Verification — CRITICAL HARNESS RULE

You must NEVER present a job URL to the user without first verifying it.
Think like a user clicking the link: a broken link is worse than no link.

Before showing any job application URL to the user:
1. Call **verify_url** on each URL you plan to share.
2. If verify_url returns ❌, do NOT show that URL. Instead say: "I couldn't confirm the application link — please search for this role directly on [Company]'s careers page."
3. After **search_jobs** returns multiple results, call **verify_search_results** with all the URLs before presenting them.
4. Only show URLs that pass verification.
5. If a URL looks like it was made up (unknown company domain, no ATS path), be extra suspicious — call verify_url before mentioning it.

This rule exists because AI models can hallucinate plausible-sounding URLs that do not exist.
The user's time is valuable — never send them to a broken page.
`.trim();

// ---------------------------------------------------------------------------
// Register command
// ---------------------------------------------------------------------------

export function registerJobAgentCommand(program: Command) {
  program
    .command("job-agent")
    .description(
      "Start a conversational AI agent that hunts for jobs, tracks applications, and coaches you through your search."
    )
    .option("--role <role>", "Pre-seed with a job role to search immediately (e.g. 'Software Engineer')")
    .option("--location <location>", "Preferred job location (e.g. 'San Francisco, CA' or 'Remote')")
    .option(
      "--model <model>",
      "Model to use: 'flash' (gemini-3-flash-preview) or 'pro' (gemini-3.1-pro-preview). Default: flash.",
      "flash"
    )
    .option("--verbose", "Show AI thinking tokens (requires --model pro).")
    .action(async (options) => {
      // ── Credentials ────────────────────────────────────────────────────────
      let apiKey = getGeminiKey();

      const MODEL_MAP: Record<string, string> = {
        flash: "gemini-3-flash-preview",
        pro: "gemini-3.1-pro-preview",
      };
      const modelChoice = (options.model as string) ?? "flash";
      const selectedModel = MODEL_MAP[modelChoice] ?? "gemini-3-flash-preview";
      const thinkingBudget = modelChoice === "pro" ? 8192 : 0;

      // Prompt for API key if missing
      if (!apiKey) {
        console.log(chalk.yellow("\n🔑 The Job Agent requires a Gemini API key."));
        console.log(chalk.dim("  Get a free key at: https://aistudio.google.com/app/apikey\n"));

        const keyAnswer = await prompt<{ key: string }>({
          type: "password",
          name: "key",
          message: "Enter your Gemini API key:",
        });

        const enteredKey = (keyAnswer as any).key?.trim();
        if (!enteredKey) {
          console.log(chalk.red("\n❌ No API key provided. Exiting."));
          process.exit(1);
        }

        setConfigValue("geminiKey", enteredKey);
        apiKey = enteredKey;
        console.log(chalk.green("  ✔ API key saved to ~/.careervividrc.json\n"));
      }

      // ── Engine setup ───────────────────────────────────────────────────────
      const engine = new QueryEngine({
        apiKey,
        model: selectedModel,
        systemInstruction: JOB_AGENT_SYSTEM_PROMPT,
        tools: ALL_JOB_TOOLS,
        thinkingBudget,
        includeThoughts: Boolean(options.verbose),
        maxHistoryLength: 60,
      });

      // ── Banner ─────────────────────────────────────────────────────────────
      console.log(chalk.bold.cyan("\n💼 CareerVivid Job Agent"));
      console.log(chalk.gray("  Your AI-powered job hunt partner\n"));
      console.log(chalk.dim("  Tools available:"));
      console.log(chalk.dim("  • search_jobs — find scored job matches from your resume"));
      console.log(chalk.dim("  • save_job    — add jobs to your /job-tracker Kanban board"));
      console.log(chalk.dim("  • list_jobs   — view your current application pipeline"));
      console.log(chalk.dim("  • update_job_status — move jobs between pipeline stages"));
      console.log(chalk.dim("  • get_resume  — load your CareerVivid resume\n"));
      if (modelChoice === "pro") {
        console.log(chalk.magenta(`  ✔ Pro mode: ${selectedModel} + thinking\n`));
      }
      console.log(chalk.gray(`  Model: ${selectedModel}`));
      console.log(chalk.gray(`  Type 'exit' to quit.\n`));
      console.log(chalk.dim("─".repeat(60)));

      // ── Auto-search if --role is provided ─────────────────────────────────
      let firstMessage = "";
      if (options.role) {
        const loc = options.location ? ` in ${options.location}` : "";
        firstMessage = `Find me ${options.role} jobs${loc}. Start by loading my resume, then search for the best matches.`;
        console.log(chalk.bold.cyan("❯") + " " + chalk.white(firstMessage));
      } else {
        // Greet the user
        firstMessage =
          "Hello! I'm your CareerVivid Job Agent. Load my resume and give me a quick summary " +
          "of my background, then ask me what kind of role I'm looking for.";

        // Print a welcome prompt instead
        console.log(
          chalk.cyan(
            "\nHi! I can help you:\n" +
            "  • Find jobs that match your resume\n" +
            "  • Save the best ones to your tracker\n" +
            "  • Update your application status as you progress\n\n" +
            "Try asking: \"Find me remote SWE jobs\" or \"What's in my job tracker?\"\n"
          )
        );
      }

      // ── REPL ───────────────────────────────────────────────────────────────
      const REPL_HOOKS = {
        onChunk: (text: string) => {
          process.stdout.write(chalk.green(text));
        },
        onThinking: (thought: string) => {
          if (options.verbose) {
            console.log(chalk.dim(`\n[thinking] ${thought.substring(0, 200)}...`));
          }
        },
        onToolCall: async (name: string, args: any) => {
          const toolEmoji: Record<string, string> = {
            search_jobs: "🔍",
            save_job: "💾",
            list_jobs: "📋",
            update_job_status: "🔄",
            get_resume: "📄",
          };
          const emoji = toolEmoji[name] || "🛠️";
          const argSummary = buildToolArgSummary(name, args);
          console.log(chalk.yellow(`\n${emoji}  ${chalk.bold(name)}: ${argSummary}`));
          return true; // auto-approve all job tools
        },
        onToolResult: (name: string, result: any) => {
          const preview =
            typeof result === "string"
              ? result.substring(0, 180)
              : JSON.stringify(result).substring(0, 180);
          console.log(chalk.dim(`   ✅ ${preview}${preview.length >= 180 ? "…" : ""}\n`));
        },
        onCompacting: () => {
          console.log(chalk.dim("\n📦 Compacting conversation history...\n"));
        },
        onError: (error: Error) => {
          console.log(chalk.red(`\n❌ Error: ${error.message}\n`));
        },
      };

      // Run the first message silently (greeting or auto-search)
      if (options.role) {
        process.stdout.write(chalk.dim("\n⏳ Searching...\n\n"));
        let firstChunk = true;
        await engine.runLoopStreaming(firstMessage, {
          ...REPL_HOOKS,
          onChunk: (text) => {
            if (firstChunk) {
              process.stdout.write("\r\x1b[K");
              firstChunk = false;
            }
            process.stdout.write(chalk.green(text));
          },
        });
        console.log("\n");
      }

      // ── Interactive loop ────────────────────────────────────────────────────
      const ask = async () => {
        try {
          const response = await prompt<{ query: string }>({
            type: "input",
            name: "query",
            message: chalk.bold.cyan("❯"),
          });

          const userInput = (response as any).query?.trim();
          if (!userInput) return ask();
          if (userInput.toLowerCase() === "exit") {
            console.log(chalk.gray("\nGood luck with your job hunt! 🚀\n"));
            process.exit(0);
          }

          process.stdout.write(chalk.dim("\n⏳ Thinking...\n\n"));

          let firstChunk = true;
          await engine.runLoopStreaming(userInput, {
            ...REPL_HOOKS,
            onChunk: (text) => {
              if (firstChunk) {
                process.stdout.write("\r\x1b[K");
                firstChunk = false;
              }
              process.stdout.write(chalk.green(text));
            },
          });

          console.log("\n");
          ask();
        } catch (err: any) {
          if (err.message === "" || err.message === "canceled") {
            process.exit(0);
          }
          console.error(chalk.red(String(err)));
          ask();
        }
      };

      await ask();
    });
}

// ---------------------------------------------------------------------------
// Helper: human-readable tool arg summaries
// ---------------------------------------------------------------------------

function buildToolArgSummary(name: string, args: any): string {
  switch (name) {
    case "search_jobs":
      return `"${args.role}"${args.location ? ` in ${args.location}` : ""}${args.count ? ` (top ${args.count})` : ""}`;
    case "save_job":
      return `"${args.job_title}" @ ${args.company_name}`;
    case "list_jobs":
      return args.status ? `status="${args.status}"` : "all statuses";
    case "update_job_status":
      return `job ${args.job_id} → "${args.new_status}"`;
    case "get_resume":
      return args.resume_id ? `resume ID: ${args.resume_id}` : "latest resume";
    default:
      return JSON.stringify(args).substring(0, 80);
  }
}
