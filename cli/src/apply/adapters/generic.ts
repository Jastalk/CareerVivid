/**
 * Generic ATS Adapter
 *
 * Fallback adapter for any form-based ATS that isn't specifically handled.
 * Uses broad CSS selectors to extract and fill standard HTML form inputs.
 *
 * Works reasonably well for: SmartRecruiters, iCIMS, JazzHR, BambooHR,
 * Breezy, Pinpoint, and company-hosted career sites.
 */

import type { Page } from "playwright-core";
import type { ATSAdapter, FormField } from "../index.js";
import type { ApplyProfile } from "../gemini-agent.js";
import { humanType, humanDelay } from "../browser.js";
import chalk from "chalk";

// ── Label → Profile key map ──────────────────────────────────────────────────

interface GenericLabelMapping {
  labelPattern: RegExp;
  placeholderPattern?: RegExp;
  key: string;
  buildValue?: (profile: ApplyProfile) => string | undefined;
}

const GENERIC_LABEL_MAP: GenericLabelMapping[] = [
  {
    labelPattern: /^(full\s*)?(legal\s*)?name\s*$/i,
    placeholderPattern: /full name|your name/i,
    key: "firstName",
    buildValue: (p) => [p.firstName, p.lastName].filter(Boolean).join(" ") || undefined,
  },
  { labelPattern: /^first\s*name/i, key: "firstName" },
  { labelPattern: /^last\s*name/i, key: "lastName" },
  {
    labelPattern: /^email/i,
    placeholderPattern: /email|@/i,
    key: "email",
  },
  {
    labelPattern: /^phone|^mobile|^telephone/i,
    placeholderPattern: /phone|mobile|\d{3}/i,
    key: "phone",
  },
  {
    labelPattern: /^linkedin/i,
    placeholderPattern: /linkedin\.com/i,
    key: "linkedin",
  },
  {
    labelPattern: /^github/i,
    placeholderPattern: /github\.com/i,
    key: "github",
  },
  {
    labelPattern: /^(website|portfolio|personal)/i,
    key: "portfolio",
  },
  { labelPattern: /^(city|location)/i, key: "city" },
  { labelPattern: /^state|^province/i, key: "state" },
  { labelPattern: /^(current\s*)?(company|employer)/i, key: "currentCompany" },
  { labelPattern: /^(current\s*)?(title|position|role)/i, key: "currentTitle" },
];

export class GenericAdapter implements ATSAdapter {
  platform = "generic" as const;

