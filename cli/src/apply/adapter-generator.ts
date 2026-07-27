/**
 * adapter-generator.ts — AI-powered ATS adapter generator
 *
 * When cv jobs apply encounters a URL from an unknown ATS platform, this module:
 *   1. Scrapes the HTML skeleton of the form (headless Playwright)
 *   2. Calls Gemini to generate a TypeScript ATSAdapter implementation
 *   3. Saves the generated adapter to ~/.careervivid/adapters/<hostname>.js (runtime)
 *   4. Optionally syncs to Firebase Storage (user's "memory space") so it's
 *      available across devices/reinstalls without needing a CLI rebuild
 *
 * Generated adapters are saved as pre-transpiled JavaScript (not TypeScript)
 * so they can be loaded via dynamic import() at runtime without a build step.
 *
 * Firebase Storage path: gs://<bucket>/users/<uid>/adapters/<hostname>.js
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { createHash } from "crypto";
import chalk from "chalk";

// ── Runtime adapter cache dir ─────────────────────────────────────────────────
// Lives in ~/.careervivid/adapters/ — writable at runtime without a CLI rebuild.

const ADAPTER_CACHE_DIR = join(homedir(), ".careervivid", "adapters");

// ── ATSAdapter interface contract for the AI prompt ───────────────────────────
// We send this as context so the AI knows exactly what to implement.

const ADAPTER_INTERFACE = `
export interface ATSAdapter {
  platform: string;
  navigateToForm(page: Page, jobUrl: string): Promise<void>;
  extractFields(page: Page): Promise<FormField[]>;
  fillField(page: Page, field: FormField, answer: string): Promise<void>;
  submit(page: Page): Promise<void>;
  fillFromProfile?(page: Page, profile: ApplyProfile): Promise<{ filled: string[]; skipped: string[] }>;
}

export interface FormField {
  id: string;
  label: string;
  type: "text" | "textarea" | "select" | "checkbox" | "radio" | "file" | "unknown";
  selector: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
}

export interface ApplyProfile {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  city?: string;
  state?: string;
  country?: string;
  workAuthorization?: string;
  yearsOfExperience?: string;
  currentTitle?: string;
  currentCompany?: string;
  [key: string]: string | undefined;
}
`.trim();

// ── Generate adapter for unknown ATS ─────────────────────────────────────────

export interface GeneratedAdapter {
  hostname: string;
  filePath: string;
  source: "cache" | "generated" | "firebase";
}

/**
 * Try to load or generate a TypeScript adapter for the given URL.
 *
 * @param url       The job application URL
 * @param apiKey    Gemini API key for generating the adapter
 * @param model     Gemini model to use (e.g. "gemini-3-flash-preview")
 * @returns         Path to the generated .js adapter file, or null on failure
 */
export async function getOrGenerateAdapter(
  url: string,
  apiKey: string,
  model: string,
): Promise<GeneratedAdapter | null> {
  const hostname = extractHostname(url);
  if (!hostname) return null;

  ensureAdapterCacheDir();
  const cachedPath = join(ADAPTER_CACHE_DIR, `${hostname}.mjs`);

  // 1. Check local cache first (fastest path)
  if (existsSync(cachedPath)) {
    console.log(chalk.dim(`  🗂  Using cached adapter for: ${hostname}`));
    return { hostname, filePath: cachedPath, source: "cache" };
  }

  // 2. Check Firebase Storage (user's cloud memory space)
  const firebaseAdapter = await tryLoadFromFirebase(hostname);
  if (firebaseAdapter) {
    writeFileSync(cachedPath, firebaseAdapter, "utf-8");
    console.log(chalk.dim(`  ☁️  Loaded adapter from Firebase memory: ${hostname}`));
    return { hostname, filePath: cachedPath, source: "firebase" };
  }

  // 3. Generate using AI
  console.log(chalk.cyan(`\n  🤖 Unknown ATS platform: ${hostname}`));
  console.log(chalk.dim(`     Generating adapter with Gemini ${model}...\n`));

  const generatedCode = await generateAdapterCode(url, hostname, apiKey, model);
  if (!generatedCode) return null;

  // Save locally
  writeFileSync(cachedPath, generatedCode, "utf-8");
  console.log(chalk.green(`  ✔ Adapter generated and cached: ${cachedPath}`));

  // Async upload to Firebase (non-blocking — don't fail the apply if this errors)
  uploadToFirebase(hostname, generatedCode).catch(() => {});

  return { hostname, filePath: cachedPath, source: "generated" };
}

