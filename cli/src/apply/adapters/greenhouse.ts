/**
 * Greenhouse ATS Adapter
 *
 * Handles job application forms on boards.greenhouse.io AND Stripe/company-hosted
 * pages that embed Greenhouse forms (e.g. stripe.com/jobs/listing/.../apply).
 *
 * Strategy:
 *  1. fillFromProfile() — uses Playwright getByLabel() to fill standard fields
 *     from the user's saved profile without needing Gemini.
 *  2. extractFields() — CSS fallback for passing field list to Gemini agent.
 *  3. fillField() — fills a single field by selector (used by Gemini agent actions).
 */

import type { Page } from "playwright-core";
import type { ATSAdapter, FormField } from "../index.js";
import type { ApplyProfile } from "../gemini-agent.js";
import { humanDelay } from "../browser.js";
import chalk from "chalk";

// ── Label → Profile key map ──────────────────────────────────────────────────
//
// Each entry: { pattern to match label text, profile key, optional transform }
// We use getByLabel() which finds the input associated with a <label> element.

interface LabelMapping {
  pattern: RegExp;
  key: string; // keyof ApplyProfile — kept as string to avoid index-type TS errors
  transform?: (v: string) => string;
}

const LABEL_MAP: LabelMapping[] = [
  { pattern: /^first\s*name/i, key: "firstName" },
  { pattern: /^last\s*name/i, key: "lastName" },
  { pattern: /^(full\s*)?(legal\s*)?name$/i, key: "firstName", transform: (v) => v }, // full name — use firstName+lastName
  { pattern: /^email/i, key: "email" },
  { pattern: /^phone|^mobile|^telephone/i, key: "phone" },
  { pattern: /^(city|location\s*\(city\))/i, key: "city" },
  { pattern: /^state|^province/i, key: "state" },
  { pattern: /^(linkedin|linkedin url)/i, key: "linkedin" },
  { pattern: /^(github|github url)/i, key: "github" },
  { pattern: /^(website|portfolio|personal site)/i, key: "portfolio" },
  { pattern: /^(current\s*)?(company|employer)/i, key: "currentCompany" },
  { pattern: /^(current\s*)?(title|position|role)/i, key: "currentTitle" },
  { pattern: /^(expected\s*|desired\s*)?salary/i, key: "salaryExpectation" },
  { pattern: /^years\s*of\s*experience/i, key: "yearsOfExperience" },
];

// EEO / compliance dropdowns — pick "prefer not to answer" style options
const EEO_LABELS = /gender|race|ethnicity|veteran|disability|pronouns/i;
const EEO_DECLINE_VALUES = [
  "I don't wish to answer",
  "Decline to self-identify",
  "Prefer not to say",
  "I prefer not to say",
  "Prefer not to answer",
  "Decline",
  "Choose not to disclose",
];

export class GreenhouseAdapter implements ATSAdapter {
  platform = "greenhouse" as const;

  // ── 1. Navigate to application form ────────────────────────────────────────

  async navigateToForm(page: Page, jobUrl: string): Promise<void> {
    const appUrl = this.resolveApplicationUrl(jobUrl);
    console.log(chalk.dim(`   → ${appUrl}`));

    await page.goto(appUrl, {
      waitUntil: "networkidle",
      timeout: 45_000,
    });
    await humanDelay(1200, 2000);
  }

  private resolveApplicationUrl(jobUrl: string): string {
    const url = jobUrl.split("?")[0].replace(/\/$/, "");

    // Already on an /apply or /application page — use as-is
    if (/\/(apply|application)/.test(url)) return url;

    // boards.greenhouse.io/company/jobs/12345 → .../jobs/12345/application
    if (/boards\.greenhouse\.io\/.+\/jobs\/\d+$/.test(url)) {
      return url + "/application";
    }

    // Company-hosted: stripe.com/jobs/listing/.../ID  → .../ID/apply  (Stripe pattern)
    // These host Greenhouse iframes or embedded forms — navigate to /apply
    if (/\/jobs\/(listing|posting)\/[^/]+\/\d+$/.test(url)) {
      return url + "/apply";
    }

    return url;
  }

  // ── 2. Fill standard fields from saved user profile ─────────────────────────
  //
  // Uses Playwright's getByLabel() which reliably maps label text → input,
  // regardless of the specific HTML structure or field IDs.

