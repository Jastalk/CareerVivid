/**
 * browser.ts — Browser control tools for the CareerVivid Agent.
 *
 * These tools give the Gemini agent interactive browser control, enabling it
 * to navigate pages, read interactive elements, fill forms, click buttons,
 * and handle multi-page application workflows — just like Antigravity or
 * Claude Desktop's Computer Use.
 *
 * Architecture:
 * - Uses a DEDICATED automation Chromium profile (never conflicts with real Chrome)
 * - Sessions persist via ~/.careervivid/browser-session/ between agent runs
 * - Each tool is a standard Tool object that plugs into QueryEngine's tool loop
 * - DOM is simplified to a numbered Accessibility Object Model (AOM) for the LLM
 *
 * Why NOT the real Chrome profile:
 *   Chrome locks its profile while running. Attempting launchPersistentContext
 *   on the real profile while Chrome is open causes a SIGTRAP crash.
 *   The dedicated profile avoids this entirely and is always available.
 */

import { Tool } from "../Tool.js";
import { Type } from "@google/genai";
import { chromium, type BrowserContext, type Page } from "playwright-core";
import { homedir } from "os";
import { join, resolve, dirname } from "path";
import { existsSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import chalk from "chalk";

// ---------------------------------------------------------------------------
// Dedicated automation profile — separate from real Chrome, never locked
// ---------------------------------------------------------------------------

function getAutomationProfileDir(): string {
  const dir = join(homedir(), ".careervivid", "browser-session");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

function getChromeBinaryPath(): string | undefined {
  if (process.platform === "darwin") {
    const paths = [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome Beta",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
    ];
    return paths.find(existsSync);
  } else if (process.platform === "win32") {
    return "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  }
  return undefined; // Linux: let Playwright use bundled Chromium
}

// ---------------------------------------------------------------------------
// Singleton browser session — persists across agent turns
// ---------------------------------------------------------------------------

let activeContext: BrowserContext | null = null;
let activePage: Page | null = null;
let browserClosed = false;

/**
 * Launch or reuse a dedicated Chromium automation browser.
 * Uses a persistent profile at ~/.careervivid/browser-session so sessions
 * (cookies, local storage, login states) survive across agent runs.
 *
 * This NEVER touches the real Chrome profile, so there is no profile-lock
 * conflict regardless of whether the user has Chrome running.
 */
async function ensureBrowser(): Promise<{ context: BrowserContext; page: Page }> {
  // Recover from a closed browser (e.g. user closed the window mid-session)
  if (activeContext && browserClosed) {
    try { await activeContext.close(); } catch { /* already closed */ }
    activeContext = null;
    activePage = null;
    browserClosed = false;
  }

  if (!activeContext) {
    const profileDir = getAutomationProfileDir();
    const executablePath = getChromeBinaryPath();

    console.log(chalk.dim("  🌐 Launching automation browser..."));

    if (!executablePath) {
      console.log("");
      console.log(chalk.red("❌ Error: Missing local browser"));
      console.log(chalk.dim("The CareerVivid CLI uses playwright-core to launch your existing browser installation to save hundreds of megabytes of setup time."));
      console.log(chalk.dim("However, Google Chrome or Microsoft Edge could not be found in the standard system locations."));
      console.log(chalk.yellow("\nPlease install Google Chrome to use AI Browser automation: https://www.google.com/chrome/"));
      process.exit(1);
    }

    activeContext = await chromium.launchPersistentContext(profileDir, {
      headless: false,
      executablePath,          // real Chrome binary if available, otherwise bundled Chromium
      args: [
        "--no-sandbox",
        "--disable-blink-features=AutomationControlled",
        "--disable-infobars",
        "--start-maximized",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-dev-shm-usage",
      ],
      ignoreDefaultArgs: ["--enable-automation"],
      viewport: null,
      locale: "en-US",
      timezoneId: "America/Chicago",
    });

    // Detect if the user closes the window so we can re-launch cleanly next time
    activeContext.on("close", () => { browserClosed = true; });

    // Stealth patch
    await activeContext.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
      // @ts-ignore
      window.chrome = { runtime: {} };
    });

    activePage = activeContext.pages()[0] ?? await activeContext.newPage();
    console.log(chalk.green("  ✔ Browser ready"));
  }

  // If the current page was closed, open a new one
  if (!activePage || activePage.isClosed()) {
    activePage = await activeContext.newPage();
  }

  return { context: activeContext, page: activePage };
}

// ---------------------------------------------------------------------------
// AOM (Accessibility Object Model) extraction
// ---------------------------------------------------------------------------

interface AOMElement {
  index: number;
  role: string;
  name: string;
  tag: string;
  type?: string;
  value?: string;
  placeholder?: string;
  checked?: boolean;
  selected?: string;
  options?: string[];
  href?: string;
  isEditable: boolean;
}

/**
 * Extract a simplified, numbered list of all interactive elements on the page.
 * This is the core "what can I interact with?" representation sent to Gemini.
 *
 * Inspired by browser-use's DOM extraction, but implemented in Playwright TS.
 */
async function extractAOM(page: Page): Promise<AOMElement[]> {
  return page.evaluate(() => {
    const interactiveSelectors = [
      "a[href]",
      "button",
      "input:not([type='hidden'])",
      "textarea",
      "select",
      "[role='button']",
      "[role='link']",
      "[role='checkbox']",
      "[role='radio']",
      "[role='tab']",
      "[role='menuitem']",
      "[contenteditable='true']",
      "[onclick]",
      "[tabindex]:not([tabindex='-1'])",
    ];

    const elements = document.querySelectorAll(interactiveSelectors.join(","));
    const results: any[] = [];
    let index = 0;

    elements.forEach((el) => {
      const htmlEl = el as HTMLElement;

      // Skip hidden/invisible elements
      const rect = htmlEl.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;
      const style = window.getComputedStyle(htmlEl);
      if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return;

      const tag = htmlEl.tagName.toLowerCase();
      const type = (htmlEl as HTMLInputElement).type?.toLowerCase();
      const role =
        htmlEl.getAttribute("role") ||
        (tag === "a" ? "link" : tag === "button" ? "button" : tag === "input"
          ? type === "checkbox" ? "checkbox" : type === "radio" ? "radio" : "textbox"
          : tag === "textarea" ? "textbox" : tag === "select" ? "combobox" : "generic");

      // Build human-readable name from multiple sources
      const ariaLabel = htmlEl.getAttribute("aria-label");
      const title = htmlEl.getAttribute("title");
      const placeholder = (htmlEl as HTMLInputElement).placeholder;
      const labelEl = htmlEl.id
        ? document.querySelector(`label[for="${htmlEl.id}"]`)
        : htmlEl.closest("label");
      const labelText = labelEl?.textContent?.trim();
      const innerText = htmlEl.innerText?.trim().substring(0, 80);

      const name = ariaLabel || labelText || title || placeholder || innerText || "(unnamed)";

      const entry: any = {
        index,
        role,
        name: name.replace(/\s+/g, " ").trim(),
        tag,
        isEditable: tag === "input" || tag === "textarea" || htmlEl.isContentEditable,
      };

      if (type && type !== "submit" && type !== "button") entry.type = type;

      const value = (htmlEl as HTMLInputElement).value;
      if (value && entry.isEditable) entry.value = value.substring(0, 100);

      if (placeholder) entry.placeholder = placeholder;

      if (type === "checkbox" || type === "radio") {
        entry.checked = (htmlEl as HTMLInputElement).checked;
      }

      if (tag === "select") {
        const select = htmlEl as HTMLSelectElement;
        entry.selected = select.options[select.selectedIndex]?.text?.trim();
        entry.options = Array.from(select.options)
          .map((o) => o.text.trim())
          .filter((t) => t);
      }

      if (tag === "a") {
        entry.href = (htmlEl as HTMLAnchorElement).href;
      }

      // Store a data attribute so we can find this element later
      htmlEl.setAttribute("data-cv-index", String(index));

      results.push(entry);
      index++;
    });

    return results;
  });
}

/**
 * Format AOM elements into a compact, LLM-friendly string representation.
 */
function formatAOMForLLM(elements: AOMElement[]): string {
  return elements
    .map((el) => {
      let desc = `[${el.index}] <${el.tag}> ${el.role}: "${el.name}"`;
      if (el.type) desc += ` (type=${el.type})`;
      if (el.value) desc += ` value="${el.value}"`;
      if (el.placeholder) desc += ` placeholder="${el.placeholder}"`;
      if (el.checked !== undefined) desc += ` checked=${el.checked}`;
      if (el.selected) desc += ` selected="${el.selected}"`;
      if (el.options) desc += ` options=[${el.options.slice(0, 8).map((o) => `"${o}"`).join(", ")}${el.options.length > 8 ? "..." : ""}]`;
      if (el.href) desc += ` href="${el.href}"`;
      return desc;
    })
    .join("\n");
}

// ---------------------------------------------------------------------------
// Tool: browser_navigate
// ---------------------------------------------------------------------------

const BrowserNavigateTool: Tool = {
  name: "browser_navigate",
  description: `Navigate the browser to a URL. Opens the browser if not already open. Use this to go to job application pages, ATS portals, or any website.`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      url: {
        type: Type.STRING,
        description: "The full URL to navigate to.",
      },
    },
    required: ["url"],
  },
  execute: async (args: { url: string }) => {
    const { page } = await ensureBrowser();
    await page.goto(args.url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    // Wait a bit for dynamic content to render
    await new Promise((r) => setTimeout(r, 2000));
    const title = await page.title();
    const currentUrl = page.url();
    return `Navigated to: ${title}\nURL: ${currentUrl}`;
  },
};

