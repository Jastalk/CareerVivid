/**
 * cv interview — interactive AI mock interview with real-time voice audio.
 *
 * Usage:
 *   cv interview                          Prompt for role interactively (voice mode)
 *   cv interview --role "Sr SWE"          Specify role directly (voice mode)
 *   cv interview --role "PM" --text       Text-only fallback (no audio required)
 *   cv interview --role "SDE" --resume <id>  Load resume for context
 *
 * Voice mode requires sox (handles both mic input and speaker output):
 *   macOS:  brew install sox
 *   Linux:  sudo apt install sox
 *
 * AI calls:
 *   - Token vend: cliGetInterviewToken Cloud Function (validates cv_live_ key, deducts credits)
 *   - Voice session: gemini-3.1-flash-live-preview via @google/genai Live API (direct WebSocket)
 *   - Feedback: agentProxy Cloud Function (standard HTTP, existing pattern)
 */

import { Command } from "commander";
import { randomUUID } from "node:crypto";
import chalk from "chalk";
import readline from "readline";
import ora from "ora";
import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Modality } from "@google/genai";
import { OAuth2Client } from "google-auth-library";
import { getApiKey } from "../config.js";
import { isApiError, resumeGet } from "../api.js";
import { createLogger, type CVLogger } from "../lib/logger.js";

/** Read CLI version from package.json (ESM-compatible) */
const __dirname_iv = dirname(fileURLToPath(import.meta.url));
let _cliVersion = "unknown";
try { _cliVersion = JSON.parse(readFileSync(join(__dirname_iv, "../../package.json"), "utf-8")).version ?? "unknown"; } catch { /* ignore */ }
const CLI_VERSION = _cliVersion;

