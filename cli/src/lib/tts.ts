/**
 * tts.ts — Text-to-Speech engine for the CareerVivid REPL
 *
 * Auth:     Uses the CareerVivid API key (cv_live_...) → cliGetInterviewToken
 *           → short-lived Gemini key. No GEMINI_API_KEY env var required.
 *
 * Chunking: Long text is split at sentence boundaries and synthesized
 *           sequentially, then played back-to-back for seamless audio.
 *
 * Retry:    Gemini 3.1 TTS models occasionally return 500 errors;
 *           each chunk is retried up to 3 times with exponential back-off.
 *
 * Toggle:   /voice on | off
 * Replay:   /speak
 */

import { writeFileSync, unlinkSync } from "fs";
import { spawn } from "child_process";
import { tmpdir } from "os";
import { join } from "path";
import { GoogleGenAI, Modality } from "@google/genai";
import { getApiKey } from "../config.js";

// ── Backend endpoint ───────────────────────────────────────────────────────────
const TTS_TOKEN_URL =
  process.env.CV_FUNCTIONS_URL
    ? `${process.env.CV_FUNCTIONS_URL}/cliGetInterviewToken`
    : "https://us-west1-jastalk-firebase.cloudfunctions.net/cliGetInterviewToken";

// ── Available options ──────────────────────────────────────────────────────────
// All 30 Gemini TTS voices (identical across 2.5 and 3.1 model families)
export const AVAILABLE_VOICES = [
  "Zephyr",    // Bright, energetic
  "Puck",      // Upbeat, playful
  "Charon",    // Informative, measured
  "Kore",      // Firm, confident
  "Fenrir",    // Excitable, dynamic
  "Aoede",     // Breezy, easy-going
  "Orbit",     // Friendly, relaxed
  "Stellar",   // Smooth, polished
  "Leda",      // Warm, natural
  "Orus",      // Confident, authoritative
  "Autonoe",   // Gentle, clear
  "Enceladus", // Breathable, expressive
  "Iapetus",   // Deep, resonant
  "Umbriel",   // Calm, deliberate
  "Algieba",   // Rich, warm
  "Despina",   // Light, airy
  "Erinome",   // Crisp, articulate
  "Sulafat",   // Smooth, soothing
  "Schedar",   // Authoritative, clear
  "Vindemiatrix", // Expressive, fluid
] as const;

// Correct model IDs verified against official Gemini API docs (Apr 2026)
// Pattern: gemini-{version}-{variant}-tts-preview  (NOT -preview-tts)
export const AVAILABLE_TTS_MODELS = [
  "gemini-3.1-flash-tts-preview",   // Latest, fast (default) ✓ CORRECT ID
  "gemini-2.5-flash-preview-tts",   // Previous gen, fast
  "gemini-2.5-pro-preview-tts",     // Previous gen, high quality
] as const;

// ── State ──────────────────────────────────────────────────────────────────────
let voiceEnabled = false;
let lastResponse = "";
let playbackProcess: ReturnType<typeof spawn> | null = null;
let currentVoice: string = "Zephyr";
let currentTtsModel: string = "gemini-3.1-flash-tts-preview";

// Session-cached Gemini key — only fetched once per session
let cachedGeminiKey: string | null = null;

export function isVoiceEnabled() { return voiceEnabled; }
export function setVoiceEnabled(on: boolean) { voiceEnabled = on; }
export function setLastResponse(text: string) { lastResponse = text; }
export function getLastResponse() { return lastResponse; }
export function getCurrentVoice() { return currentVoice; }
export function setCurrentVoice(v: string) { currentVoice = v; }
export function getCurrentTtsModel() { return currentTtsModel; }
export function setCurrentTtsModel(m: string) { currentTtsModel = m; }

// ── Gemini key via CV API key ──────────────────────────────────────────────────

async function fetchGeminiKey(): Promise<string | null> {
  if (cachedGeminiKey) return cachedGeminiKey;

  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    const res = await fetch(TTS_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey, role: "tts" }),
    });
    if (!res.ok) return null;
    const data = await res.json() as any;
    if (data?.geminiKey) {
      cachedGeminiKey = data.geminiKey as string;
      return cachedGeminiKey;
    }
  } catch {
    // Network error — fall through
  }
  return null;
}

// ── Audio Playback ─────────────────────────────────────────────────────────────

export function stopPlayback() {
  if (playbackProcess && !playbackProcess.killed) {
    playbackProcess.kill("SIGKILL");
    playbackProcess = null;
  }
}

