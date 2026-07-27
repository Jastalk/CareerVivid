/**
 * fetch_interview_context tool — retrieves the user's recent CLI interview
 * sessions (transcript + feedback report) from Firestore via the
 * cliGetInterviewContext Cloud Function.
 *
 * This allows the agent to:
 *   - Review what the user actually said during a mock interview
 *   - Identify weak answers by score
 *   - Suggest STAR-method improvements for specific questions
 *   - Pick up post-interview coaching without requiring copy-paste
 */

import { Tool } from "../Tool.js";
import { Type } from "@google/genai";
import { getApiKey } from "../../config.js";

const CLI_CONTEXT_URL =
    process.env.CV_FUNCTIONS_URL
        ? `${process.env.CV_FUNCTIONS_URL}/cliGetInterviewContext`
        : "https://us-west1-jastalk-firebase.cloudfunctions.net/cliGetInterviewContext";

/** Cap per session to avoid bloating the agent's context window */
const MAX_TRANSCRIPT_ENTRIES = 40;

async function fetchInterviewContext(args: { limit?: number }): Promise<string> {
    const apiKey = getApiKey();
    if (!apiKey) {
        return "❌ Not logged in. Run `cv login` first to access your interview history.";
    }

    try {
        const res = await fetch(CLI_CONTEXT_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ apiKey, limit: args.limit ?? 3 }),
        });

        if (res.status === 401) {
            return "❌ API key invalid or expired. Run `cv login` to re-authenticate.";
        }
        if (!res.ok) {
            return `⚠️  Could not retrieve interview history (HTTP ${res.status}). Try again shortly.`;
        }

        const data = await res.json() as { sessions: any[] };
        const sessions = data.sessions ?? [];

        if (sessions.length === 0) {
            return "No recent interview sessions found. Run `cv interview` or start one via `cv agent` to build your history.";
        }

        // Build a compact, agent-readable context string
        const parts: string[] = [];
        parts.push(`📋 Found ${sessions.length} recent interview session(s):\n`);

        for (let i = 0; i < sessions.length; i++) {
            const s = sessions[i];
            const date = s.startedAt ? new Date(s.startedAt).toLocaleString() : "Unknown date";
            const duration = s.durationMinutes != null ? `${s.durationMinutes} min` : "N/A";

            parts.push(`─── Session ${i + 1}: ${s.role} (${date}, ${duration}) ───`);

            // Feedback scores
            if (s.feedbackReport) {
                const r = s.feedbackReport;
                parts.push(`Scores: Overall ${r.overallScore}/100 · Communication ${r.communicationScore}/100 · Confidence ${r.confidenceScore}/100 · Relevance ${r.relevanceScore}/100`);
                parts.push(`Strengths: ${r.strengths}`);
                parts.push(`Areas for improvement: ${r.areasForImprovement}`);
            } else {
                parts.push("(No feedback report available for this session)");
            }

            // Transcript (capped)
            const entries: any[] = s.transcript ?? [];
            if (entries.length > 0) {
                parts.push("\nTranscript:");
                const capped = entries.slice(0, MAX_TRANSCRIPT_ENTRIES);
                for (const e of capped) {
                    const speaker = e.speaker === "ai" ? "Interviewer" : "Candidate";
                    parts.push(`  ${speaker}: ${e.text}`);
                }
                if (entries.length > MAX_TRANSCRIPT_ENTRIES) {
                    parts.push(`  ... (${entries.length - MAX_TRANSCRIPT_ENTRIES} more turns not shown)`);
                }
            } else {
                parts.push("(Transcript not yet available for this session — it may still be saving)");
            }

            parts.push("");
        }

        return parts.join("\n");
    } catch (err: any) {
        return `⚠️  Error fetching interview context: ${err.message}`;
    }
}

export const FetchInterviewContextTool: Tool = {
    name: "fetch_interview_context",
    description: `Retrieves the user's recent mock interview sessions from the database, including the full transcript and AI feedback scores.

Use this tool when the user:
- Asks to "improve my answers", "review my interview", "how did I do?"
- Says anything about their last/recent interview performance
- Wants coaching, STAR-method help, or answer refinement after an interview
- Asks what specific questions they were asked or what they said

RETURNS:
- Scores (overall, communication, confidence, relevance) for each session
- Strengths and areas for improvement
- Full transcript of interviewer questions and candidate answers (capped to 40 turns)

After fetching context, provide targeted, STAR-method coaching based on the actual answers given.
Default: retrieves the 3 most recent sessions.`,

    parameters: {
        type: Type.OBJECT,
        properties: {
            limit: {
                type: Type.INTEGER,
                description: "Number of recent sessions to fetch (1–10). Default: 3.",
            },
        },
        required: [],
    },

    requiresConfirmation: false,

    execute: async (args: { limit?: number }) => {
        return fetchInterviewContext(args);
    },
};