/** Strip ANSI escape codes for accurate string length measurement */
const stripAnsi = (s: string) => s.replace(/\x1B\[[0-9;]*m/g, "");

// ─── Constants ────────────────────────────────────────────────────────────────

const AGENT_PROXY_URL =
    process.env.CV_FUNCTIONS_URL
        ? `${process.env.CV_FUNCTIONS_URL}/agentProxy`
        : "https://us-west1-jastalk-firebase.cloudfunctions.net/agentProxy";

const CLI_TOKEN_URL =
    process.env.CV_FUNCTIONS_URL
        ? `${process.env.CV_FUNCTIONS_URL}/cliGetInterviewToken`
        : "https://us-west1-jastalk-firebase.cloudfunctions.net/cliGetInterviewToken";

const CLI_BILL_URL =
    process.env.CV_FUNCTIONS_URL
        ? `${process.env.CV_FUNCTIONS_URL}/cliInterviewBill`
        : "https://us-west1-jastalk-firebase.cloudfunctions.net/cliInterviewBill";

const CLI_CONTEXT_URL =
    process.env.CV_FUNCTIONS_URL
        ? `${process.env.CV_FUNCTIONS_URL}/cliGetInterviewContext`
        : "https://us-west1-jastalk-firebase.cloudfunctions.net/cliGetInterviewContext";

const LIVE_MODEL = "gemini-live-2.5-flash-native-audio";
const FEEDBACK_MODEL = "gemini-2.5-flash";
const END_TOKEN = "<END_INTERVIEW>";
const WRAP_WIDTH = 80;

// Audio constants (matching tts.py)
const SEND_SAMPLE_RATE = 16000;   // mic → Gemini (16kHz PCM)
const RECV_SAMPLE_RATE = 24000;   // Gemini → speaker (24kHz PCM)
const CHUNK_MS = 100;             // send audio in 100ms chunks

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Message {
    role: "user" | "model";
    parts: { text: string }[];
}

interface TranscriptEntry {
    speaker: "ai" | "user";
    text: string;
}

interface FeedbackReport {
    overallScore: number;
    communicationScore: number;
    confidenceScore: number;
    relevanceScore: number;
    strengths: string;
    areasForImprovement: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function wordWrap(text: string, width = WRAP_WIDTH): string {
    const lines: string[] = [];
    for (const paragraph of text.split("\n")) {
        const words = paragraph.split(" ");
        let current = "";
        for (const word of words) {
            if (stripAnsi(current + " " + word).length > width && current.length > 0) {
                lines.push(current);
                current = word;
            } else {
                current = current.length === 0 ? word : current + " " + word;
            }
        }
        if (current.length > 0) lines.push(current);
        if (paragraph === "") lines.push("");
    }
    return lines.join("\n");
}

function printAI(text: string) {
    const clean = text.replace(END_TOKEN, "").trim();
    if (!clean) return;
    console.log("");
    console.log(chalk.cyan.bold("  Vivid ❯"));
    wordWrap(clean).split("\n").forEach(l => console.log(`  ${chalk.cyan(l)}`));
    console.log("");
}

function printUser(text: string) {
    if (!text.trim()) return;
    console.log(chalk.dim("\n  [You said] ") + chalk.white(text.trim()));
}

function printSystem(msg: string) {
    console.log(chalk.dim(`\n  ${msg}\n`));
}

function printBanner(role: string, mode: "voice" | "text") {
    const modeLabel = mode === "voice"
        ? chalk.green("🎙  Voice Mode")
        : chalk.yellow("⌨  Text Mode");
    console.log("\n" + chalk.bold.bgHex("#4f46e5").white("  CareerVivid — Interview Studio  "));
    console.log(chalk.dim(`  Role: ${role}`));
    console.log(chalk.dim(`  ${modeLabel}`));
    console.log(chalk.dim("  ─────────────────────────────────────────────────"));
    if (mode === "voice") {
        console.log(chalk.dim("  Speak your answers naturally."));
        console.log(chalk.dim("  Press Ctrl+C to end and generate your feedback report."));
    } else {
        console.log(chalk.dim(`  Type your answers. Type ${chalk.white("exit")} or press Ctrl+C to end.`));
    }
    console.log("");
}

function printReport(report: FeedbackReport) {
    const header = chalk.bgHex("#4f46e5").white.bold;
    console.log("\n" + header("  ═══════════════════════════════════════  "));
    console.log(header("      📋  Interview Feedback Report         "));
    console.log(header("  ═══════════════════════════════════════  ") + "\n");

    const score = (val: number) => {
        const color = val >= 80 ? chalk.green : val >= 60 ? chalk.yellow : chalk.red;
        return color.bold(`${val}/100`);
    };

    console.log(chalk.bold("  Scores"));
    console.log(`    Overall          ${score(report.overallScore)}`);
    console.log(`    Communication    ${score(report.communicationScore)}`);
    console.log(`    Confidence       ${score(report.confidenceScore)}`);
    console.log(`    Relevance        ${score(report.relevanceScore)}`);

    console.log("\n" + chalk.green.bold("  ✅ Strengths"));
    wordWrap(report.strengths, 72).split("\n").forEach(l => console.log(`     ${chalk.green(l)}`));

    console.log("\n" + chalk.yellow.bold("  💡 Areas for Improvement"));
    wordWrap(report.areasForImprovement, 72).split("\n").forEach(l => console.log(`     ${chalk.yellow(l)}`));

    console.log("\n" + chalk.dim("  ─────────────────────────────────────────────────────────────"));
    console.log(chalk.dim("  View full history at: https://careervivid.app/interview-studio"));
    console.log("");
}

// ─── sox audio check ──────────────────────────────────────────────────────────

/** Check if sox is available on PATH. Returns its path or null. */
async function findSox(): Promise<string | null> {
    const candidates = [
        "/opt/homebrew/bin/sox", // Apple Silicon brew
        "/usr/local/bin/sox",    // Intel brew
        "/usr/bin/sox",          // Linux
        "sox",                   // if on $PATH
    ];
    for (const p of candidates) {
        try {
            await new Promise<void>((resolve, reject) => {
                const probe = spawn(p, ["--version"]);
                probe.on("close", (code) => (code === 0 ? resolve() : reject()));
                probe.on("error", reject);
            });
            return p;
        } catch { /* try next */ }
    }
    return null;
}

// ─── Sox audio I/O ────────────────────────────────────────────────────────────

/**
 * Start microphone recording via sox.
 * Returns a ChildProcess whose stdout emits raw 16kHz/16-bit/mono PCM.
 */
function startMic(soxPath: string): ChildProcessWithoutNullStreams {
    // sox -t coreaudio default  → raw PCM 16kHz 16-bit signed mono
    // Falls back to -t alsa on Linux
    const inputType = process.platform === "darwin" ? "coreaudio" : "alsa";
    const inputDevice = process.platform === "darwin" ? "default" : "default";
    return spawn(soxPath, [
        "-q",
        "-t", inputType, inputDevice,
        "-r", String(SEND_SAMPLE_RATE),
        "-b", "16",
        "-e", "signed",
        "-c", "1",
        "-t", "raw", "-",
    ]);
}

/**
 * Start a sox speaker subprocess.
 * Returns a ChildProcess whose stdin accepts raw 24kHz/16-bit/mono PCM.
 */
function startSpeaker(soxPath: string): ChildProcessWithoutNullStreams {
    const outputType = process.platform === "darwin" ? "coreaudio" : "alsa";
    const outputDevice = process.platform === "darwin" ? "default" : "default";
    return spawn(soxPath, [
        "-q",
        "-t", "raw",
        "-r", String(RECV_SAMPLE_RATE),
        "-b", "16",
        "-e", "signed",
        "-c", "1", "-",
        "-t", outputType, outputDevice,
    ]);
}

// ─── Token Vend ───────────────────────────────────────────────────────────────

async function getGeminiToken(role: string): Promise<{
    accessToken: string;
    project: string;
    location: string;
    sessionId: string;
}> {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("No API key. Run: cv login");

    const res = await fetch(CLI_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, role }),
    });

    const data = await res.json() as any;

    if (res.status === 402) {
        throw new Error("AI credit limit reached. Upgrade at https://careervivid.app/pricing");
    }
    if (!res.ok) {
        throw new Error(data?.error || `Token vend failed (${res.status})`);
    }

    return {
        accessToken: data.accessToken as string,
        project: data.project as string,
        location: data.location as string,
        sessionId: data.sessionId as string
    };
}

