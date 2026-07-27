/**
 * Lever ATS Adapter
 *
 * Handles job application forms on jobs.lever.co
 * Lever has a clean, consistent form structure.
 */

import type { Page } from "playwright-core";
import type { ATSAdapter, FormField } from "../index.js";
import { humanType, humanDelay } from "../browser.js";

export class LeverAdapter implements ATSAdapter {
  platform = "lever" as const;

  async navigateToForm(page: Page, jobUrl: string): Promise<void> {
    await page.goto(jobUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await humanDelay(1000, 2000);

    // Lever job pages have "Apply for this job" button
    const applyBtn = page.locator("a.template-btn-submit, a:has-text('Apply for this job'), button:has-text('Apply')").first();
    if (await applyBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await applyBtn.click();
      await page.waitForLoadState("domcontentloaded");
      await humanDelay(1200, 2200);
    }
  }

  async extractFields(page: Page): Promise<FormField[]> {
    await page.waitForSelector(".application-form, form.application, [class*='application']", {
      timeout: 15_000,
    }).catch(() => {}); // continue even if not found

    const fields = await page.evaluate(() => {
      const results: any[] = [];
      const formGroups = document.querySelectorAll<HTMLElement>(
        ".application-form .form-group, form .form-group, .lever-application .field"
      );

      formGroups.forEach((group, idx) => {
        const label = group.querySelector<HTMLElement>("label")?.innerText?.trim() || `Field ${idx + 1}`;
        const input = group.querySelector<HTMLInputElement | HTMLTextAreaElement>("input:not([type=hidden]), textarea, select");
        if (!input) return;

        const type = (input as HTMLInputElement).type || "text";
        if (["hidden", "submit", "button"].includes(type)) return;

        const selector = input.id ? `#${input.id}` : `[name="${input.name}"]`;
        const isSelect = input.tagName === "SELECT";
        let options: string[] | undefined;
        if (isSelect) {
          options = Array.from((input as unknown as HTMLSelectElement).options)
            .map((o) => o.text.trim())
            .filter(Boolean);
        }

        results.push({
          id: input.id || input.name || `lever-${idx}`,
          label,
          type: input.tagName === "TEXTAREA" ? "textarea" : isSelect ? "select" : type,
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
    await humanDelay(300, 700);

    // FormField.type is "text" | "textarea" | "select" | "checkbox" | "radio" | "file" | "unknown"
    if (field.type === "textarea" || field.type === "text" || field.type === "unknown") {
      await humanType(page, field.selector, answer);
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
      else if (!isYes && checked) await page.uncheck(field.selector);
    }
  }

  async submit(page: Page): Promise<void> {
    const submitBtn = page.locator(
      "button.template-btn-submit[type=submit], button:has-text('Submit application'), button[type=submit]"
    ).first();
    await submitBtn.scrollIntoViewIfNeeded();
    await humanDelay(500, 1000);
    await submitBtn.click();
    await page.waitForLoadState("domcontentloaded", { timeout: 20_000 }).catch(() => {});
  }
}
