/**
 * start_interview tool — launches a live `cv interview` session
 * from within the agent REPL.
 *
 * The tool spawns the interview subprocess with the terminal attached
 * (stdio: "inherit") so the user gets the full interactive voice/text
 * experience without leaving the agent session.  When the interview ends
 * the agent picks up again and can discuss results, next steps, etc.
 */

import { spawn } from "child_process";
import { Tool } from "../Tool.js";
import { Type } from "@google/genai";

/** Resolve the `cv` binary that is currently running this process. */
function getCvBin(): string {
    // process.argv[1] is the entry-point JS file.
    // When installed globally via npm, `cv` is a shell wrapper that calls
    // the same binary — we can just re-use process.argv[0] (node) + argv[1].
    // But the cleanest approach is to call the same node + script directly.
    return process.argv[1]; // absolute path to dist/index.js
}

async function runInterview(args: {
    role: string;
    mode?: "voice" | "text";
    questions?: number;
    resume_id?: string;
    model?: string;
}): Promise<string> {
    return new Promise((resolve) => {
        const argv: string[] = [
            getCvBin(),
            "interview",
            "--role", args.role,
        ];

        if (args.model) {
            argv.push("--model", args.model);
        }

        if (args.mode === "text") argv.push("--text");
        if (args.questions && args.questions > 0) {
            argv.push("--questions", String(args.questions));
        }
        if (args.resume_id) argv.push("--resume", args.resume_id);

        // Clear current line + move to fresh line before the interview TUI takes over.
        // This prevents any leftover cursor text from flashing during the session.
        process.stdout.write("\r\x1b[K\n");

        // ── SIGINT isolation ─────────────────────────────────────────────────
        // When the user presses Ctrl+C during the interview:
        //   - SIGINT is sent to the whole process group (parent agent + child)
        //   - The child (cv interview) handles it: billing → feedback report → exit 0
        //   - The parent MUST ignore it, otherwise it terminates and kills the child
        //     before the report is generated and shown.
        // We suppress SIGINT on the agent for the lifetime of the subprocess and
        // restore a default handler once the child exits cleanly.
        const noop = () => {};
        process.on("SIGINT", noop);   // suppress — child handles it

        // Inherit the terminal so the full interactive TUI works.
        const child = spawn(process.execPath, argv, {
            stdio: "inherit",
            env: process.env,
        });

        const cleanup = () => {
            // Remove our suppressor so future Ctrl+C in the agent REPL works normally.
            process.removeListener("SIGINT", noop);
        };

        child.on("close", (code) => {
            cleanup();
            // code === null means killed by signal (e.g. SIGINT handled by child itself).
            // The child always does billing + report before exiting, so treat as completed.
            if (code === 0 || code === null) {
                resolve(
                    `✅ Interview session for "${args.role}" completed.\n` +
                    `The user has received their feedback report above.\n` +
                    `You may now discuss their performance, suggest areas for improvement, ` +
                    `help them prep specific STAR stories, or start another session.`
                );
            } else {
                resolve(
                    `⚠️  Interview session ended with exit code ${code}.\n` +
                    `This may mean the session was cut short before the report was generated. ` +
                    `Ask if they'd like to start another session or discuss their responses.`
                );
            }
        });

        child.on("error", (err) => {
            cleanup();
            resolve(`❌ Failed to launch interview session: ${err.message}`);
        });
    });
}

export const StartInterviewTool: Tool = {
    name: "start_interview",
    description: `Launch a live AI mock interview session for the user.

Use this tool when the user says ANYTHING like:
- "Start an interview", "practice interview", "mock interview"
- "Interview me for [role]", "prep me for [company] interview"
- "I have an interview at [company], let's practice"
- "Start a voice interview", "text interview"

⚠️  MANDATORY PRE-FLIGHT — before calling this tool, you MUST know:
1. **role** — which job role to interview for (ask if not mentioned)
2. **mode** — ALWAYS ask the user: "Voice (real-time speech, requires sox) or Text?"
   Never assume voice. Some users are on servers, don't have a mic, or prefer text.
   Only skip asking if the user already said 'voice' or 'text' in their message.
3. **questions** — optional, default 5 (no need to ask unless user wants to customize)

Example pre-flight:
  User: "Can I take an interview?"
  You:  "Sure! What role are you interviewing for, and would you prefer Voice or Text mode?"
  User: "Senior SWE, voice please."
  You:  → call start_interview(role="Senior Software Engineer", mode="voice")

HOW IT WORKS:
- Launches the full interactive \`cv interview\` session directly in the terminal.
- The user speaks (voice mode) or types (text mode) their answers to Vivid, the AI interviewer.
- At the end, a feedback report with scores and improvement tips is displayed automatically.
- You (the agent) can then discuss results, coach on weak areas, help build STAR stories, etc.

CREDIT COST: 2 credits/minute (minimum 2, capped at 60). Text mode uses ~1 credit flat.

DEFAULTS:
- mode defaults to "voice" (requires sox). Suggest "text" if user is on a server / no mic.
- questions defaults to 5.`,

    parameters: {
        type: Type.OBJECT,
        properties: {
            role: {
                type: Type.STRING,
                description: "The job role to interview for, e.g. 'Senior Software Engineer', 'Product Manager', 'Data Scientist'.",
            },
            mode: {
                type: Type.STRING,
                enum: ["voice", "text"],
                description: "Interview mode. 'voice' = real-time speech (default, requires sox). 'text' = text-only fallback.",
            },
            questions: {
                type: Type.INTEGER,
                description: "Number of interview questions to generate (1–10). Default: 5.",
            },
            resume_id: {
                type: Type.STRING,
                description: "Optional. CareerVivid resume ID to load as context. The AI will tailor questions to the user's actual background.",
            },
        },
        required: ["role"],
    },

    requiresConfirmation: false,

    execute: async (args: {
        role: string;
        mode?: "voice" | "text";
        questions?: number;
        resume_id?: string;
    }, currentModel?: string) => {
        return runInterview({ ...args, model: currentModel });
    },
};

import { FetchInterviewContextTool } from "./fetchInterviewContext.js";

export const ALL_INTERVIEW_TOOLS: Tool[] = [StartInterviewTool, FetchInterviewContextTool];