/**
 * Dynamically load a generated adapter from a .mjs file.
 * Returns an ATSAdapter-like object or null on failure.
 */
export async function loadGeneratedAdapter(adapterPath: string): Promise<any | null> {
  try {
    // Dynamic import with file:// URL (works for ESM .mjs files)
    const fileUrl = `file://${adapterPath}`;
    const mod = await import(fileUrl);
    // Generated adapters export a default class or named export matching hostname
    const AdapterClass = mod.default || Object.values(mod).find((v: any) => typeof v === "function");
    if (!AdapterClass) return null;
    return new (AdapterClass as any)();
  } catch (err: any) {
    console.log(chalk.yellow(`  ⚠️  Could not load generated adapter: ${err.message}`));
    return null;
  }
}

// ── HTML scraper (headless) ───────────────────────────────────────────────────

async function scrapeFormHtml(url: string): Promise<string> {
  // Lazy import Playwright so it's only required when actually generating
  const { chromium } = await import("playwright-core");

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });

    // Wait for form elements to appear
    await page.waitForSelector("form, input, textarea, select", { timeout: 10_000 }).catch(() => {});
    await page.waitForTimeout(2000); // let React/SPA settle

    // Extract a minimal HTML skeleton (forms + inputs only, strip noise)
    const formHtml = await page.evaluate(() => {
      const clone = document.body.cloneNode(true) as HTMLElement;

      // Remove scripts, styles, SVGs, images — keep only structure
      ["script", "style", "svg", "img", "video", "noscript"].forEach((tag) => {
        clone.querySelectorAll(tag).forEach((el) => el.remove());
      });

      // Focus on form elements and their labels
      const forms = clone.querySelectorAll("form");
      if (forms.length > 0) {
        return Array.from(forms).map((f) => f.outerHTML).join("\n\n");
      }

      // No <form> tags — grab all inputs/labels (SPAs often skip <form>)
      const container = clone.querySelector("main, [role=main], #root, body") || clone;
      return (container as HTMLElement).innerHTML.substring(0, 8000);
    });

    return formHtml.substring(0, 6000); // Cap at 6KB to fit in one Gemini request
  } finally {
    await browser.close();
  }
}

// ── Gemini adapter code generation ───────────────────────────────────────────