// ─── Duration Billing ─────────────────────────────────────────────────────────

/** Call cliInterviewBill at session end. Returns credit summary for display. */
async function billSession(
    sessionId: string,
    payload?: {
        transcript?: TranscriptEntry[];
        feedbackReport?: FeedbackReport | null;
    }
): Promise<{ creditsCharged: number; durationMinutes: number; creditsRemaining: number } | null> {
    const apiKey = getApiKey();
    if (!apiKey || !sessionId) return null;
    try {
        const body: Record<string, unknown> = { apiKey, sessionId };
        if (payload?.transcript && payload.transcript.length > 0) {
            body.transcript = payload.transcript;
        }
        if (payload?.feedbackReport) {
            body.feedbackReport = payload.feedbackReport;
        }
        const res = await fetch(CLI_BILL_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        if (!res.ok) return null;
        return await res.json() as any;
    } catch {
        return null; // billing failure is non-fatal for UX
    }
}

// ─── agentProxy (question gen + feedback) ────────────────────────────────────

async function callAgentProxy(opts: {
    contents: Message[];
    systemInstruction?: string;
    responseSchema?: object;
    responseMimeType?: string;
    model?: string;
}): Promise<string> {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("No API key. Run: cv login");

    // agentProxy backend only supports Gemini models (e.g., gemini-2.5-flash, gemini-3.5-flash)
    // If a BYO model is passed that is not Gemini (e.g., openai/gpt-oss-120b:free), we fall back to FEEDBACK_MODEL.
    const resolvedModel = opts.model && opts.model.toLowerCase().includes("gemini")
        ? opts.model
        : FEEDBACK_MODEL;

    const body: Record<string, unknown> = {
        apiKey,
        model: resolvedModel,
        contents: opts.contents,
    };
    if (opts.systemInstruction) body.systemInstruction = opts.systemInstruction;
    if (opts.responseSchema) {
        body.generationConfig = {
            responseMimeType: opts.responseMimeType ?? "application/json",
            responseSchema: opts.responseSchema,
        };
    }

    const res = await fetch(AGENT_PROXY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    const data = await res.json() as any;
    if (!res.ok) throw new Error(data?.error || `agentProxy error (${res.status})`);

    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    return parts.map((p: any) => p.text ?? "").join("").trim();
}

// ─── Build system prompt ──────────────────────────────────────────────────────

function buildSystemPrompt(role: string, questions: string[], resumeContext?: string): string {
    let prompt = `You are an expert AI interviewer. Your name is Vivid. If the candidate asks your name, say "My name is Vivid." Do not say Gemini or any other name.

You are conducting a real-time voice interview for the position of: "${role}".

Start with a warm, polished introduction that outlines the role and key responsibilities. Then ask: "Do you have any questions before we begin the interview?" Wait briefly before proceeding.

Ask the questions below one at a time. You may ask one or two follow-up questions when a candidate's answer invites it.

After the final question and the candidate's response:
1. Give a 2–3 sentence summary of overall performance.
2. Provide 2–3 short, personalized improvement tips.
3. End with: "Thank you for your time today! Your feedback report is being generated."
4. Append the exact token ${END_TOKEN} at the very end (do not narrate this token).

Interview Questions:
${questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}

**Policies:**
- Never fabricate company details; suggest candidates verify with their recruiter.
- Maintain a polite, professional, encouraging tone.
- Keep responses concise — this is a voice interview, so avoid long monologues.
- Do not use markdown formatting. Speak naturally.`;

    if (resumeContext) {
        prompt += `\n\nCandidate resume (use for targeted follow-ups):\n--- RESUME ---\n${resumeContext}`;
    }

    return prompt;
}

// ─── Generate Questions (via agentProxy) ─────────────────────────────────────

async function generateQuestions(role: string, numQuestions: number, model?: string): Promise<string[]> {
    const spinner = ora(chalk.dim("Generating interview questions...")).start();
    try {
        const prompt = `Based on the following role, generate ${numQuestions} insightful interview questions covering technical skills, behavioral competencies, and role-specific scenarios. Return ONLY a valid JSON array of strings.\n\nRole: "${role}"`;
        const text = await callAgentProxy({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            responseSchema: { type: "ARRAY", items: { type: "STRING" } },
            responseMimeType: "application/json",
            model,
        });
        let clean = text.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
        const questions = JSON.parse(clean) as string[];
        spinner.succeed(chalk.dim(`Generated ${questions.length} questions`));
        return questions;
    } catch (err: any) {
        spinner.fail("Failed to generate questions.");
        throw err;
    }
}

// ─── Analyze Transcript (via agentProxy) ─────────────────────────────────────

async function analyzeTranscript(transcript: TranscriptEntry[], role: string, model?: string): Promise<FeedbackReport> {
    const spinner = ora(chalk.dim("Generating feedback report...")).start();
    try {
        const formatted = transcript
            .map(e => `${e.speaker === "ai" ? "Interviewer" : "Candidate"}: ${e.text}`)
            .join("\n\n");
        const prompt = `You are an expert interview coach. Analyze this interview transcript for the role "${role}" and return a JSON object with: overallScore, communicationScore, confidenceScore, relevanceScore (numbers 0-100), strengths (string), areasForImprovement (string).\n\nTranscript:\n---\n${formatted}\n---`;

        const text = await callAgentProxy({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            responseSchema: {
                type: "OBJECT",
                properties: {
                    overallScore: { type: "NUMBER" },
                    communicationScore: { type: "NUMBER" },
                    confidenceScore: { type: "NUMBER" },
                    relevanceScore: { type: "NUMBER" },
                    strengths: { type: "STRING" },
                    areasForImprovement: { type: "STRING" },
                },
                required: ["overallScore", "communicationScore", "confidenceScore", "relevanceScore", "strengths", "areasForImprovement"],
            },
            model,
        });
        let clean = text.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
        const report = JSON.parse(clean) as FeedbackReport;
        spinner.succeed(chalk.dim("Feedback report ready"));
        return report;
    } catch (err: any) {
        spinner.fail("Failed to generate feedback.");
        throw err;
    }
}

// ─── VOICE SESSION ────────────────────────────────────────────────────────────

async function runVoiceSession(opts: {
    role: string;
    questions: string[];
    resumeContext?: string;
    soxPath: string;
    model?: string;
}): Promise<void> {
    const { role, questions, resumeContext, soxPath, model } = opts;

    printBanner(role, "voice");

    // Create logger (sessionId not yet known — will be set after token vend)
    const log: CVLogger = createLogger("interview", {
        apiKey: getApiKey(),
        version: CLI_VERSION,
    });

    const sessionStart = Date.now();

    // Get Gemini token from Cloud Function
    const connectSpinner = ora(chalk.dim("Connecting to Vivid...")).start();
    let accessToken: string;
    let project: string;
    let location: string;
    let sessionId: string;
    try {
        ({ accessToken, project, location, sessionId } = await getGeminiToken(role));
        log.setSessionId(sessionId);
        log.info("session_start", { role, numQuestions: questions.length, mode: "voice", soxPath });
    } catch (err: any) {
        log.error("token_vend_failed", err, { role });
        await log.dispose();
        connectSpinner.fail(chalk.red(err.message));
        throw err;
    }

    const authClient = new OAuth2Client();
    authClient.setCredentials({ access_token: accessToken });

    // Initialize the AI client for Vertex AI using the vended short-lived access token
    const ai = new GoogleGenAI({
        vertexai: true,
        project,
        location,
        googleAuthOptions: {
            authClient: authClient as any
        }
    });
    const systemInstruction = buildSystemPrompt(role, questions, resumeContext);

    const transcript: TranscriptEntry[] = [];
    let ended = false;
    let outputBuf = "";   // accumulates AI output transcription for current turn
    let inputBuf = "";    // accumulates user input transcription for current turn
    let streamColPos = 0; // current col position while streaming Vivid's text
    let vividSpeaking = false;
    let muteTimer: ReturnType<typeof setTimeout> | null = null;
    // Track whether we're currently showing live user speech in the terminal
    let userSpeechLineActive = false;
    // Detect END_TOKEN in the raw chunk BEFORE it's stripped from the display buffer.
    // (outputBuf never contains END_TOKEN because chunkClean strips it, so the
    //  turnComplete check on outputBuf would never fire without this flag.)
    let endTokenSeen = false;
    // Track audio bytes sent to speaker this turn to calculate mute duration
    // 24kHz, 16-bit mono = 48000 bytes/second of playback
    const SPEAKER_BYTES_PER_SEC = RECV_SAMPLE_RATE * 2; // 48000
    let pendingAudioBytes = 0;

    // ── Audio processes ──────────────────────────────────────────────────
    const micProc = startMic(soxPath);
    const speakerProc = startSpeaker(soxPath);

    micProc.stderr.on("data", () => { /* suppress sox warnings */ });
    speakerProc.stderr.on("data", () => { /* suppress sox warnings */ });

    // ── Connect to Live API ──────────────────────────────────────────────
    let session: any;
    try {
        session = await ai.live.connect({
            model: LIVE_MODEL,
            callbacks: {
                onopen: () => {
                    connectSpinner.succeed(chalk.green("✅ Vivid is ready!"));
                    // Show a professional prompt so the user knows to speak first
                    console.log("");
                    console.log(chalk.bold.white("  🎙  Greet Vivid to begin your interview."));
                    console.log(chalk.dim('  Say \'Hello\' or \'Hi, I\'m ready\' to get started.'));
                    console.log("");
                    process.stdout.write(chalk.green("  ● Listening...\r"));

                    // Pipe mic PCM → Gemini (muted while Vivid is speaking)
                    micProc.stdout.on("data", (chunk: Buffer) => {
                        if (ended || chunk.length === 0 || vividSpeaking) return;
                        try {
                            session.sendRealtimeInput({
                                audio: {
                                    data: chunk.toString("base64"),
                                    mimeType: `audio/pcm;rate=${SEND_SAMPLE_RATE}`,
                                },
                            });
                        } catch { /* session may be closing */ }
                    });
                },

                onmessage: (msg: any) => {
                    // ── Audio output (Vivid speaking) → sox speaker ───
                    const audioPart = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                    if (audioPart) {
                        vividSpeaking = true;
                        if (muteTimer) { clearTimeout(muteTimer); muteTimer = null; }
                        const pcmBuf = Buffer.from(audioPart, "base64");
                        pendingAudioBytes += pcmBuf.length;
                        speakerProc.stdin.write(pcmBuf);
                    }

                    // ── Output transcription (Vivid's words) — stream in real-time ──
                    const outText: string | undefined =
                        msg.serverContent?.outputTranscription?.text;
                    if (outText) {
                        // Detect END_TOKEN in raw chunk BEFORE stripping
                        if (outText.includes(END_TOKEN)) endTokenSeen = true;
                        // Phrase-based fallback: model sometimes omits the token
                        if (outText.toLowerCase().includes("feedback report is being generated")) endTokenSeen = true;

                        const chunkClean = outText.replace(END_TOKEN, "");
                        if (chunkClean) {
                            if (!outputBuf) {
                                // First chunk: print the speaker header on a fresh line
                                process.stdout.write("\n" + chalk.cyan.bold("  Vivid ❯") + "\n");
                                streamColPos = 0;
                            }
                            outputBuf += chunkClean;

                            // Stream words inline with soft word-wrap
                            for (const word of chunkClean.split(/(\s+)/)) {
                                if (!word) continue;
                                const isWhitespace = /^\s+$/.test(word);
                                if (isWhitespace) {
                                    if (streamColPos > 0) {
                                        process.stdout.write(chalk.cyan(' '));
                                        streamColPos += 1;
                                    }
                                } else {
                                    if (streamColPos > 0 && streamColPos + word.length > WRAP_WIDTH) {
                                        process.stdout.write('\n');
                                        streamColPos = 0;
                                    }
                                    const prefix = streamColPos === 0 ? '  ' : '';
                                    process.stdout.write(chalk.cyan(prefix + word));
                                    streamColPos += prefix.length + word.length;
                                }
                            }
                        }
                    }

                    // ── Input transcription (user's live speech) — stream in real-time ──
                    const inText: string | undefined =
                        msg.serverContent?.inputTranscription?.text;
                    if (inText) {
                        if (!userSpeechLineActive) {
                            // First chunk of user speech: clear the Listening indicator and
                            // start a "[You] ❯" prefix on a fresh line
                            process.stdout.write("\r\x1B[2K"); // clear current line
                            process.stdout.write(chalk.dim("  [You] ❯ ") + chalk.white(""));
                            userSpeechLineActive = true;
                        }
                        inputBuf += inText;
                        // Rewrite the whole user line so far (keeps it clean as chunks arrive)
                        process.stdout.write("\r\x1B[2K");
                        process.stdout.write(chalk.dim("  [You] ❯ ") + chalk.white(inputBuf.trim()));
                    }

                    // ── Turn complete ─────────────────────────────────
                    if (msg.serverContent?.turnComplete) {
                        if (outputBuf.trim()) {
                            const aiText = outputBuf.trim();
                            // Close the streamed line cleanly
                            if (streamColPos > 0) process.stdout.write("\n");
                            process.stdout.write("\n"); // blank line after Vivid's turn
                            transcript.push({ speaker: "ai", text: aiText });
                            // Use the pre-strip flag — NOT aiText.includes(END_TOKEN)
                            if (endTokenSeen) ended = true;
                            outputBuf = "";
                            streamColPos = 0;
                            endTokenSeen = false; // reset for next turn
                        }

                        if (inputBuf.trim()) {
                            // Finalize the user speech line with a newline
                            process.stdout.write("\n");
                            userSpeechLineActive = false;
                            transcript.push({ speaker: "user", text: inputBuf.trim() });
                            inputBuf = "";
                        }

                        if (!ended) {
                            // Calculate exactly how long the buffered audio will take to play.
                            // Show "Listening..." and unmute the mic together when playback ends.
                            const playbackMs = Math.ceil((pendingAudioBytes / SPEAKER_BYTES_PER_SEC) * 1000);
                            const muteMs = Math.max(playbackMs, 800); // minimum 800ms floor
                            pendingAudioBytes = 0;

                            muteTimer = setTimeout(() => {
                                vividSpeaking = false;
                                muteTimer = null;
                                // Show "Listening..." right as audio finishes playing
                                if (!userSpeechLineActive) {
                                    process.stdout.write(chalk.green("\n  ● Listening...\r"));
                                }
                            }, muteMs);
                        } else {
                            pendingAudioBytes = 0;
                            // Interview ended via END_TOKEN — cancel pending mute timer
                            // so '● Listening...' never appears after the interview concludes
                            if (muteTimer) { clearTimeout(muteTimer); muteTimer = null; }
                        }
                    }
                },

                onerror: (e: any) => {
                    const msg = e?.message ?? JSON.stringify(e) ?? "Unknown error";
                    console.log(chalk.red(`\n  ❌ Live API connection error: ${msg}`));
                    console.log(chalk.dim(`     Model: ${LIVE_MODEL} | Location: ${location}`));
                    ended = true;
                },

                onclose: (e?: any) => {
                    if (!ended) {
                        const reason = e?.reason ?? e?.code ?? "unexpected close";
                        console.log(chalk.yellow(`\n  ⚠️  Live API session closed unexpectedly: ${reason}`));
                        console.log(chalk.dim(`     Model: ${LIVE_MODEL} | Location: ${location}`));
                    }
                    ended = true;
                },
            },
            config: {
                responseModalities: [Modality.AUDIO],
                inputAudioTranscription: {},
                outputAudioTranscription: {},
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: "Zephyr" },
                    },
                },
                systemInstruction: { parts: [{ text: systemInstruction }] },
                contextWindowCompression: {
                    triggerTokens: "104857",
                    slidingWindow: { targetTokens: "52428" },
                },
            },
        });
    } catch (err: any) {
        log.error("live_connect_failed", err, { role, sessionId });
        await log.dispose();
        connectSpinner.fail(chalk.red(`Failed to connect: ${err.message}`));
        micProc.kill();
        speakerProc.kill();
        throw err;
    }

    // ── Wait until interview ends or Ctrl+C (single-SIGINT guard) ───────
    let shuttingDown = false;
    await new Promise<void>((resolve) => {
        const check = setInterval(() => {
            if (ended) { clearInterval(check); resolve(); }
        }, 200);

        const onSigInt = () => {
            if (shuttingDown) return; // ignore double Ctrl+C
            shuttingDown = true;
            clearInterval(check);
            printSystem("Interview ended by user.");
            log.info("session_interrupted", { role, sessionId, elapsedMs: Date.now() - sessionStart });
            ended = true;
            resolve();
        };
        process.once("SIGINT", onSigInt);
    });

    // ── Cleanup ──────────────────────────────────────────────────────────
    try { micProc.kill("SIGTERM"); } catch { /* ignore */ }
    try { speakerProc.stdin.end(); } catch { /* ignore */ }
    try { session.close(); } catch { /* ignore */ }

    // Wait a moment for final audio to drain
    await new Promise(r => setTimeout(r, 800));

    const sessionDurationMs = Date.now() - sessionStart;

    // ── Bill session (duration-based, 10s timeout to prevent hang) ──────
    // We delay billing until AFTER the feedback report is generated so we
    // can persist the transcript + report in the same request.
    const userTurns = transcript.filter(t => t.speaker === "user").length;
    log.info("session_end", { sessionId, userTurns, aiTurns: transcript.filter(t => t.speaker === "ai").length, sessionDurationMs });

    if (userTurns < 1) {
        printSystem("Not enough conversation to generate a feedback report.");
        // Still bill the session (minimum charge applies)
        const billSpinner = ora(chalk.dim("Calculating session cost...")).start();
        const bill = await Promise.race([
            billSession(sessionId),
            new Promise<null>(r => setTimeout(() => r(null), 10_000)),
        ]);
        bill ? billSpinner.succeed(chalk.dim(`${bill.durationMinutes}min · ${bill.creditsCharged} credits`)) : billSpinner.warn("Could not calculate cost.");
        await log.dispose();
        return;
    }

    console.log(chalk.dim("\n  Generating your personalized feedback report..."));
    let report: FeedbackReport | null = null;
    try {
        report = await analyzeTranscript(transcript, role, model);
        printReport(report);
        log.info("feedback_complete", { sessionId, overallScore: report.overallScore });
    } catch (err: any) {
        log.error("feedback_failed", err, { sessionId });
        console.log(chalk.red(`  Failed to generate feedback: ${err.message}`));
    }

    // ── Bill + persist transcript/report together ────────────────────────
    const billSpinner = ora(chalk.dim("Calculating session cost...")).start();
    const bill = await Promise.race([
        billSession(sessionId, { transcript, feedbackReport: report }),
        new Promise<null>(r => setTimeout(() => r(null), 10_000)),
    ]);
    if (bill) {
        billSpinner.succeed(
            chalk.dim(`Session: ${bill.durationMinutes}min · `) +
            chalk.hex("#4f46e5").bold(`${bill.creditsCharged} credits used`) +
            chalk.dim(` · ${bill.creditsRemaining} remaining`)
        );
        log.info("billing_complete", {
            sessionId, durationMinutes: bill.durationMinutes,
            creditsCharged: bill.creditsCharged, creditsRemaining: bill.creditsRemaining,
        });
        log.metric("credits_charged", bill.creditsCharged, { sessionId });
        log.metric("session_duration_ms", sessionDurationMs, { sessionId });
    } else {
        billSpinner.warn(chalk.dim("Session cost could not be calculated (timeout)."));
        log.warn("billing_timeout", { sessionId, sessionDurationMs });
    }

    if (report) {
        console.log(chalk.dim("\n  💡 Report saved! Continue your prep with:"));
        console.log(chalk.dim("     • ") + chalk.white("`cv agent`") + chalk.dim(" or ") + chalk.white("`cv agent --jobs`") + chalk.dim(" → coach me on my answers"));
        console.log(chalk.dim("     • Rewrite resume, draft cover letter, or start another round"));
        console.log(chalk.dim("     • View report: ") + chalk.cyan("https://careervivid.app/interview-studio"));
    }

    await log.dispose();
}

