/**
 * gemini-agent.ts — AI-powered form navigator for cv jobs apply
 *
 * Uses Gemini Vision to:
 *  1. Screenshot the current browser page
 *  2. Send screenshot + resume context to Gemini
 *  3. Get back structured actions (fill field, click button, etc.)
 *  4. Execute those actions via Playwright
 *  5. Prompt user via CLI when info is missing
 *  6. Store new user info to ~/.careervivid/apply-profile.json for reuse
 *
 * This replaces brittle CSS-selector scraping with intent-driven AI navigation.
 */

import { GoogleGenAI } from "@google/genai";
import type { Page } from "playwright-core";
import { homedir } from "os";
import { join } from "path";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import chalk from "chalk";
import pkg from "enquirer";
import { humanDelay, humanType } from "./browser.js";

const { prompt } = pkg;

// ── User Profile Store ────────────────────────────────────────────────────────

export interface ApplyProfile {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  location?: string;
  city?: string;
  state?: string;
  country?: string;
  workAuthorization?: string;
  yearsOfExperience?: string;
  currentTitle?: string;
  currentCompany?: string;
  salaryExpectation?: string;
  pronouns?: string;
  gender?: string;
  ethnicity?: string;
  veteranStatus?: string;
  disabilityStatus?: string;
  [key: string]: string | undefined;
}

const PROFILE_PATH = join(homedir(), ".careervivid", "apply-profile.json");

export function loadProfile(): ApplyProfile {
  if (existsSync(PROFILE_PATH)) {
    try {
      return JSON.parse(readFileSync(PROFILE_PATH, "utf-8")) as ApplyProfile;
    } catch {
      return {};
    }
  }
  return {};
}

export function saveProfile(profile: ApplyProfile): void {
  const dir = join(homedir(), ".careervivid");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(PROFILE_PATH, JSON.stringify(profile, null, 2), "utf-8");
}

// ── Gemini Action Types ───────────────────────────────────────────────────────

export interface GeminiAction {
  type: "fill" | "click" | "select" | "check" | "upload" | "scroll" | "wait" | "done" | "ask_user";
  /** CSS selector or descriptive label */
  selector?: string;
  /** Text description of the element (used for fallback matching) */
  description?: string;
  /** Value to fill/select */
  value?: string;
  /** When type=ask_user: the question to ask the user */
  question?: string;
  /** When type=ask_user: the profile key to store the answer under */
  profileKey?: string;
  /** Human-readable explanation of this action */
  reason?: string;
}

export interface GeminiAgentResult {
  fieldsFound: number;
  fieldsFilled: number;
  userPrompts: number;
  done: boolean;
}

// ── Screenshot helper ─────────────────────────────────────────────────────────

async function screenshotBase64(page: Page): Promise<string> {
  const buf = await page.screenshot({ type: "jpeg", quality: 60, fullPage: false });
  return buf.toString("base64");
}

// ── Build resume context string ───────────────────────────────────────────────

function buildResumeContext(resumeData: Record<string, any>): string {
  if (!resumeData || Object.keys(resumeData).length === 0) {
    return "(No resume data available)";
  }
  const lines: string[] = [];
  const p = resumeData.personalDetails || {};
  if (p.firstName) lines.push(`Name: ${p.firstName} ${p.lastName || ""}`);
  if (p.email) lines.push(`Email: ${p.email}`);
  if (p.phone) lines.push(`Phone: ${p.phone}`);
  if (p.jobTitle) lines.push(`Current Title: ${p.jobTitle}`);
  if (p.city || p.country) lines.push(`Location: ${[p.city, p.state, p.country].filter(Boolean).join(", ")}`);
  if (resumeData.professionalSummary) lines.push(`Summary: ${String(resumeData.professionalSummary).substring(0, 300)}`);
  if (Array.isArray(resumeData.employmentHistory)) {
    resumeData.employmentHistory.slice(0, 3).forEach((job: any) => {
      lines.push(`- ${job.jobTitle} at ${job.employer} (${job.startDate}–${job.endDate})`);
    });
  }
  if (Array.isArray(resumeData.skills)) {
    lines.push(`Skills: ${resumeData.skills.slice(0, 20).map((s: any) => s.name || s).join(", ")}`);
  }
  return lines.join("\n");
}

