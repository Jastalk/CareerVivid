/**
 * iCIMS ATS Adapter
 *
 * Handles job application forms on icims.com platforms.
 * iCIMS forms are often embedded inside an iframe (#icims_content_iframe).
 */

import type { Page, FrameLocator, Locator } from "playwright-core";
import type { ATSAdapter, FormField } from "../index.js";
import type { ApplyProfile } from "../gemini-agent.js";
import { humanType, humanDelay } from "../browser.js";
import chalk from "chalk";

interface IcimsLabelMapping {
  labelPattern: RegExp;
  key: string; // key of ApplyProfile
  buildValue?: (profile: ApplyProfile) => string | undefined;
}

const ICIMS_LABEL_MAP: IcimsLabelMapping[] = [
  { labelPattern: /^first\s*name/i, key: "firstName" },
  { labelPattern: /^last\s*name/i, key: "lastName" },
  { labelPattern: /^email/i, key: "email" },
  { labelPattern: /^phone|^mobile/i, key: "phone" },
  { labelPattern: /^city/i, key: "city" },
  { labelPattern: /^zip|postal\s*code/i, key: "zip" },
  { labelPattern: /linkedin/i, key: "linkedin" },
  { labelPattern: /portfolio|website/i, key: "portfolio" },
  { labelPattern: /github/i, key: "github" },
];

export class IcimsAdapter implements ATSAdapter {
  platform = "icims" as const;

  /**
   * Helper to get the correct locator context.
   * If the #icims_content_iframe exists, we route our queries into it.
   */
  async getContext(page: Page): Promise<Page | FrameLocator> {
    const iframe = page.locator("#icims_content_iframe").first();
    const hasIframe = await iframe.isVisible({ timeout: 2000 }).catch(() => false);
    if (hasIframe) {
      return page.frameLocator("#icims_content_iframe");
    }
    return page;
  }

  async navigateToForm(page: Page, jobUrl: string): Promise<void> {
    await page.goto(jobUrl, { waitUntil: "networkidle", timeout: 30_000 });
    await humanDelay(1500, 2500);

    const context = await this.getContext(page);

    // Click "Apply" or "Apply for this job online" if it exists
    const applyBtn = context.locator("a:has-text('Apply'), button:has-text('Apply'), a[title*='Apply']").first();
    if (await applyBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      await applyBtn.click();
      await humanDelay(1500, 2500);
      await page.waitForLoadState("networkidle").catch(() => {});
    }
  }

  async fillFromProfile(page: Page, profile: ApplyProfile): Promise<{ filled: string[]; skipped: string[] }> {
    const filled: string[] = [];
    const skipped: string[] = [];

    const context = await this.getContext(page);

    // Wait for the form
    await context.locator("form").first().waitFor({ state: "attached", timeout: 15_000 }).catch(() => {});
    await humanDelay(800, 1500);

    for (const mapping of ICIMS_LABEL_MAP) {
      const value = mapping.buildValue
        ? mapping.buildValue(profile)
        : (profile as Record<string, string | undefined>)[mapping.key];
      if (!value) continue;

      try {
        let el = context.getByLabel(mapping.labelPattern).first();
        if (!(await el.isVisible({ timeout: 2000 }).catch(() => false))) {
          skipped.push(mapping.key);
          continue;
        }

        const tagName = await el.evaluate((n: Element) => n.tagName.toLowerCase());

        if (tagName === "select") {
          await el.selectOption({ label: value }).catch(async () => {
             // Fallback: match options partially
             const options = await el.locator("option").allTextContents();
             const match = options.find(o => o.toLowerCase().includes(value.toLowerCase()));
             if (match) await el.selectOption({ label: match });
          });
        } else {
          await el.fill("");
          await el.pressSequentially(value, { delay: 35 + Math.random() * 50 });
        }

        console.log(chalk.dim(`   ✓ ${chalk.white(mapping.key)}: ${value.substring(0, 50)}`));
        filled.push(mapping.key);
        await humanDelay(150, 400);

      } catch (err) {
        skipped.push(mapping.key);
      }
    }

    return { filled, skipped };
  }