async function generateAdapterCode(
  url: string,
  hostname: string,
  apiKey: string,
  model: string,
): Promise<string | null> {
  let formHtml: string;

  try {
    console.log(chalk.dim("     Scraping form structure..."));
    formHtml = await scrapeFormHtml(url);
  } catch (err: any) {
    console.log(chalk.yellow(`  ⚠️  Could not scrape form: ${err.message}`));
    formHtml = "(Could not scrape form HTML — generate a generic adapter)";
  }

  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey });

  const className = toClassName(hostname);
  const prompt = `You are an expert Playwright automation engineer generating ATS form fill adapters.

Given the following ATS form HTML and the ATSAdapter TypeScript interface, generate a complete
JavaScript ESM module (NOT TypeScript — it will be loaded with dynamic import() directly).

Requirements:
- Export a default class named ${className}Adapter
- The class must implement all methods of ATSAdapter
- fillFromProfile should map known label patterns to ApplyProfile keys
- Use Playwright locators: page.getByLabel(), page.getByPlaceholder(), page.locator()
- Add humanType delays: await new Promise(r => setTimeout(r, 200 + Math.random() * 300))
- The platform property should be: "${hostname}"
- Import Page from "playwright-core" using: /** @type {import('playwright').Page} */
- Use JSDoc type annotations instead of TypeScript syntax (this is plain JavaScript)
- Do NOT use TypeScript syntax (no interface, no type annotations with :, no import type)
- The output must be a complete, standalone .mjs file

ATS Form HTML:
\`\`\`html
${formHtml}
\`\`\`

ATSAdapter Interface (for reference):
\`\`\`
${ADAPTER_INTERFACE}
\`\`\`

Return ONLY the JavaScript code. No markdown fences, no explanation.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const raw = (response.text || "").trim()
      .replace(/^```(?:javascript|js|mjs)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();

    if (!raw || raw.length < 100) {
      console.log(chalk.yellow("  ⚠️  Gemini returned empty adapter code."));
      return null;
    }

    // Prepend a comment header for traceability
    const header = `// Generated adapter for: ${hostname}\n// Model: ${model}\n// Generated: ${new Date().toISOString()}\n\n`;
    return header + raw;
  } catch (err: any) {
    console.log(chalk.yellow(`  ⚠️  Gemini adapter generation failed: ${err.message}`));
    return null;
  }
}

// ── Firebase Storage — user memory space ──────────────────────────────────────
//
// Adapters are stored at:
//   gs://<CAREERVIVID_BUCKET>/users/<uid>/adapters/<hostname>.mjs
//
// This uses the CareerVivid API (same auth as cv login) — no Firebase SDK needed
// in the CLI. The server-side CareerVivid API handles Firebase Admin auth.

async function tryLoadFromFirebase(hostname: string): Promise<string | null> {
  try {
    const { getApiKey, getApiUrl } = await import("../config.js");
    const apiKey = getApiKey();
    if (!apiKey) return null;

    const baseUrl = getApiUrl();
    const resp = await fetch(`${baseUrl}/adapters/${encodeURIComponent(hostname)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!resp.ok) return null;

    const data = await resp.json() as { code?: string };
    return data.code || null;
  } catch {
    return null; // Firebase lookup is best-effort
  }
}

async function uploadToFirebase(hostname: string, code: string): Promise<void> {
  try {
    const { getApiKey, getApiUrl } = await import("../config.js");
    const apiKey = getApiKey();
    if (!apiKey) return;

    const baseUrl = getApiUrl();
    await fetch(`${baseUrl}/adapters/${encodeURIComponent(hostname)}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code, hostname, generatedAt: new Date().toISOString() }),
    });
  } catch {
    // Upload failure is silent — local cache is the source of truth
  }
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function extractHostname(url: string): string | null {
  try {
    const parsed = new URL(url);
    // Strip www. prefix and use just the registrable domain part
    return parsed.hostname.replace(/^www\./, "").replace(/[^a-zA-Z0-9.-]/g, "");
  } catch {
    return null;
  }
}

function toClassName(hostname: string): string {
  // "jobs.ashbyhq.com" → "JobsAshbyhqCom"
  return hostname
    .split(/[.-]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function ensureAdapterCacheDir(): void {
  if (!existsSync(ADAPTER_CACHE_DIR)) {
    mkdirSync(ADAPTER_CACHE_DIR, { recursive: true });
  }
}

/**
 * List all locally cached adapters (for debugging / cv agent --jobs info).
 */
export function listCachedAdapters(): Array<{ hostname: string; path: string }> {
  if (!existsSync(ADAPTER_CACHE_DIR)) return [];
  const { readdirSync } = require("fs");
  return readdirSync(ADAPTER_CACHE_DIR)
    .filter((f: string) => f.endsWith(".mjs"))
    .map((f: string) => ({
      hostname: f.replace(".mjs", ""),
      path: join(ADAPTER_CACHE_DIR, f),
    }));
}