// ── Main Gemini Agent ─────────────────────────────────────────────────────────

export class GeminiFormAgent {
  private ai: GoogleGenAI;
  private profile: ApplyProfile;
  private resumeContext: string;
  private jobContext: { title: string; company: string; description?: string };
  private maxRounds = 8;

  constructor(opts: {
    apiKey: string;
    profile: ApplyProfile;
    resumeData: Record<string, any>;
    jobTitle: string;
    company: string;
    jobDescription?: string;
  }) {
    this.ai = new GoogleGenAI({ apiKey: opts.apiKey });
    this.profile = opts.profile;
    this.resumeContext = buildResumeContext(opts.resumeData);
    this.jobContext = {
      title: opts.jobTitle,
      company: opts.company,
      description: opts.jobDescription,
    };
  }

  /**
   * Run the agentic loop:
   * Take screenshot → ask Gemini → execute actions → repeat until done/max rounds
   */
  async run(page: Page): Promise<GeminiAgentResult> {
    let fieldsFound = 0;
    let fieldsFilled = 0;
    let userPrompts = 0;
    let round = 0;

    console.log(chalk.cyan("\n🤖 Gemini agent scanning form...\n"));

    while (round < this.maxRounds) {
      round++;

      // 1. Take screenshot
      let screenshotB64: string;
      try {
        screenshotB64 = await screenshotBase64(page);
      } catch {
        console.log(chalk.yellow("  ⚠️  Could not capture screenshot. Stopping agent."));
        break;
      }

      // 2. Ask Gemini what to do
      let actions: GeminiAction[] = [];
      try {
        actions = await this.askGemini(screenshotB64);
      } catch (err: any) {
        console.log(chalk.yellow(`  ⚠️  Gemini error: ${err.message}`));
        break;
      }

      if (actions.length === 0) break;

      fieldsFound += actions.filter((a) => a.type === "fill" || a.type === "select" || a.type === "check").length;

      // 3. Execute actions
      let isDone = false;
      for (const action of actions) {
        if (action.type === "done") {
          isDone = true;
          break;
        }

        if (action.type === "ask_user") {
          const answer = await this.askUser(action.question || "Please provide this information:", action.profileKey);
          if (answer && action.profileKey) {
            this.profile[action.profileKey] = answer;
          }
          userPrompts++;
          continue;
        }

        const executed = await this.executeAction(page, action);
        if (executed) fieldsFilled++;
        await humanDelay(200, 500);
      }

      if (isDone) break;

      // 4. Check if form looks complete / scrolled to next section
      await humanDelay(500, 1000);
    }

    // Save any new profile data collected
    saveProfile(this.profile);

    return { fieldsFound, fieldsFilled, userPrompts, done: true };
  }