// ---------------------------------------------------------------------------
// Tool: browser_state
// ---------------------------------------------------------------------------

const BrowserStateTool: Tool = {
  name: "browser_state",
  description: `Get the current browser page state. Returns the page title, URL, and a numbered list of ALL interactive elements (inputs, buttons, links, dropdowns, checkboxes).
Use the element index numbers with browser_click, browser_type, and browser_select to interact with elements.
ALWAYS call this after navigating or after any action that may change the page.`,
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
  execute: async () => {
    const { page } = await ensureBrowser();
    const title = await page.title();
    const url = page.url();
    const elements = await extractAOM(page);
    const formatted = formatAOMForLLM(elements);

    return `Page: ${title}\nURL: ${url}\n\n${elements.length} interactive elements found:\n\n${formatted}`;
  },
};

// ---------------------------------------------------------------------------
// Tool: browser_click
// ---------------------------------------------------------------------------

const BrowserClickTool: Tool = {
  name: "browser_click",
  description: `Click on an interactive element by its index number (from browser_state output). Use this to click buttons, links, checkboxes, radio buttons, and to focus input fields before typing.`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      element_index: {
        type: Type.NUMBER,
        description: "The index number of the element to click (from browser_state).",
      },
    },
    required: ["element_index"],
  },
  execute: async (args: { element_index: number }) => {
    const { page } = await ensureBrowser();
    const el = page.locator(`[data-cv-index="${args.element_index}"]`).first();
    const isVisible = await el.isVisible({ timeout: 3000 }).catch(() => false);
    if (!isVisible) {
      return `Element [${args.element_index}] not found or not visible. Call browser_state() to refresh the element list.`;
    }

    // Scroll into view first
    await el.scrollIntoViewIfNeeded().catch(() => {});
    await new Promise((r) => setTimeout(r, 200));
    await el.click();
    await new Promise((r) => setTimeout(r, 500));
    return `Clicked element [${args.element_index}]`;
  },
};

