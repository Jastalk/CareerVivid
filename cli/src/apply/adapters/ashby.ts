/**
 * Ashby ATS Adapter
 *
 * Handles job application forms on jobs.ashbyhq.com
 * Ashby uses a React SPA with dynamically rendered form fields.
 */

import type { Page } from "playwright-core";
import type { ATSAdapter, FormField } from "../index.js";
import type { ApplyProfile } from "../gemini-agent.js";
import { humanType, humanDelay } from "../browser.js";
import chalk from "chalk";

// ── Label → Profile key map ──────────────────────────────────────────────────
// Ashby forms use a mix of <label> text, placeholder text, and aria-label.
// We try getByLabel first, then getByPlaceholder for each mapping.

interface AshbyLabelMapping {
  labelPattern: RegExp;
  placeholderPattern?: RegExp;
  key: string; // key of ApplyProfile
  buildValue?: (profile: ApplyProfile) => string | undefined;
}

const ASHBY_LABEL_MAP: AshbyLabelMapping[] = [
  {
    labelPattern: /^name\s*$/i,
    placeholderPattern: /type here/i,
    key: "firstName",
    buildValue: (p) => [p.firstName, p.lastName].filter(Boolean).join(" ") || undefined,
  },
  { labelPattern: /^first\s*name/i, key: "firstName" },
  { labelPattern: /^last\s*name/i, key: "lastName" },
  {
    labelPattern: /^email/i,
    placeholderPattern: /hello@example|email/i,
    key: "email",
  },
  {
    labelPattern: /^phone|^mobile/i,
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
    placeholderPattern: /https?:\/\//i,
    key: "portfolio",
  },
  { labelPattern: /^(current\s*)?(company|employer)/i, key: "currentCompany" },
  { labelPattern: /^(current\s*)?(title|position|role)/i, key: "currentTitle" },
  { labelPattern: /^(city|location)/i, key: "city" },
];

export class AshbyAdapter implements ATSAdapter {
  platform = "ashby" as const;

  async navigateToForm(page: Page, jobUrl: string): Promise<void> {
    // Ashby application URLs usually end with /application
    let appUrl = jobUrl;
    if (!appUrl.includes("/application")) {
      appUrl = appUrl.replace(/\/$/, "") + "/application";
    }

    await page.goto(appUrl, { waitUntil: "networkidle", timeout: 30_000 });
    await humanDelay(1500, 2500);

    // Ashby job listing pages may still have an "Apply" button
    const applyBtn = page.locator("button:has-text('Apply'), a:has-text('Apply Now'), button:has-text('Apply Now')").first();
    if (await applyBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      await applyBtn.click();
      await humanDelay(1500, 2500);
      await page.waitForLoadState("networkidle").catch(() => {});
    }
  }

  // ── Fill standard fields from saved user profile ───────────────────────────
  //
  // Uses a dual strategy: getByLabel() first, then getByPlaceholder() fallback.
  // Ashby's React SPA often has labels like "Name*" with placeholder "Type here..."

  async fillFromProfile(page: Page, profile: ApplyProfile): Promise<{
    filled: string[];
    skipped: string[];
  }> {
    const filled: string[] = [];
    const skipped: string[] = [];

    // Wait for the form to render (Ashby is a React SPA)
    await page.waitForSelector("form, [data-testid='application-form'], .ashby-application-form", {
      timeout: 15_000,
    }).catch(() => {});
    await humanDelay(800, 1500);

    for (const mapping of ASHBY_LABEL_MAP) {
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
    // Ashby loads dynamically — wait for the form to appear
    await page.waitForSelector("form, [data-testid='application-form'], .ashby-application-form", {
      timeout: 20_000,
    }).catch(() => {});

    await humanDelay(800, 1500); // let React settle

    const fields = await page.evaluate(() => {
      const results: any[] = [];
      const labels = document.querySelectorAll<HTMLLabelElement>("label");

      labels.forEach((lbl, idx) => {
        const forAttr = lbl.getAttribute("for");
        const labelText = lbl.innerText.trim().replace(/\s*\*\s*$/, ""); // strip asterisk

        let input: HTMLElement | null = null;
        if (forAttr) {
          input = document.getElementById(forAttr);
        } else {
          // Try sibling or child
          input = lbl.nextElementSibling?.querySelector?.("input, textarea, select") as HTMLElement
            || lbl.querySelector("input, textarea, select") as HTMLElement;
        }

        if (!input) return;
        const tag = input.tagName;
        if (tag === "BUTTON" || (input as HTMLInputElement).type === "hidden") return;

        const isSelect = tag === "SELECT";
        const isTextarea = tag === "TEXTAREA";
        const inputType = (input as HTMLInputElement).type || "text";

        const selector = input.id
          ? `#${input.id}`
          : input.getAttribute("name")
          ? `[name="${input.getAttribute("name")}"]`
          : `label:nth-of-type(${idx + 1}) + * input`;

        let options: string[] | undefined;
        if (isSelect) {
          options = Array.from((input as HTMLSelectElement).options)
            .map((o) => o.text.trim())
            .filter((t) => t && !["select", "choose", "please"].some((k) => t.toLowerCase().startsWith(k)));
        }

        results.push({
          id: input.id || input.getAttribute("name") || `ashby-${idx}`,
          label: labelText,
          type: isTextarea ? "textarea" : isSelect ? "select" : inputType,
          selector,
          required: (input as HTMLInputElement).required || lbl.innerText.includes("*"),
          options,
          placeholder: (input as HTMLInputElement).placeholder || "",
        });
      });

      return results;
    });

    return fields as FormField[];
  }

  async fillField(page: Page, field: FormField, answer: string): Promise<void> {
    await humanDelay(400, 900);

    if (["textarea", "text", "email", "tel", "url"].includes(field.type)) {
      await humanType(page, field.selector, answer);
    } else if (field.type === "select") {
      await page.selectOption(field.selector, { label: answer }).catch(async () => {
        const options = await page.locator(`${field.selector} option`).allTextContents();
        const match = options.find((o) => o.toLowerCase().includes(answer.toLowerCase()));
        if (match) await page.selectOption(field.selector, { label: match });
      });
    } else if (field.type === "radio") {
      // Ashby sometimes uses custom radio buttons (div-based)
      const radioLabel = page.locator(`label:has-text("${answer}"), [role=radio]:has-text("${answer}")`).first();
      if (await radioLabel.isVisible({ timeout: 2000 }).catch(() => false)) {
        await radioLabel.click();
      }
    } else if (field.type === "checkbox") {
      const isYes = /^(yes|true|1|agree)/i.test(answer);
      const checked = await page.isChecked(field.selector).catch(() => false);
      if (isYes && !checked) await page.check(field.selector);
      else if (!isYes && checked) await page.uncheck(field.selector);
    }
  }

  async submit(page: Page): Promise<void> {
    const submitBtn = page.locator(
      "button[type=submit]:has-text('Submit'), button:has-text('Submit Application'), button:has-text('Apply')"
    ).last(); // Ashby often has "Apply" at bottom
    await submitBtn.scrollIntoViewIfNeeded();
    await humanDelay(600, 1200);
    await submitBtn.click();
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
  }
}
