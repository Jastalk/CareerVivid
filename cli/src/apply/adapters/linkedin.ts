/**
 * LinkedIn Easy Apply Adapter
 *
 * Handles LinkedIn's multi-step "Easy Apply" modal.
 *
 * ⚠️  LinkedIn ToS: Automated activity is prohibited.
 * This adapter requires explicit opt-in via `--enable-linkedin` flag.
 * Use sparingly (max 10-15 applications/day) for roles with score ≥ 80%.
 */

import type { Page } from "playwright-core";
import type { ATSAdapter, FormField } from "../index.js";
import { humanType, humanDelay } from "../browser.js";

export class LinkedInAdapter implements ATSAdapter {
  platform = "linkedin" as const;

  async navigateToForm(page: Page, jobUrl: string): Promise<void> {
    await page.goto(jobUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await humanDelay(2000, 3500); // LinkedIn is aggressive about rate limiting

    // Click "Easy Apply" button
    const easyApplyBtn = page.locator(
      "button.jobs-apply-button:has-text('Easy Apply'), " +
      "button:has-text('Easy Apply'), " +
      "[aria-label*='Easy Apply']"
    ).first();

    if (await easyApplyBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await easyApplyBtn.click();
      await humanDelay(1500, 2500);
    } else {
      throw new Error("No Easy Apply button found on this LinkedIn job posting. This job requires an external application.");
    }
  }

  async extractFields(page: Page): Promise<FormField[]> {
    // LinkedIn Easy Apply is a multi-step modal
    await page.waitForSelector(".jobs-easy-apply-modal, [data-test-modal='easy-apply-modal']", {
      timeout: 15_000,
    }).catch(() => {});

    await humanDelay(800, 1500);

    const fields = await page.evaluate(() => {
      const results: any[] = [];
      const modal = document.querySelector(".jobs-easy-apply-modal, [data-test-modal='easy-apply-modal']");
      if (!modal) return results;

      const allInputs = modal.querySelectorAll<HTMLElement>(
        "input:not([type=hidden]):not([type=submit]), textarea, select"
      );

      allInputs.forEach((el, idx) => {
        const input = el as HTMLInputElement;
        const type = input.type || "text";
        if (["hidden", "submit", "button", "file"].includes(type)) return;

        // Find label
        const id = input.id || input.name;
        let label = "";
        if (id) {
          const lbl = modal.querySelector<HTMLLabelElement>(`label[for="${id}"]`);
          if (lbl) label = lbl.innerText.trim();
        }
        if (!label) {
          const parent = input.closest(".jobs-easy-apply-form-element, .fb-form-element");
          if (parent) {
            const lbl = parent.querySelector<HTMLElement>("label, span[data-test-single-line-text-form-component__title]");
            if (lbl) label = lbl.innerText.trim();
          }
        }
        if (!label) label = input.placeholder || input.name || `Field ${idx}`;

        const isSelect = el.tagName === "SELECT";
        const isTextarea = el.tagName === "TEXTAREA";

        const selector = input.id
          ? `#${input.id}`
          : `[name="${input.name}"]`;

        let options: string[] | undefined;
        if (isSelect) {
          options = Array.from((el as HTMLSelectElement).options)
            .map((o) => o.text.trim())
            .filter((t) => t && t.toLowerCase() !== "select an option");
        }

        results.push({
          id: id || `li-${idx}`,
          label,
          type: isTextarea ? "textarea" : isSelect ? "select" : type,
          selector,
          required: input.required,
          options,
          placeholder: input.placeholder || "",
        });
      });

      return results;
    });

    return fields as FormField[];
  }

  async fillField(page: Page, field: FormField, answer: string): Promise<void> {
    await humanDelay(400, 1000);

    if (["textarea", "text", "email", "tel"].includes(field.type)) {
      await humanType(page, field.selector, answer);
    } else if (field.type === "select") {
      await page.selectOption(field.selector, { label: answer }).catch(async () => {
        const options = await page.locator(`${field.selector} option`).allTextContents();
        const match = options.find((o) => o.toLowerCase().includes(answer.toLowerCase()));
        if (match) await page.selectOption(field.selector, { label: match });
      });
    } else if (field.type === "radio") {
      const radioGroup = page.locator(`fieldset:has(legend:has-text("${field.label}"))`);
      const targetLabel = radioGroup.locator(`label:has-text("${answer}")`).first();
      if (await targetLabel.isVisible({ timeout: 2000 }).catch(() => false)) {
        await targetLabel.click();
      }
    }
  }

  /**
   * LinkedIn Easy Apply is multi-step — this advances through pages and submits.
   */
  async submit(page: Page): Promise<void> {
    // Step through multi-page modal
    for (let step = 0; step < 10; step++) {
      await humanDelay(800, 1500);

      const nextBtn = page.locator("button[aria-label='Continue to next step'], button:has-text('Next')").first();
      const reviewBtn = page.locator("button[aria-label='Review your application'], button:has-text('Review')").first();
      const submitBtn = page.locator("button[aria-label='Submit application'], button:has-text('Submit application')").first();

      if (await submitBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
        await submitBtn.click();
        await humanDelay(2000, 3000);
        return;
      } else if (await reviewBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
        await reviewBtn.click();
      } else if (await nextBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
        await nextBtn.click();
      } else {
        break; // No navigation button found — stop
      }
    }
  }
}