// ---------------------------------------------------------------------------
// Tool: browser_type
// ---------------------------------------------------------------------------

const BrowserTypeTool: Tool = {
  name: "browser_type",
  description: `Type text into an input field. First click the field using browser_click, then use this tool to enter text. The field will be cleared before typing.`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      element_index: {
        type: Type.NUMBER,
        description: "The index number of the input/textarea element to type into.",
      },
      text: {
        type: Type.STRING,
        description: "The text to type into the field.",
      },
      clear_first: {
        type: Type.BOOLEAN,
        description: "Whether to clear the field before typing. Default: true.",
      },
    },
    required: ["element_index", "text"],
  },
  execute: async (args: { element_index: number; text: string; clear_first?: boolean }) => {
    const { page } = await ensureBrowser();
    const el = page.locator(`[data-cv-index="${args.element_index}"]`).first();
    const isVisible = await el.isVisible({ timeout: 3000 }).catch(() => false);
    if (!isVisible) {
      return `Element [${args.element_index}] not found or not visible. Call browser_state() to refresh.`;
    }

    await el.scrollIntoViewIfNeeded().catch(() => {});

    // Focus the element
    await el.focus().catch(() => {});

    // Clear first if requested (default true)
    if (args.clear_first !== false) {
      await el.fill("");
    }

    // Type character by character with human-like delays
    await el.pressSequentially(args.text, { delay: 35 + Math.random() * 50 });

    // Blur to trigger React/Angular change handlers
    await el.blur().catch(() => {});
    await new Promise((r) => setTimeout(r, 300));

    return `Typed "${args.text.substring(0, 50)}${args.text.length > 50 ? "..." : ""}" into element [${args.element_index}]`;
  },
};