// ─── TEXT SESSION (fallback) ──────────────────────────────────────────────────

async function runTextSession(opts: {
    role: string;
    questions: string[];
    resumeContext?: string;
    model?: string;
}): Promise<void> {
    const { role, questions, resumeContext, model } = opts;
    const systemInstruction = buildSystemPrompt(role, questions, resumeContext);

    printBanner(role, "text");

    const history: Message[] = [];
    const transcript: TranscriptEntry[] = [];
    let ended = false;

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });

    let sigintReceived = false;
    let resolvePending: ((val: string | null) => void) | null = null;

    const sigintHandler = () => {
        if (sigintReceived) return;
        sigintReceived = true;
        printSystem("Interview ended by user.");
        rl.close();
        if (resolvePending) {
            resolvePending(null);
        }
    };
    process.on("SIGINT", sigintHandler);
    rl.on("SIGINT", sigintHandler);

    const askUser = (): Promise<string | null> =>
        new Promise(resolve => {
            resolvePending = resolve;
            if (process.stdin.isTTY) process.stdout.write(chalk.white.bold("\n  you ❯ "));
            rl.once("line", line => {
                resolvePending = null;
                resolve(line.trim());
            });
            rl.once("close", () => {
                resolvePending = null;
                resolve(null);
            });
        });

    const runAgentCall = async (contents: Message[]): Promise<string | null> => {
        return new Promise<string | null>((resolve, reject) => {
            resolvePending = (val) => resolve(null);
            callAgentProxy({ contents, systemInstruction, model }).then(
                res => {
                    resolvePending = null;
                    resolve(res);
                },
                err => {
                    resolvePending = null;
                    reject(err);
                }
            );
        });
    };

    const spinner = ora(chalk.dim("Vivid is connecting...")).start();
    try {
        const greeting = await runAgentCall([{ role: "user", parts: [{ text: "Hello" }] }]);
        spinner.stop();
        if (sigintReceived || greeting === null) {
            ended = true;
        } else {
            history.push({ role: "user", parts: [{ text: "Hello" }] });
            history.push({ role: "model", parts: [{ text: greeting }] });
            transcript.push({ speaker: "user", text: "Hello" });
            transcript.push({ speaker: "ai", text: greeting });
            if (greeting.includes(END_TOKEN)) ended = true;
            printAI(greeting);
        }
    } catch (err: any) {
        spinner.fail(chalk.red("Failed to connect to AI interviewer."));
        throw err;
    }

    while (!ended && !sigintReceived) {
        const input = await askUser();
        if (sigintReceived || input === null || input.toLowerCase() === "exit" || input.toLowerCase() === "q") {
            if (!sigintReceived) {
                printSystem("Interview ended early.");
            }
            break;
        }
        if (input === "") continue;

        history.push({ role: "user", parts: [{ text: input }] });
        transcript.push({ speaker: "user", text: input });

        const aiSpinner = ora({ text: "" }).start();
        try {
            const aiResponse = await runAgentCall(history);
            aiSpinner.stop();
            if (sigintReceived || aiResponse === null) {
                break;
            }
            history.push({ role: "model", parts: [{ text: aiResponse }] });
            transcript.push({ speaker: "ai", text: aiResponse.replace(END_TOKEN, "").trim() });
            if (aiResponse.includes(END_TOKEN)) ended = true;
            printAI(aiResponse);
        } catch (err: any) {
            aiSpinner.stop();
            console.log(chalk.red(`\n  Error: ${err.message}\n`));
        }
    }
    process.off("SIGINT", sigintHandler);
    rl.close();

    const userTurns = transcript.filter(t => t.speaker === "user").length;
    if (userTurns < 2) { printSystem("Not enough conversation to generate a feedback report."); return; }

    console.log(chalk.dim("\n  Generating your personalized feedback report..."));
    let textReport: FeedbackReport | null = null;
    try {
        textReport = await analyzeTranscript(transcript, role, model);
        printReport(textReport);
    } catch (err: any) {
        console.log(chalk.red(`  Failed to generate feedback: ${err.message}`));
    }

    // Persist transcript + report to Firestore for agent coaching (fire-and-forget)
    const apiKey = getApiKey();
    if (apiKey && textReport) {
        fetch(CLI_BILL_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                apiKey,
                // Text mode has no billable sessionId — use a stub that won't match
                // a real session. The function will 404, but the persist path still runs.
                // A proper text-mode session doc would require cliGetInterviewToken for text too.
                // For now, persist to a synthetic doc under a well-known pattern.
                sessionId: `text_${Date.now()}_${randomUUID().slice(0, 8)}`,
                transcript,
                feedbackReport: textReport,
            }),
        }).catch(() => { /* fire-and-forget — ignore errors */ });

        console.log(chalk.dim("\n  💡 Interview context saved. Ask `cv agent` to coach you on your answers."));
    }
}