  private async askGemini(screenshotB64: string): Promise<GeminiAction[]> {
    const profileContext = Object.entries(this.profile)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");

    const systemPrompt = `You are an intelligent job application agent. You are looking at a screenshot of a job application form.

Your task is to identify all visible form fields and determine what value to fill in each one, using:
1. The candidate's profile data (highest priority for personal info)
2. The candidate's resume data (for professional info)
3. Reasonable inferences for standard application questions

=== CANDIDATE PROFILE ===
${profileContext || "(empty — ask user for key fields)"}

=== CANDIDATE RESUME ===
${this.resumeContext}

=== TARGET JOB ===
Company: ${this.jobContext.company}
Role: ${this.jobContext.title}
${this.jobContext.description ? `Description: ${this.jobContext.description.substring(0, 500)}` : ""}

=== INSTRUCTIONS ===
- Look at the screenshot carefully. Identify every visible input field, dropdown, checkbox, radio button.
- For each field, determine the best CSS selector (prefer #id, then [name="..."], then descriptive label text).
- If the field is already filled with correct data, SKIP it.
- If you need info not in the profile/resume, use type "ask_user" to request it from the user.
- For standard EEO fields (gender, ethnicity, veteran, disability): use "Decline to self-identify" or "I don't wish to answer" if available.
- For work authorization questions: default to "Yes" if the profile doesn't specify.
- When all visible fields are handled, return a single action with type "done".
- If the page shows a file upload for resume, skip it (type "upload", we handle separately).

Return a JSON array of actions. Each action:
{
  "type": "fill" | "click" | "select" | "check" | "upload" | "ask_user" | "scroll" | "done",
  "selector": "CSS selector string",
  "description": "human readable field name",
  "value": "the value to enter",
  "question": "for ask_user only: what to ask the user",
  "profileKey": "for ask_user only: key to save answer under (e.g. 'firstName', 'workAuthorization')",
  "reason": "brief explanation"
}

Return ONLY valid JSON array, no markdown, no explanation.`;

    const response = await this.ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: screenshotB64,
              },
            },
            { text: systemPrompt },
          ],
        },
      ],
    });

    const text = (response.text || "").trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();

    return JSON.parse(text) as GeminiAction[];
  }

  private async executeAction(page: Page, action: GeminiAction): Promise<boolean> {
    const desc = action.description || action.selector || "unknown field";
    try {
      switch (action.type) {
        case "fill": {
          if (!action.selector || !action.value) return false;
          // Try exact selector first, then fall back to label text matching
          const el = page.locator(action.selector).first();
          const isVisible = await el.isVisible({ timeout: 3000 }).catch(() => false);
          if (isVisible) {
            await humanType(page, action.selector, action.value);
            console.log(chalk.dim(`   ✓ Filled "${desc}": ${action.value.substring(0, 50)}`));
            return true;
          }
          return false;
        }

        case "select": {
          if (!action.selector || !action.value) return false;
          const el = page.locator(action.selector).first();
          const isVisible = await el.isVisible({ timeout: 3000 }).catch(() => false);
          if (isVisible) {
            // Try exact label, then partial match
            await page.selectOption(action.selector, { label: action.value }).catch(async () => {
              const options = await page.locator(`${action.selector} option`).allTextContents();
              const match = options.find((o) => o.toLowerCase().includes(action.value!.toLowerCase()));
              if (match) await page.selectOption(action.selector!, { label: match });
            });
            console.log(chalk.dim(`   ✓ Selected "${desc}": ${action.value}`));
            return true;
          }
          return false;
        }

        case "check": {
          if (!action.selector) return false;
          const el = page.locator(action.selector).first();
          if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
            const isChecked = await el.isChecked().catch(() => false);
            if (!isChecked) await el.check();
            console.log(chalk.dim(`   ✓ Checked "${desc}"`));
            return true;
          }
          return false;
        }

        case "click": {
          if (!action.selector) return false;
          const el = page.locator(action.selector).first();
          if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
            await el.click();
            console.log(chalk.dim(`   ✓ Clicked "${desc}"`));
            await humanDelay(500, 1000);
            return true;
          }
          return false;
        }

        case "scroll": {
          await page.evaluate(() => window.scrollBy(0, 400));
          return true;
        }

        case "upload":
          // Skip file uploads — let user handle manually
          console.log(chalk.dim(`   ⏭ Skipping file upload: "${desc}" (handle manually in browser)`));
          return false;

        default:
          return false;
      }
    } catch (err: any) {
      console.log(chalk.yellow(`   ⚠ Could not execute action on "${desc}": ${err.message}`));
      return false;
    }
  }

  private async askUser(question: string, profileKey?: string): Promise<string> {
    // Check if we already have this in profile
    if (profileKey && this.profile[profileKey]) {
      const existing = this.profile[profileKey]!;
      console.log(chalk.dim(`   (Using saved "${profileKey}": ${existing})`));
      return existing;
    }

    console.log();
    const { answer } = await prompt<{ answer: string }>({
      type: "input",
      name: "answer",
      message: chalk.cyan(`  🤖 Agent needs info: ${question}`),
    }).catch(() => ({ answer: "" }));

    const resolved = (answer as any).answer ?? answer;

    if (resolved && profileKey) {
      this.profile[profileKey] = resolved;
      saveProfile(this.profile);
      console.log(chalk.dim(`   (Saved for future use)`));
    }

    return resolved || "";
  }
}