// ---------------------------------------------------------------------------
// Tool: browser_select
// ---------------------------------------------------------------------------

const BrowserSelectTool: Tool = {
  name: "browser_select",
  description: `Select an option from a dropdown (<select>) element. Use the exact option text from the 'options' list shown in browser_state.`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      element_index: {
        type: Type.NUMBER,
        description: "The index number of the <select> element.",
      },
      option: {
        type: Type.STRING,
        description: "The visible text of the option to select.",
      },
    },
    required: ["element_index", "option"],
  },
  execute: async (args: { element_index: number; option: string }) => {
    const { page } = await ensureBrowser();
    const el = page.locator(`[data-cv-index="${args.element_index}"]`).first();
    const isVisible = await el.isVisible({ timeout: 3000 }).catch(() => false);
    if (!isVisible) {
      return `Element [${args.element_index}] not found or not visible. Call browser_state() to refresh.`;
    }

    try {
      // Try exact match first
      await el.selectOption({ label: args.option });
    } catch {
      // Fallback: partial case-insensitive match
      const options = await el.locator("option").allTextContents();
      const match = options.find((o) =>
        o.toLowerCase().includes(args.option.toLowerCase()),
      );
      if (match) {
        await el.selectOption({ label: match });
      } else {
        return `Could not find option "${args.option}". Available options: ${options.join(", ")}`;
      }
    }

    // Trigger change event
    await el.dispatchEvent("change");
    await new Promise((r) => setTimeout(r, 500));
    return `Selected "${args.option}" in element [${args.element_index}]`;
  },
};

// ---------------------------------------------------------------------------
// Tool: browser_scroll
// ---------------------------------------------------------------------------

const BrowserScrollTool: Tool = {
  name: "browser_scroll",
  description: `Scroll the page up or down to reveal more content. Useful when form fields or buttons are below the fold.`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      direction: {
        type: Type.STRING,
        description: 'Direction to scroll: "up" or "down".',
        enum: ["up", "down"],
      },
      amount: {
        type: Type.NUMBER,
        description: "Pixels to scroll. Default: 500.",
      },
    },
    required: ["direction"],
  },
  execute: async (args: { direction: string; amount?: number }) => {
    const { page } = await ensureBrowser();
    const pixels = args.amount ?? 500;
    const delta = args.direction === "up" ? -pixels : pixels;
    await page.evaluate((d) => window.scrollBy(0, d), delta);
    await new Promise((r) => setTimeout(r, 500));

    const scrollY = await page.evaluate(() => Math.round(window.scrollY));
    const maxScroll = await page.evaluate(() =>
      Math.round(document.documentElement.scrollHeight - window.innerHeight),
    );
    return `Scrolled ${args.direction} by ${pixels}px. Current position: ${scrollY}/${maxScroll}px`;
  },
};

// ---------------------------------------------------------------------------
// Tool: browser_screenshot
// ---------------------------------------------------------------------------

const BrowserScreenshotTool: Tool = {
  name: "browser_screenshot",
  description: `Take a screenshot of the current page for visual analysis. Returns the page image. Use this when you need to visually inspect the page layout, see error messages, or verify form state.`,
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
  execute: async () => {
    const { page } = await ensureBrowser();
    const buf = await page.screenshot({ type: "jpeg", quality: 60, fullPage: false });
    const base64 = buf.toString("base64");
    const title = await page.title();
    // Return both metadata and the image data
    // The agent framework will need to handle the base64 image
    return `Screenshot captured of "${title}" (${buf.length} bytes). The page is currently visible in the browser window.`;
  },
};