// ─── Command Registration ─────────────────────────────────────────────────────

export function registerInterviewCommand(program: Command): void {
    program
        .command("interview")
        .description("Start an interactive AI voice interview session in the terminal")
        .option("-r, --role <role>", "Role or job description to practice for")
        .option("-q, --questions <n>", "Number of interview questions to generate", "5")
        .option("--resume <id>", "Load a specific resume ID for context (from cv resumes list)")
        .option("--text", "Use text-only mode (no audio required)")
        .option("--model <model>", "Specify a custom model to use for the interview session")
        .addHelpText("after", `
Examples:
  cv interview
  cv interview --role "Senior Software Engineer at Stripe"
  cv interview --role "Product Manager" --questions 7
  cv interview --role "Data Scientist" --resume my-resume-id
  cv interview --role "SWE" --text        (text-only, no sox needed)

Voice mode setup (one-time):
  macOS:  brew install sox
  Linux:  sudo apt install sox
`)
        .action(async (opts: { role?: string; questions: string; resume?: string; text?: boolean; model?: string }) => {
            if (!getApiKey()) {
                console.error(chalk.red(
                     "\nNo API key configured.\n\n" +
                     "  Run: cv login     (browser login)\n" +
                     "       cv auth set-key <key>  (API key)\n"
                ));
                process.exit(1);
            }

            // ── Role prompt ──────────────────────────────────────────────────
            let role = opts.role?.trim();
            if (!role) {
                const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
                role = await new Promise<string>(resolve => {
                    rl.question(chalk.bold("\n  What role are you interviewing for?\n  ❯ "), answer => {
                        rl.close();
                        resolve(answer.trim());
                    });
                });
            }
            if (!role) { console.error(chalk.red("  Role is required.")); process.exit(1); }

            const numQuestions = Math.min(Math.max(parseInt(opts.questions, 10) || 5, 1), 12);

            // ── Optional resume context ──────────────────────────────────────
            let resumeContext: string | undefined;
            if (opts.resume) {
                const spinner = ora(chalk.dim("Loading resume...")).start();
                try {
                    const result = await resumeGet(opts.resume);
                    if (isApiError(result)) {
                        spinner.warn(chalk.yellow(`Could not load resume: ${result.message}. Continuing without it.`));
                    } else {
                        resumeContext = result.cvMarkdown;
                        spinner.succeed(chalk.dim(`Resume loaded: ${result.title}`));
                    }
                } catch {
                    spinner.warn(chalk.yellow("Could not load resume. Continuing without it."));
                }
            }

            // ── Generate questions ───────────────────────────────────────────
            let questions: string[];
            try {
                questions = await generateQuestions(role, numQuestions, opts.model);
            } catch (err: any) {
                console.error(chalk.red(`\n  Failed to generate questions: ${err.message}\n`));
                process.exit(1);
            }

            // ── Determine mode ───────────────────────────────────────────────
            if (opts.text) {
                await runTextSession({ role, questions, resumeContext, model: opts.model });
                return;
            }

            // Probe for sox
            const soxPath = await findSox();
            if (!soxPath) {
                console.log(chalk.yellow(
                    "\n  ⚠  sox not found — falling back to text mode.\n" +
                    "\n  To enable voice, install sox:\n" +
                    "    macOS:  brew install sox\n" +
                    "    Linux:  sudo apt install sox\n" +
                    "\n  Or run in text mode:  cv interview --text\n"
                ));
                await runTextSession({ role, questions, resumeContext, model: opts.model });
                return;
            }

            // Voice mode
            try {
                await runVoiceSession({ role, questions, resumeContext, soxPath, model: opts.model });
            } catch (err: any) {
                console.error(chalk.red(`\n  Interview error: ${err.message}\n`));
                process.exit(1);
            }
        });
}
