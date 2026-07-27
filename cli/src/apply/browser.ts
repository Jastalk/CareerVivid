/**
 * browser.ts — Playwright browser launcher for cv jobs apply
 *
 * DESIGN PHILOSOPHY (browser-use methodology):
 *
 * We NEVER try to use the user's real Chrome profile while Chrome is running.
 * Chrome locks its profile directory — any attempt to `launchPersistentContext`
 * against a locked profile causes a SIGTRAP crash, which is the root cause of
 * all previous failures.
 *
 * Instead we use ONE strategy, always:
 *   - A DEDICATED automation profile at ~/.careervivid/browser-session/
 *   - This is a persistent Chromium profile separate from the user's real Chrome
 *   - It persists cookies, localStorage, and login sessions across runs
 *   - The user only needs to log in to each ATS once; subsequent runs are instant
 *   - It uses the real Chrome binary (best site compatibility) if available
 *   - It is NEVER locked because we control its full lifecycle
 *
 * After launch, the caller is responsible for navigating to the target URL
 * via page.goto(). The browser starts at about:blank.
 */

import { chromium, type BrowserContext, type Page } from "playwright-core";
import { homedir } from "os";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";
import chalk from "chalk";

// ── Profile & binary resolution ──────────────────────────────────────────────

/**
 * Dedicated automation profile — always available, never conflicts with Chrome.
 * Stored at ~/.careervivid/browser-session/ (separate from real Chrome profile).
 */
function getAutomationProfileDir(): string {
  const dir = join(homedir(), ".careervivid", "browser-session");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Locate the real Chrome binary for best ATS compatibility.
 * Falls back to Playwright's bundled Chromium if Chrome is not installed.
 */
export function getChromeBinaryPath(): string | undefined {
  if (process.platform === "darwin") {
    const candidates = [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome Beta",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
    ];
    return candidates.find(existsSync);
  } else if (process.platform === "win32") {
    const candidates = [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    ];
    return candidates.find(existsSync);
  } else {
    // Linux
    const candidates = [
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
      "/usr/bin/chromium-browser",
      "/usr/bin/chromium",
    ];
    return candidates.find(existsSync);
  }
}

// ── Stealth patches ───────────────────────────────────────────────────────────
//
// Applied to every page to prevent ATS bot-detection from blocking automation.

async function applyStealthPatches(page: Page): Promise<void> {
  await page.addInitScript(() => {
    // Hide webdriver flag (primary bot detection signal)
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    // Restore chrome object (fingerprint check)
    // @ts-ignore
    window.chrome = { runtime: {}, app: {}, csi: () => {} };
    // Override permissions query (another detection vector)
    const origQuery = window.navigator.permissions.query.bind(navigator.permissions);
    window.navigator.permissions.query = (params: any) =>
      params.name === "notifications"
        ? Promise.resolve({ state: Notification.permission } as PermissionStatus)
        : origQuery(params);
  });
}

// ── Human-like interaction helpers ────────────────────────────────────────────

/** Type text into a field with random per-character delay (30–120ms) */
export async function humanType(page: Page, selector: string, text: string): Promise<void> {
  await page.click(selector);
  await page.fill(selector, ""); // clear first
  for (const char of text) {
    await page.type(selector, char, { delay: 30 + Math.random() * 90 });
  }
}

/** Random delay between actions (simulates reading / thinking) */
export async function humanDelay(minMs = 800, maxMs = 2500): Promise<void> {
  const ms = minMs + Math.random() * (maxMs - minMs);
  await new Promise((r) => setTimeout(r, ms));
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface BrowserLaunchOptions {
  headless?: boolean;
  /** @deprecated — ignored. We always use the dedicated automation profile. */
  useNativeChrome?: boolean;
  /** @deprecated — ignored. We always use the dedicated automation profile. */
  forceAutomationProfile?: boolean;
}

export interface ApplyBrowser {
  context: BrowserContext;
  page: Page;
  close: () => Promise<void>;
  /** Always false — we always use the dedicated automation profile now */
  usingAutomationProfile: boolean;
}

/**
 * Launch the automation browser.
 *
 * Always uses the dedicated CareerVivid profile at ~/.careervivid/browser-session/.
 * This is the ONLY strategy. No Chrome restart, no profile locking, no SIGTRAP.
 *
 * Sessions persist across runs — the user logs in once per ATS, all future
 * runs skip the login screen automatically.
 *
 * @example
 * const { page } = await launchApplyBrowser();
 * await page.goto("https://jobs.example.com/apply");
 */
export async function launchApplyBrowser(_opts: BrowserLaunchOptions = {}): Promise<ApplyBrowser> {
  const profileDir = getAutomationProfileDir();
  const executablePath = getChromeBinaryPath();
  const isFirstRun = !existsSync(join(profileDir, "Default", "Preferences"));

  console.log(chalk.dim(`\n  🌐 Launching automation browser...`));

  if (isFirstRun) {
    console.log(
      chalk.cyan("  ℹ️  First run — a dedicated automation browser will open.\n") +
      chalk.dim("     Your session will be saved for future applications.\n")
    );
  }

  if (!executablePath) {
    console.log("");
    console.log(chalk.red("❌ Error: Missing local browser"));
    console.log(chalk.dim("The CareerVivid CLI uses playwright-core to launch your existing browser installation to save hundreds of megabytes of setup time."));
    console.log(chalk.dim("However, Google Chrome or Microsoft Edge could not be found in the standard system locations."));
    console.log(chalk.yellow("\nPlease install Google Chrome to use AI Browser automation: https://www.google.com/chrome/"));
    process.exit(1);
  }

  const context = await chromium.launchPersistentContext(profileDir, {
    headless: _opts.headless ?? false,

    // Use real Chrome binary for best ATS site compatibility.
    // If Chrome is not installed, Playwright's bundled Chromium is used.
    executablePath,

    args: [
      "--no-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--disable-infobars",
      "--start-maximized",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-dev-shm-usage",
      // Do NOT pass --user-data-dir here — launchPersistentContext manages that
    ],

    // Remove --enable-automation banner ("Chrome is being controlled by...")
    ignoreDefaultArgs: ["--enable-automation"],

    viewport: null,        // use the full window size
    locale: "en-US",
    timezoneId: "America/Chicago",
  });

  // Apply stealth to any future pages
  context.on("page", (p) => applyStealthPatches(p));

  // Get or create the first page
  const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();
  await applyStealthPatches(page);

  console.log(chalk.green("  ✔ Browser ready\n"));

  return {
    context,
    page,
    // Always false: we removed the legacy "automation profile" concept
    usingAutomationProfile: false,
    close: async () => {
      await context.close().catch(() => {});
    },
  };
}

// ── isChromeRunning ──────────────────────────────────────────────────────────
// Kept for backward compat — apply.ts imports it, but it's no longer used
// to decide whether to restart Chrome. We always use the automation profile.
export function isChromeRunning(): boolean {
  return false; // Intentionally always returns false — see module docstring
}