  async extractFields(page: Page): Promise<FormField[]> {
    const context = await this.getContext(page);

    await context.locator("form").first().waitFor({ state: "attached", timeout: 15_000 }).catch(() => {});
    await humanDelay(1000, 2000);

    // Since context could be a Page or a FrameLocator, we must extract DOM elements within it.
    // However, FrameLocator doesnt have .evaluate directly that returns arrays easily if we want to run DOM queries.
    // Instead we can use locator.all() and loop over them. 

    const labels = await context.locator("label").all();
    const fields: FormField[] = [];

    for (let i = 0; i < labels.length; i++) {
       const lbl = labels[i];
       const labelText = await lbl.innerText().then(t => t.trim().replace(/\s*\*\s*$/, ""));
       if (!labelText) continue;

       const forAttr = await lbl.getAttribute("for");
       let inputLocator: Locator | null = null;
       
       if (forAttr) {
           inputLocator = context.locator(`[id="${forAttr}"]`).first();
       } else {
           // Try child input
           const childInput = lbl.locator("input, textarea, select").first();
           if (await childInput.count() > 0) {
               inputLocator = childInput;
           }
       }

       if (!inputLocator) continue;
       
       if (!(await inputLocator.isVisible().catch(()=>false))) continue;

       const tagName = await inputLocator.evaluate((el: Element) => el.tagName);
       if (tagName === "BUTTON") continue;

       const inputType = await inputLocator.getAttribute("type") || "text";
       if (inputType === "hidden") continue;

       const isSelect = tagName === "SELECT";
       const isTextarea = tagName === "TEXTAREA";
       
       let options: string[] | undefined;
       if (isSelect) {
           const opts = await inputLocator.locator("option").allTextContents();
           options = opts.map(o => o.trim()).filter(t => t && !["select", "choose", "please"].some(k => t.toLowerCase().startsWith(k)));
       }

       const idAttr = await inputLocator.getAttribute("id");
       const nameAttr = await inputLocator.getAttribute("name");
       
       // Construct a resilient selector that works within the iframe
       const selector = idAttr ? `[id="${idAttr}"]` : nameAttr ? `[name="${nameAttr}"]` : `label:has-text("${labelText}") input`;

       const required = await inputLocator.getAttribute("required") !== null || labelText.includes("*") || (await lbl.innerText()).includes("*");

       fields.push({
          id: idAttr || nameAttr || `icims-${i}`,
          label: labelText,
          type: isTextarea ? "textarea" : isSelect ? "select" : (inputType as any),
          selector: selector,
          required: !!required,
          options,
          placeholder: (await inputLocator.getAttribute("placeholder")) || ""
       });
    }

    return fields;
  }

  async fillField(page: Page, field: FormField, answer: string): Promise<void> {
    const context = await this.getContext(page);
    await humanDelay(400, 900);

    const input = context.locator(field.selector).first();

    if (["textarea", "text", "email", "tel", "url"].includes(field.type)) {
      // Direct focus + typing helps trigger React/Angular event listeners properly
      await input.focus().catch(()=>{});
      await input.fill("");
      await input.pressSequentially(answer, { delay: 35 + Math.random() * 50 });
      await input.blur().catch(()=>{});
    } else if (field.type === "select") {
      await input.selectOption({ label: answer }).catch(async () => {
        const options = await input.locator(`option`).allTextContents();
        const match = options.find((o) => o.toLowerCase().includes(answer.toLowerCase()));
        if (match) await input.selectOption({ label: match });
      });
    } else if (field.type === "radio") {
      const radio = context.locator(`input[type="radio"][value="${answer}"], input[type="radio"]:near(:text("${answer}"))`).first();
      await radio.check().catch(()=>{});
    } else if (field.type === "checkbox") {
      const isYes = /^(yes|true|1|agree)/i.test(answer);
      const checked = await input.isChecked().catch(() => false);
      if (isYes && !checked) await input.check().catch(()=>{});
      else if (!isYes && checked) await input.uncheck().catch(()=>{});
    }
  }

  async submit(page: Page): Promise<void> {
    const context = await this.getContext(page);
    
    const submitBtn = context.locator(
      "button[type=submit], input[type=submit], a:has-text('Submit'), a:has-text('Update Profile'), button[title*='Submit']"
    ).last();
    
    if (await submitBtn.isVisible({ timeout: 2000 }).catch(()=>false)) {
      await submitBtn.scrollIntoViewIfNeeded().catch(()=>{});
      await humanDelay(600, 1200);
      await submitBtn.click();
      await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    }
  }
}