  async navigateToForm(page: Page, jobUrl: string): Promise<void> {
    await page.goto(jobUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await humanDelay(1500, 2500);

    // Look for common "Apply" CTAs
    const applySelectors = [
      "a:has-text('Apply Now')",
      "button:has-text('Apply Now')",
      "a:has-text('Apply for this job')",
      "a:has-text('Apply for this position')",
      "button:has-text('Apply')",
      "a[href*='apply']",
    ];

    for (const sel of applySelectors) {
      const btn = page.locator(sel).first();
      if (await btn.isVisible({ timeout: 1500 }).catch(() => false)) {
        await btn.click();
        await page.waitForLoadState("domcontentloaded");
        await humanDelay(1000, 2000);
        break;
      }
    }
  }

  // ── Fill standard fields from saved user profile ───────────────────────────

  async fillFromProfile(page: Page, profile: ApplyProfile): Promise<{
    filled: string[];
    skipped: string[];
  }> {
    const filled: string[] = [];
    const skipped: string[] = [];

    // Wait for any form to appear
    await page.waitForSelector("form", { timeout: 15_000 }).catch(() => {});
    await humanDelay(800, 1500);

    for (const mapping of GENERIC_LABEL_MAP) {
      let value = mapping.buildValue
        ? mapping.buildValue(profile)
        : (profile as Record<string, string | undefined>)[mapping.key];
      if (!value) continue;

      try {
        // Strategy 1: Try getByLabel
        let el = page.getByLabel(mapping.labelPattern).first();
        let isVisible = await el.isVisible({ timeout: 2000 }).catch(() => false);

        // Strategy 2: Try getByPlaceholder
        if (!isVisible && mapping.placeholderPattern) {
          el = page.getByPlaceholder(mapping.placeholderPattern).first();
          isVisible = await el.isVisible({ timeout: 2000 }).catch(() => false);
        }

        if (!isVisible) {
          skipped.push(mapping.key);
          continue;
        }

        const tagName = await el.evaluate((n: Element) => n.tagName.toLowerCase());

        if (tagName === "select") {
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

    return { filled, skipped };
  }

  async extractFields(page: Page): Promise<FormField[]> {
    // Wait for any form to appear
    await page.waitForSelector("form", { timeout: 15_000 }).catch(() => {});
    await humanDelay(800, 1500);

    const fields = await page.evaluate(() => {
      const results: any[] = [];
      const seen = new Set<string>();

      // Get all visible inputs from the page
      const inputs = document.querySelectorAll<HTMLElement>(
        "form input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=reset]), " +
        "form textarea, " +
        "form select"
      );

      inputs.forEach((el, idx) => {
        const input = el as HTMLInputElement;
        const type = input.type || "text";

        // Build a unique selector
        const id = input.id || input.name;
        const selector = input.id
          ? `#${input.id}`
          : input.name
          ? `[name="${input.name}"]`
          : null;

        if (!selector || seen.has(selector)) return;
        seen.add(selector);

        // Find the label
        let label = "";
        if (input.id) {
          const lbl = document.querySelector<HTMLLabelElement>(`label[for="${input.id}"]`);
          if (lbl) label = lbl.innerText.trim();
        }
        if (!label) {
          // Walk up to parent and find label
          const parent = input.closest("div, li, fieldset, .field, .form-group, .input-wrapper");
          if (parent) {
            const lbl = parent.querySelector<HTMLElement>("label, legend");
            if (lbl) label = lbl.innerText.trim();
          }
        }
        if (!label) label = input.placeholder || input.name || input.id || `Field ${idx + 1}`;

        const isSelect = el.tagName === "SELECT";
        const isTextarea = el.tagName === "TEXTAREA";

        let options: string[] | undefined;
        if (isSelect) {
          options = Array.from((el as HTMLSelectElement).options)
            .map((o) => o.text.trim())
            .filter((t) => t.length > 0 && !["select", "choose", "please"].some((k) => t.toLowerCase().startsWith(k)));
        }

        results.push({
          id: id || `field-${idx}`,
          label: label.replace(/\s*\*\s*$/, "").trim(), // remove required asterisk
          type: isTextarea ? "textarea" : isSelect ? "select" : type,
          selector,
          required: input.required,
          options,
          placeholder: (input as HTMLInputElement).placeholder || "",
        });
      });

      return results;
    });

    return fields as FormField[];
  }

  async fillField(page: Page, field: FormField, answer: string): Promise<void> {
    await humanDelay(300, 800);

    try {
      if (["textarea", "text", "email", "tel", "url", "number"].includes(field.type)) {
        await humanType(page, field.selector, answer);
      } else if (field.type === "select") {
        await page.selectOption(field.selector, { label: answer }).catch(async () => {
          const options = await page.locator(`${field.selector} option`).allTextContents();
          const match = options.find((o) => o.toLowerCase().includes(answer.toLowerCase()));
          if (match) await page.selectOption(field.selector, { label: match });
        });
      } else if (field.type === "checkbox") {
        const isYes = /^(yes|true|1|agree|i agree|accept)/i.test(answer);
        const checked = await page.isChecked(field.selector).catch(() => false);
        if (isYes && !checked) await page.check(field.selector);
        else if (!isYes && checked) await page.uncheck(field.selector);
      } else if (field.type === "radio") {
        const radios = page.locator(`[name="${field.id}"]`);
        const count = await radios.count();
        for (let i = 0; i < count; i++) {
          const val = await radios.nth(i).getAttribute("value");
          const htmlId = await radios.nth(i).getAttribute("id");
          const lbl = htmlId ? await page.locator(`label[for="${htmlId}"]`).textContent().catch(() => "") : val;
          if (lbl && lbl.toLowerCase().includes(answer.toLowerCase())) {
            await radios.nth(i).check();
            break;
          }
        }
      }
    } catch (err: any) {
      // Non-fatal — log and continue
      console.warn(`  ⚠ Could not fill field "${field.label}": ${err.message}`);
    }
  }

  async submit(page: Page): Promise<void> {
    const submitSelectors = [
      "button[type=submit]:has-text('Submit')",
      "input[type=submit]",
      "button:has-text('Submit application')",
      "button:has-text('Submit Application')",
      "button:has-text('Submit')",
      "button[type=submit]",
    ];

    for (const sel of submitSelectors) {
      const btn = page.locator(sel).first();
      if (await btn.isVisible({ timeout: 1500 }).catch(() => false)) {
        await btn.scrollIntoViewIfNeeded();
        await humanDelay(600, 1200);
        await btn.click();
        await page.waitForLoadState("domcontentloaded", { timeout: 20_000 }).catch(() => {});
        return;
      }
    }

    throw new Error("Could not find a submit button on this page.");
  }
}