  async fillFromProfile(page: Page, profile: ApplyProfile): Promise<{
    filled: string[];
    skipped: string[];
  }> {
    const filled: string[] = [];
    const skipped: string[] = [];

    for (const mapping of LABEL_MAP) {
      let value = (profile as Record<string, string | undefined>)[mapping.key];
      if (!value) {
        // Special case: full name = firstName + lastName
        if (/full\s*name|legal\s*name/i.test(mapping.pattern.source)) {
          value = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || undefined;
        }
        if (!value) continue;
      }

      if (mapping.transform) value = mapping.transform(value);

      try {
        const el = page.getByLabel(mapping.pattern).first();
        const isVisible = await el.isVisible({ timeout: 2000 }).catch(() => false);
        if (!isVisible) { skipped.push(mapping.key); continue; }

        const tagName = await el.evaluate((n: Element) => n.tagName.toLowerCase());

        if (tagName === "select") {
          // Try exact option text, then partial match
          await el.selectOption({ label: value }).catch(async () => {
            const options = await el.locator("option").allTextContents();
            const match = options.find((o) => o.toLowerCase().includes(value!.toLowerCase()));
            if (match) await el.selectOption({ label: match });
          });
        } else {
          await el.fill("");
          await el.pressSequentially(value, { delay: 35 + Math.random() * 50 });
        }

        console.log(chalk.dim(`   ✓ ${chalk.white(mapping.key)}: ${value.substring(0, 50)}`));
        filled.push(mapping.key);
        await humanDelay(150, 400);
      } catch {
        skipped.push(mapping.key);
      }
    }

    // Handle Country dropdown separately (Greenhouse uses a <select>)
    if (profile.country) {
      await this.fillCountry(page, profile.country).then((ok) => {
        if (ok) filled.push("country");
      }).catch(() => {});
    }

    // Handle work authorization radios / selects
    if (profile.workAuthorization) {
      await this.fillWorkAuth(page, profile.workAuthorization).catch(() => {});
    }

    // Handle EEO dropdowns — auto-decline
    await this.fillEEOFields(page).catch(() => {});

    return { filled, skipped };
  }

  private async fillCountry(page: Page, country: string): Promise<boolean> {
    // Greenhouse country selects are often labeled "Country" or unlabeled
    const countryEl = page.getByLabel(/country/i).first();
    const isVisible = await countryEl.isVisible({ timeout: 2000 }).catch(() => false);
    if (!isVisible) return false;

    await countryEl.selectOption({ label: country }).catch(async () => {
      const options = await countryEl.locator("option").allTextContents();
      const match = options.find((o) => o.toLowerCase().includes(country.toLowerCase()));
      if (match) await countryEl.selectOption({ label: match });
    });
    console.log(chalk.dim(`   ✓ country: ${country}`));
    return true;
  }

  private async fillWorkAuth(page: Page, workAuth: string): Promise<void> {
    const authEl = page.getByLabel(/work authorization|authorized to work|visa|sponsorship/i).first();
    const isVisible = await authEl.isVisible({ timeout: 2000 }).catch(() => false);
    if (!isVisible) return;

    const tagName = await authEl.evaluate((n: Element) => n.tagName.toLowerCase());
    if (tagName === "select") {
      await authEl.selectOption({ label: workAuth }).catch(async () => {
        const options = await authEl.locator("option").allTextContents();
        const match = options.find((o) => o.toLowerCase().includes(workAuth.toLowerCase()));
        if (match) await authEl.selectOption({ label: match });
      });
      console.log(chalk.dim(`   ✓ workAuthorization: ${workAuth}`));
    }
  }

  private async fillEEOFields(page: Page): Promise<void> {
    // Find all selects on the page whose associated label matches EEO patterns
    const selects = page.locator("select");
    const count = await selects.count();

    for (let i = 0; i < count; i++) {
      const sel = selects.nth(i);
      // Get aria-label or associated label text
      const ariaLabel = await sel.getAttribute("aria-label").catch(() => "");
      const labelId = await sel.getAttribute("aria-labelledby").catch(() => "");
      const id = await sel.getAttribute("id").catch(() => "");

      let labelText = ariaLabel || "";
      if (!labelText && id) {
        const lbl = await page.locator(`label[for="${id}"]`).textContent().catch(() => "");
        labelText = lbl || "";
      }

      if (!EEO_LABELS.test(labelText)) continue;

      // Try to select a "decline" option
      const options = await sel.locator("option").allTextContents();
      const declineOpt = options.find((o) =>
        EEO_DECLINE_VALUES.some((d) => o.toLowerCase().includes(d.toLowerCase()))
      );
      if (declineOpt) {
        await sel.selectOption({ label: declineOpt }).catch(() => {});
        console.log(chalk.dim(`   ✓ EEO "${labelText?.trim()}": ${declineOpt}`));
      }
    }
  }