// ---------------------------------------------------------------------------
// Tool: browser_wait
// ---------------------------------------------------------------------------

const BrowserWaitTool: Tool = {
  name: "browser_wait",
  description: `Wait for the page to finish loading or for a specific time. Use this after clicking buttons that trigger page navigation, AJAX requests, or dynamic content loading.`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      seconds: {
        type: Type.NUMBER,
        description: "Number of seconds to wait. Default: 2. Max: 10.",
      },
    },
  },
  execute: async (args: { seconds?: number }) => {
    const { page } = await ensureBrowser();
    const seconds = Math.min(args.seconds ?? 2, 10);
    await new Promise((r) => setTimeout(r, seconds * 1000));
    const title = await page.title();
    const url = page.url();
    return `Waited ${seconds}s. Current page: "${title}" (${url})`;
  },
};

// ---------------------------------------------------------------------------
// Tool: browser_close
// ---------------------------------------------------------------------------

const BrowserCloseTool: Tool = {
  name: "browser_close",
  description: `Close the browser window. Use this when you are done with browser interactions.`,
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
  execute: async () => {
    if (activeContext) {
      await activeContext.close().catch(() => {});
      activeContext = null;
      activePage = null;
      browserClosed = false;
    }
    return "Browser closed.";
  },
};

// ---------------------------------------------------------------------------
// Tool: browser_use_agent  (browser-use Python sidecar)
// ---------------------------------------------------------------------------

/**
 * Resolve the path to browser_sidecar.py relative to this compiled JS file.
 * Works in both ts-node (src/) and compiled (dist/) contexts.
 */
function getSidecarPath(): string {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  // Compiled path: dist/agent/tools/ → three levels up → project root → src/apply/
  const fromDist = resolve(__dirname, "../../../src/apply/browser_sidecar.py");
  // Source path (ts-node): src/agent/tools/ → two levels up → src/apply/
  const fromSrc  = resolve(__dirname, "../../apply/browser_sidecar.py");
  return existsSync(fromDist) ? fromDist : fromSrc;
}