function playWav(wavBuffer: Buffer): void {
  const tmpFile = join(tmpdir(), `cv-tts-${Date.now()}.wav`);
  writeFileSync(tmpFile, wavBuffer);

  const platform = process.platform;
  let playerCmd: string;
  let playerArgs: string[];

  if (platform === "darwin") {
    playerCmd = "afplay";
    playerArgs = [tmpFile];
  } else if (platform === "linux") {
    playerCmd = "aplay";
    playerArgs = ["-q", tmpFile];
  } else {
    playerCmd = "powershell";
    playerArgs = ["-c", `(New-Object System.Media.SoundPlayer '${tmpFile}').PlaySync()`];
  }

  stopPlayback();
  const child = spawn(playerCmd, playerArgs, { stdio: "ignore", detached: false });
  playbackProcess = child;

  child.on("close", () => {
    try { unlinkSync(tmpFile); } catch { /* ignore */ }
    if (playbackProcess === child) playbackProcess = null;
  });
  child.on("error", () => {
    try { unlinkSync(tmpFile); } catch { /* ignore */ }
  });
}

// ── WAV Builder ────────────────────────────────────────────────────────────────

function buildWavHeader(
  dataLength: number,
  sampleRate = 24000,
  channels = 1,
  bitsPerSample = 16
): Buffer {
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  const blockAlign = (channels * bitsPerSample) / 8;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataLength, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);          // PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataLength, 40);
  return header;
}

// ── Text Cleaning ──────────────────────────────────────────────────────────────

function cleanForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, "")          // strip code blocks
    .replace(/`[^`]+`/g, "")                  // strip inline code
    .replace(/\*\*(.*?)\*\*/g, "$1")          // bold → plain
    .replace(/\*(.*?)\*/g, "$1")              // italic → plain
    .replace(/^#{1,6}\s+/gm, "")             // headings → plain
    .replace(/^[>•\-*]\s*/gm, "")            // bullets/blockquotes
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links → text only
    .replace(/\s+/g, " ")
    .trim();
}

// ── Sentence Chunker ───────────────────────────────────────────────────────────
// Splits at sentence boundaries (. ! ?) respecting ~800 char soft limit
// to stay well within the 32k token context window and avoid quality drift.

const CHUNK_SIZE = 800; // characters

function splitIntoChunks(text: string): string[] {
  if (text.length <= CHUNK_SIZE) return [text];

  const chunks: string[] = [];
  // Split on sentence-ending punctuation, keeping the delimiter
  const sentences = text.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) ?? [text];

  let current = "";
  for (const sentence of sentences) {
    if ((current + sentence).length > CHUNK_SIZE && current.length > 0) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  return chunks.filter(c => c.length > 0);
}

// ── Single-chunk Synthesis (with retry) ───────────────────────────────────────

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 800;

async function synthesizeChunk(
  ai: GoogleGenAI,
  text: string,
  voice: string,
  model: string,
  attempt = 0
): Promise<Buffer | null> {
  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });

    const parts = response?.candidates?.[0]?.content?.parts ?? [];
    const pcmParts: Buffer[] = [];

    for (const part of parts) {
      if ((part as any).inlineData?.data) {
        pcmParts.push(Buffer.from((part as any).inlineData.data, "base64"));
      }
    }

    if (pcmParts.length === 0) return null;
    return Buffer.concat(pcmParts);
  } catch (err: any) {
    // Gemini 3.1 TTS can 500 on random requests — retry with back-off
    const isRetryable =
      err?.status === 500 ||
      String(err?.message ?? "").includes("500") ||
      String(err?.message ?? "").includes("INTERNAL");

    if (isRetryable && attempt < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
      return synthesizeChunk(ai, text, voice, model, attempt + 1);
    }
    return null;
  }
}

// ── Public TTS Entry Point ─────────────────────────────────────────────────────

/**
 * Synthesizes `text` via Gemini TTS.
 * - Cleans markdown
 * - Splits into sentence-boundary chunks
 * - Synthesizes each chunk sequentially with retry
 * - Concatenates all PCM data into one WAV and plays it
 *
 * Non-blocking: errors are silently swallowed so the REPL is never disrupted.
 */
export async function speakText(text: string, _unusedKey?: string): Promise<void> {
  if (!text.trim()) return;

  const geminiKey = await fetchGeminiKey();
  if (!geminiKey) return;

  const cleaned = cleanForSpeech(text);
  if (!cleaned) return;

  const chunks = splitIntoChunks(cleaned);
  const voice = currentVoice;
  const model = currentTtsModel;

  try {
    const ai = new GoogleGenAI({ apiKey: geminiKey });
    const pcmBuffers: Buffer[] = [];

    for (const chunk of chunks) {
      const pcm = await synthesizeChunk(ai, chunk, voice, model);
      if (pcm) pcmBuffers.push(pcm);
    }

    if (pcmBuffers.length === 0) return;

    const allPcm = Buffer.concat(pcmBuffers);
    const wavBuffer = Buffer.concat([buildWavHeader(allPcm.length), allPcm]);

    playWav(wavBuffer);
  } catch {
    // Never crash the REPL — invalidate key so next call re-fetches
    cachedGeminiKey = null;
  }
}