  // ── 3. Extract fields (CSS fallback for Gemini agent) ──────────────────────

  async extractFields(page: Page): Promise<FormField[]> {
    const formExists = await page.waitForSelector(
      "#application-form, form[id*='application'], #main-content form, form",
      { timeout: 20_000 }
    ).then(() => true).catch(() => false);

    if (!formExists) return [];

    return page.evaluate(() => {
      const results: any[] = [];
      const formContainer =
        document.querySelector("#application-form") ||
        document.querySelector("form[id*='application']") ||
        document.querySelector("#main-content form") ||
        document.querySelector("form");
      if (!formContainer) return results;

      formContainer.querySelectorAll<HTMLElement>(
        "input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=reset]), textarea, select"
      ).forEach((el) => {
        const input = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
        const id = input.id || input.name || "";
        const type = (input as HTMLInputElement).type || "text";
        let label = "";
        if (input.id) {
          const lbl = document.querySelector<HTMLLabelElement>(`label[for="${input.id}"]`);
          if (lbl) label = lbl.innerText.trim();
        }
        if (!label) {
          const parent = input.closest(".field,.form-group,[class*='field'],li,div");
          if (parent) { const lbl = parent.querySelector("label"); if (lbl) label = lbl.innerText.trim(); }
        }
        if (!label) label = (input as HTMLInputElement).placeholder || input.name || id;
        const isTextarea = el.tagName === "TEXTAREA";
        const isSelect = el.tagName === "SELECT";
        let options: string[] | undefined;
        if (isSelect) options = Array.from((el as HTMLSelectElement).options).map((o) => o.text.trim()).filter((t) => t && !["Select…","Please select","--",""].includes(t));
        const selector = id ? (input.id ? `#${input.id}` : `[name="${input.name}"]`) : "";
        if (!selector) return;
        if (type === "file") { results.push({ id, label: label||"Resume/CV", type:"file", selector, required:input.required, placeholder:"" }); return; }
        results.push({ id, label, type: isTextarea?"textarea":isSelect?"select":"text", selector, required:input.required, options, placeholder:(input as HTMLInputElement).placeholder||"" });
      });
      return results;
    }) as Promise<FormField[]>;
  }

  // ── 4. Fill a single field (called by Gemini agent or manual flow) ──────────

  async fillField(page: Page, field: FormField, answer: string): Promise<void> {
    await humanDelay(150, 500);
    if (field.type === "textarea" || field.type === "text") {
      await page.fill(field.selector, "").catch(() => {});
      await page.type(field.selector, answer, { delay: 40 + Math.random() * 60 });
    } else if (field.type === "select") {
      await page.selectOption(field.selector, { label: answer }).catch(async () => {
        const options = await page.locator(`${field.selector} option`).allTextContents();
        const match = options.find((o) => o.toLowerCase().includes(answer.toLowerCase()));
        if (match) await page.selectOption(field.selector, { label: match });
      });
    } else if (field.type === "checkbox") {
      const isYes = /^(yes|true|1|agree)/i.test(answer);
      const checked = await page.isChecked(field.selector).catch(() => false);
      if (isYes && !checked) await page.check(field.selector);
      if (!isYes && checked) await page.uncheck(field.selector);
    } else if (field.type === "radio") {
      const radios = page.locator(`[type=radio][name="${field.id}"]`);
      const count = await radios.count();
      for (let i = 0; i < count; i++) {
        const id2 = await radios.nth(i).getAttribute("id");
        if (!id2) continue;
        const lbl = await page.locator(`label[for="${id2}"]`).textContent().catch(() => "");
        if (lbl && lbl.toLowerCase().includes(answer.toLowerCase())) {
          await radios.nth(i).check();
          break;
        }
      }
    }
  }

  async submit(page: Page): Promise<void> {
    const submitBtn = page.locator(
      "button[type=submit], input[type=submit], button:has-text('Submit application'), button:has-text('Submit')"
    ).first();
    await submitBtn.scrollIntoViewIfNeeded();
    await humanDelay(500, 1000);
    await submitBtn.click();
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
  }
}