const BrowserUseAgentTool: Tool = {
  name: "browser_use_agent",
  description: `Launch an autonomous browser-use agent (powered by Gemini) to complete a complex browser task.
Use this for:
- Filling out multi-page job application forms end-to-end
- Tasks that require navigating through several screens autonomously
- Any complex browser workflow that requires reasoning about the page state

The agent will open a browser window, navigate to the URL, and autonomously fill out the form
using the provided context. It streams live progress to the terminal.

IMPORTANT: Always include the full resume content and target job details in the task description
so the agent has all the information it needs without asking.`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      task: {
        type: Type.STRING,
        description: `A detailed natural-language description of what to do. Include:
- The URL to navigate to
- The user's full contact info (name, email, phone, LinkedIn)
- Key resume highlights (current role, top skills, years of experience)
- Any specific instructions (e.g. decline EEO questions, work authorization = yes)
Example: "Go to https://jobs.example.com/apply and fill out the application form. Name: Jiawen Zhu, Email: j@example.com, Phone: 555-1234..."`,
      },
      model: {
        type: Type.STRING,
        description: "Optional. Gemini model to use. Default: gemini-1.5-flash. Use gemini-1.5-pro for extremely complex forms.",
      },
    },
    required: ["task"],
  },
  execute: async (args: { task: string; model?: string }) => {
    const { spawn } = await import("child_process");

    // ── Locate Python — venv first, then system python 3.11 ────────────────────────
    const PYTHON_CANDIDATES = [
      join(homedir(), "careervivid", "browser-use", ".venv", "bin", "python"),
      "/opt/homebrew/bin/python3.11",
      "/usr/local/bin/python3.11",
      "/usr/bin/python3.11",
    ];
    const pythonBin = PYTHON_CANDIDATES.find(existsSync);
    if (!pythonBin) {
      return "\u274c Python 3.11 not found. Install with: brew install python@3.11";
    }

    // ── Locate sidecar script ───────────────────────────────────────────
    const sidecarPath = getSidecarPath();
    if (!existsSync(sidecarPath)) {
      return `❌ browser_sidecar.py not found at: ${sidecarPath}`;
    }

    // ── Resolve LLM config ───────────────────────────────────────────
    const { loadConfig, getGeminiKey, getLlmConfig } = await import("../../config.js");
    const cfg = loadConfig();
    const llmCfg = getLlmConfig();
    // For the agent tool, default to using the active LLM config from cv agent session
    const llmConfig = {
      provider: llmCfg.provider,
      model:    args.model || llmCfg.model || "gemini-1.5-flash",
      apiKey:   llmCfg.apiKey || cfg.geminiKey || getGeminiKey() || process.env.GEMINI_API_KEY || "",
      baseUrl:  llmCfg.baseUrl,
    };

    if (!llmConfig.apiKey && llmConfig.provider !== "careervivid") {
      return [
        `\u274c No API key found for provider: ${llmConfig.provider}`,
        "   Set it via: cv agent config",
      ].join("\n");
    }

    // For CareerVivid Cloud, use the CV API key as the identifier
    if (llmConfig.provider === "careervivid") {
      llmConfig.apiKey = cfg.apiKey || process.env.CV_API_KEY || "";
    }

    const profileDir = join(homedir(), ".careervivid", "browser-session");

    // ── Build input payload (new llm_config format) ────────────────────────
    const model = llmConfig.model;
    const inputPayload = JSON.stringify({
      url:             "", // browser_use_agent sends task_override instead of url+profile
      llm_config:      llmConfig,
      resume_pdf_path: "",
      profile:         {},
      profile_dir:     profileDir,
      task_override:   args.task,
    });

    // ── Spawn sidecar ───────────────────────────────────────────
    console.log(chalk.cyan(`\n\ud83e\udd16 Launching browser-use agent (${model} via ${llmConfig.provider})...\n`));

    return new Promise<string>((resolve) => {
      const steps: string[] = [];
      let finalResult = "";

      const child = spawn(pythonBin, [sidecarPath], {
        stdio: ["pipe", "pipe", "pipe"],
        env: {
          ...process.env,
          PYTHONUNBUFFERED: "1",
        },
      });

      // Send input payload
      child.stdin.write(inputPayload);
      child.stdin.end();

      // Parse stdout JSON lines
      let buffer = "";
      child.stdout.on("data", (data: Buffer) => {
        buffer += data.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const msg = JSON.parse(trimmed);
            if (msg.type === "step") {
              console.log(chalk.dim(`   ${msg.message}`));
              steps.push(msg.message);
            } else if (msg.type === "done") {
              finalResult = msg.result || "Agent completed successfully.";
              console.log(chalk.green(`\n✅ browser-use agent done: ${finalResult}\n`));
            } else if (msg.type === "error") {
              console.log(chalk.red(`\n❌ Agent error: ${msg.message}\n`));
              finalResult = `Error: ${msg.message}`;
            }
          } catch {
            // Non-JSON line from Python (e.g. import warnings) — print as-is
            if (trimmed) console.log(chalk.dim(`   [py] ${trimmed}`));
          }
        }
      });

      // Print stderr for debugging
      child.stderr.on("data", (data: Buffer) => {
        const str = data.toString().trim();
        if (str) console.log(chalk.yellow(`   [py-err] ${str}`));
      });

      child.on("close", (code) => {
        if (finalResult) {
          resolve(finalResult);
        } else if (code === 0) {
          resolve(`browser-use agent completed (${steps.length} steps).`);
        } else {
          resolve(`browser-use agent exited with code ${code}. Check browser window for current state.`);
        }
      });

      child.on("error", (err) => {
        resolve(`❌ Failed to launch Python sidecar: ${err.message}`);
      });
    });
  },
};

// ---------------------------------------------------------------------------
// Export all browser tools
// ---------------------------------------------------------------------------

export const ALL_BROWSER_TOOLS: Tool[] = [
  // ── High-level: browser-use autonomous agent ──────────────────────────────
  BrowserUseAgentTool,
  // ── Low-level: individual Playwright controls ─────────────────────────────
  BrowserNavigateTool,
  BrowserStateTool,
  BrowserClickTool,
  BrowserTypeTool,
  BrowserSelectTool,
  BrowserScrollTool,
  BrowserScreenshotTool,
  BrowserWaitTool,
  BrowserCloseTool,
];
