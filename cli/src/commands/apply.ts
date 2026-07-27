/**
 * cv jobs apply — ATS Application Harness
 *
 * A self-expanding harness that routes job applications to the best engine:
 *
 *   KNOWN ATS (Ashby, Greenhouse, Lever, etc.)
 *     → TypeScript adapter (fast, no LLM, fills standard fields)
 *     → Fail/incomplete → Python browser-use sidecar (full AI agent)
 *
 *   UNKNOWN ATS (first time seeing this platform)
 *     → AI generates a new TypeScript adapter, saves to ~/.careervivid/adapters/
 *     → Also syncs to Firebase Storage (cross-device memory space)
 *     → Fail → Python browser-use sidecar (universal fallback)
 *
 * Model selection inherited from cv job-agent --model <flash|pro>
 * Browser stays open for manual review → user submits manually.
 */

import { Command } from "commander";
import chalk from "chalk";
import pkg from "enquirer";
import { readFileSync, existsSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join, dirname } from "path";
import { spawn } from "child_process";
import { isApiError, jobsList, jobsUpdate } from "../api.js";
import { getApiKey, getGeminiKey, getLlmConfig, type LLMProvider } from "../config.js";
import { promptForAgentModel } from "./agent/configurator.js";
import { detectPlatform, getAdapter } from "../apply/index.js";
import { loadProfile, saveProfile, type ApplyProfile } from "../apply/gemini-agent.js";
import { resolveResumePdf } from "../apply/resume-pdf.js";
import { getOrGenerateAdapter, loadGeneratedAdapter } from "../apply/adapter-generator.js";
import { verifyUrl } from "../agent/tools/urlVerifier.js";

const { prompt } = pkg;

// ── Config helpers ────────────────────────────────────────────────────────────

function resolveModel(modelFlag: string | undefined): string {
  const MODEL_MAP: Record<string, string> = {
    flash: "gemini-3-flash-preview",
    pro:   "gemini-3.1-pro-preview",
  };
  if (modelFlag && MODEL_MAP[modelFlag]) return MODEL_MAP[modelFlag];
  return modelFlag || "gemini-3-flash-preview";
}

// ── Sidecar launcher (Python browser-use) ────────────────────────────────────

async function runBrowserUseSidecar(opts: {
  url: string;
  llmConfig: {
    provider: string;
    model: string;
    apiKey?: string;
    baseUrl?: string;
  };
  resumePdfPath: string | null;
  profile: ApplyProfile;
}): Promise<void> {
  // browser_sidecar.py lives in src/apply/ — use __dirname of this compiled file to navigate up and across
  // dist/commands -> dist -> project root -> src/apply/browser_sidecar.py
  const sidecarPath = join(dirname(new URL(import.meta.url).pathname), "../../src/apply/browser_sidecar.py");
  // Fallback: if running from source (ts-node), the relative path is different
  const sidecarPathSrc = join(dirname(new URL(import.meta.url).pathname), "../apply/browser_sidecar.py");
  const resolvedSidecarPath = existsSync(sidecarPath) ? sidecarPath : sidecarPathSrc;

  // Locate Python — prefer the browser-use venv, then system python3
  const pythonCandidates = [
    join(homedir(), "careervivid", "browser-use", ".venv", "bin", "python"),
    "/opt/homebrew/bin/python3.11",
    "/opt/homebrew/bin/python3",
    "/usr/bin/python3",
  ];
  const python = pythonCandidates.find((p) => existsSync(p)) || "python3";

  const payload = JSON.stringify({
    url:             opts.url,
    llm_config:      opts.llmConfig,
    resume_pdf_path: opts.resumePdfPath || "",
    profile:         opts.profile,
    profile_dir:     join(homedir(), ".careervivid", "browser-session"),
  });

  console.log(chalk.bold.cyan("\n  🤖 Launching browser-use agent..."));
  console.log(chalk.dim(`     Model: ${opts.llmConfig.model} (${opts.llmConfig.provider})`));
  console.log(chalk.dim(`     Python: ${python}\n`));

  return new Promise((resolve, reject) => {
    const child = spawn(python, [resolvedSidecarPath], {
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
    });

    // Feed JSON payload to stdin
    child.stdin.write(payload);
    child.stdin.end();

    // Stream JSON-line progress from stdout
    let buffer = "";
    child.stdout.on("data", (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line) as { type: string; message?: string; result?: string };
          if (msg.type === "step")  console.log(chalk.dim(`   ${msg.message}`));
          if (msg.type === "done")  console.log(chalk.green(`\n  ✅ ${msg.result || "Agent finished."}`));
          if (msg.type === "error") console.log(chalk.yellow(`\n  ⚠️  ${msg.message}`));
        } catch {}
      }
    });

    child.stderr.on("data", (chunk: Buffer) => {
      const text = chunk.toString().trim();
      if (text) console.log(chalk.dim(`   [py] ${text}`));
    });

    child.on("close", (code) => {
      if (code === 0 || code === null) {
        resolve();
      } else {
        reject(new Error(`browser-use agent exited with code ${code}`));
      }
    });

    child.on("error", reject);
  });
}

// ── Profile setup wizard ──────────────────────────────────────────────────────

async function runProfileSetupWizard(): Promise<ApplyProfile> {
  console.log(
    chalk.bold.cyan("\n  📝 First-time setup — let's build your apply profile\n") +
    chalk.dim("  This is stored locally at ~/.careervivid/apply-profile.json\n") +
    chalk.dim("  It's used to auto-fill job applications. Run once, reuse forever.\n")
  );

  const fields: Array<{ name: keyof ApplyProfile; message: string; hint?: string }> = [
    { name: "firstName",         message: "First name" },
    { name: "lastName",          message: "Last name" },
    { name: "email",             message: "Email address" },
    { name: "phone",             message: "Phone number",          hint: "+1 555-123-4567" },
    { name: "city",              message: "City" },
    { name: "state",             message: "State / Province",      hint: "e.g. IL" },
    { name: "country",           message: "Country",               hint: "United States" },
    { name: "linkedin",          message: "LinkedIn URL",          hint: "https://linkedin.com/in/..." },
    { name: "github",            message: "GitHub URL (optional)", hint: "https://github.com/..." },
    { name: "portfolio",         message: "Portfolio/website URL (optional)" },
    { name: "currentTitle",      message: "Current job title" },
    { name: "currentCompany",    message: "Current company" },
    { name: "yearsOfExperience", message: "Years of experience",  hint: "e.g. 5" },
    { name: "workAuthorization", message: "Work authorization",   hint: "US Citizen / H1-B / etc." },
  ];

  const profile: ApplyProfile = {};
  for (const field of fields) {
    const { value } = await prompt<{ value: string }>({
      type: "input",
      name: "value",
      message: `  ${field.message}${field.hint ? chalk.dim(` (${field.hint})`) : ""}:`,
    }).catch(() => ({ value: "" }));
    const resolved = (value as any).value ?? value;
    if (resolved.trim()) profile[field.name] = resolved.trim();
  }

  saveProfile(profile);
  console.log(
    chalk.green("\n  ✔ Profile saved to ~/.careervivid/apply-profile.json\n") +
    chalk.dim("  Edit it anytime with: cat ~/.careervivid/apply-profile.json\n")
  );
  return profile;
}

// ── Terminal helpers ──────────────────────────────────────────────────────────

function printHeader(model: string, provider: string) {
  console.log(chalk.bold.cyan("\n🤖 CareerVivid Auto-Apply Harness"));
  console.log(chalk.dim("   Intelligent ATS routing · browser-use AI · Manual submit"));
  console.log(chalk.dim(`   Provider: ${provider}  Model: ${model}`));
  console.log(chalk.dim("─".repeat(60)));
}

function printProfileSummary(profile: ApplyProfile) {
  const entries = [
    ["Name",     [profile.firstName, profile.lastName].filter(Boolean).join(" ")],
    ["Email",    profile.email],
    ["Phone",    profile.phone],
    ["Location", [profile.city, profile.state].filter(Boolean).join(", ")],
    ["LinkedIn", profile.linkedin],
  ].filter(([, v]) => v) as [string, string][];

  if (entries.length === 0) return;
  console.log(chalk.dim("\n  Loaded profile:"));
  entries.forEach(([k, v]) =>
    console.log(chalk.dim(`    ${k.padEnd(10)} ${chalk.white(v)}`))
  );
  console.log();
}

// ── Register command ──────────────────────────────────────────────────────────

export function registerApplyCommand(program: Command) {
  program
    .command("apply [jobUrl]")
    .description("Auto-apply to any job using AI — browser-use agent fills the form, you review and submit.")
    .option("--job-id <id>", "Apply to a job already saved in your tracker by ID")
    .option("--model <model>", "Model: 'flash' or 'pro' (bypasses picker)")
    .option("--dry-run", "Show what would happen without opening a browser")
    .option("--setup-profile", "Re-run the profile setup wizard")
    .option("--no-generate", "Skip AI adapter generation for unknown ATS — go straight to Python sidecar")
    // Allow agent/non-interactive callers to pass profile data directly:
    .option("--first-name <name>",  "First name (for non-interactive use)")
    .option("--last-name <name>",   "Last name (for non-interactive use)")
    .option("--email <email>",      "Email address (for non-interactive use)")
    .option("--phone <phone>",      "Phone number (for non-interactive use)")
    .option("--linkedin <url>",     "LinkedIn URL (for non-interactive use)")
    .action(async (jobUrl: string | undefined, options) => {
      // ── 1. Load / set up profile ─────────────────────────────────────────
      let profile = loadProfile();
      const isInteractive = Boolean(process.stdin.isTTY);

      // Merge any inline flags (from agent/non-interactive callers)
      if (options.firstName) profile.firstName = options.firstName;
      if (options.lastName)  profile.lastName  = options.lastName;
      if (options.email)     profile.email     = options.email;
      if (options.phone)     profile.phone     = options.phone;
      if (options.linkedin)  profile.linkedin  = options.linkedin;

      if (options.setupProfile && isInteractive) {
        profile = await runProfileSetupWizard();
      } else if (Object.keys(profile).filter((k) => profile[k as keyof ApplyProfile]).length === 0) {
        if (isInteractive) {
          profile = await runProfileSetupWizard();
        } else {
          console.log(chalk.yellow("  ⚠️  No apply profile. Run: cv jobs apply --setup-profile\n"));
        }
      } else {
        printProfileSummary(profile);
      }

      // ── 2. Resolve job URL ───────────────────────────────────────────────
      let resolvedUrl = jobUrl;
      let jobTitle = "Unknown Role";
      let companyName = "Unknown Company";
      let jobId: string | undefined;

      if (!resolvedUrl && options.jobId) {
        jobId = options.jobId;
        console.log(chalk.dim(`\n📋 Loading job ${jobId} from tracker...`));
        const trackerResult = await jobsList();
        if (isApiError(trackerResult)) {
          console.error(chalk.red(`\n❌ Could not load tracker: ${trackerResult.message}`));
          process.exit(1);
        }
        const job = trackerResult.jobs.find((j) => j.id === jobId);
        if (!job) {
          console.error(chalk.red(`\n❌ Job ${jobId} not found in tracker.`));
          process.exit(1);
        }
        resolvedUrl = job.jobPostURL;
        jobTitle = job.jobTitle;
        companyName = job.companyName;
        console.log(chalk.cyan(`  ✔ "${jobTitle}" @ ${companyName}`));
      }

      // ── 2a. Resolve LLM Config ───────────────────────────────────────────
      let llmConfig: {
        provider: string;
        model: string;
        apiKey?: string;
        baseUrl?: string;
      } | null = null;

      if (options.model) {
        const model = resolveModel(options.model);
        // Fallback to existing config logic
        llmConfig = {
          provider: "gemini", // default for --model flag
          model: model,
          apiKey: getGeminiKey() // from config.js
        };
      } else {
        // Use the interactive picker
        const result = await promptForAgentModel();
        llmConfig = {
          provider: result.selectedProvider,
          model: result.selectedModel,
          apiKey: result.apiKey || getLlmConfig({ provider: result.selectedProvider }).apiKey,
          baseUrl: getLlmConfig({ provider: result.selectedProvider }).baseUrl
        };
      }

      if (!llmConfig || !llmConfig.model) {
        console.error(chalk.red("\n❌ No LLM configuration selected.\n"));
        process.exit(1);
      }

      printHeader(llmConfig.model, llmConfig.provider);

      if (!resolvedUrl) {
        console.error(chalk.red("\n❌ Please provide a job URL or --job-id <id>\n"));
        console.log(chalk.dim("  Example: cv jobs apply https://boards.greenhouse.io/stripe/jobs/7788088"));
        process.exit(1);
      }

      // ── 3. Verify direct apply URL before any browser automation ──────────
      console.log(chalk.dim("\n  Verifying apply link..."));
      const verification = await verifyUrl(resolvedUrl);
      if (!verification.ok) {
        console.error(chalk.red(`\n❌ Apply link rejected: ${verification.reason}`));
        if (verification.finalUrl && verification.finalUrl !== resolvedUrl) {
          console.error(chalk.dim(`   Final URL: ${verification.finalUrl}`));
        }
        console.error(chalk.dim("   Search for a current direct apply page before running the harness.\n"));
        process.exit(1);
      }
      if (verification.warning) {
        console.log(chalk.yellow(`  ⚠️  ${verification.warning}`));
      }
      if (verification.finalUrl && verification.finalUrl !== resolvedUrl) {
        console.log(chalk.dim(`  Redirect resolved: ${verification.finalUrl}`));
        resolvedUrl = verification.finalUrl;
      }

      // ── 4. Resolve resume PDF ────────────────────────────────────────────
      const resumePdf = await resolveResumePdf();

      // ── 5. Detect platform ───────────────────────────────────────────────
      const platform = detectPlatform(resolvedUrl);
      const platformLabel: Record<string, string> = {
        greenhouse: "Greenhouse 🌱", lever: "Lever", ashby: "Ashby",
        linkedin: "LinkedIn", workday: "Workday", icims: "iCIMS", generic: "Unknown/Generic",
      };
      console.log(chalk.cyan(`  Platform: ${platformLabel[platform] || platform}`));
      console.log(chalk.dim(`  URL:      ${resolvedUrl}`));

      if (platform === "linkedin") {
        console.log(chalk.yellow("\n⚠️  LinkedIn requires manual apply — opening browser-use agent.\n"));
      }

      // ── 6. Dry run ───────────────────────────────────────────────────────
      if (options.dryRun) {
        console.log(chalk.yellow("\n🔍 DRY RUN — nothing will open or be filled.\n"));
        const profileKeys = Object.keys(profile).filter((k) => profile[k as keyof ApplyProfile]);
        console.log(chalk.dim(`  Profile fields ready: ${profileKeys.join(", ")}`));
        console.log(chalk.dim(`  Resume PDF: ${resumePdf || "not found"}`));
        console.log(chalk.dim(`  Provider: ${llmConfig.provider}`));
        console.log(chalk.dim(`  Model: ${llmConfig.model}`));
        console.log(chalk.dim("  Re-run without --dry-run to execute.\n"));
        process.exit(0);
      }

      // ── 7. Verification ──────────────────────────────────────────────────
      if (!llmConfig.apiKey && llmConfig.provider !== "careervivid") {
        console.log(chalk.red(`\n❌ No API key found for provider: ${llmConfig.provider}`));
        console.log(chalk.dim("   Set it via: cv agent config\n"));
        process.exit(1);
      }

      // ── 8. HARNESS ROUTING ───────────────────────────────────────────────
      //
      //  Route A: Known platform → TypeScript adapter (fast, no LLM)
      //  Route B: Unknown platform → AI-generate new adapter
      //  Fallback: Python browser-use sidecar (universal, LLM-powered)
      //
      let harnessSuccess = false;

      if (platform !== "generic") {
        // ── Route A: Known TypeScript adapter ─────────────────────────────
        console.log(chalk.bold("\n  Route A: Running TypeScript adapter..."));
        try {
          const { launchApplyBrowser } = await import("../apply/browser.js");
          const browser = await launchApplyBrowser();
          const adapter = await getAdapter(platform);

          await adapter.navigateToForm(browser.page, resolvedUrl);

          if (adapter.fillFromProfile) {
            const { filled, skipped } = await adapter.fillFromProfile(browser.page, profile);
            if (filled.length > 0) {
              console.log(chalk.green(`\n  ✔ Filled ${filled.length} standard fields`));
            }
            if (skipped.length > 0) {
              console.log(chalk.dim(`  ↳ Skipped: ${skipped.join(", ")}`));
            }
          }

          // Do NOT close the browser here — the sidecar will open its own session
          // and the user needs to see the window for manual review after Phase 2.
          if (profile.email && profile.firstName) {
            harnessSuccess = true;
            console.log(chalk.bold.green("\n  ✅ Standard fields filled! Handing off to browser-use agent for AI fields...\n"));
            // Keep browser open — user will review and submit manually.
            // The sidecar opens its own window for the AI-fill phase.
          } else {
            await browser.close();
          }
        } catch (err: any) {
          console.log(chalk.yellow(`\n  ⚠️  TypeScript adapter failed: ${err.message}`));
          console.log(chalk.dim("     Handing off to browser-use agent...\n"));
        }
      } else {
        // ── Route B: Unknown ATS — generate adapter ────────────────────────
        if (options.generate !== false) {
          console.log(chalk.bold("\n  Route B: Unknown ATS — generating adapter..."));
          try {
            const generated = await getOrGenerateAdapter(resolvedUrl, llmConfig.apiKey || "", llmConfig.model);
            if (generated) {
              const generatedAdapter = await loadGeneratedAdapter(generated.filePath);
              if (generatedAdapter) {
                const { launchApplyBrowser } = await import("../apply/browser.js");
                const browser = await launchApplyBrowser();
                await generatedAdapter.navigateToForm?.(browser.page, resolvedUrl);
                if (generatedAdapter.fillFromProfile) {
                  await generatedAdapter.fillFromProfile(browser.page, profile);
                }
                await browser.close();
                harnessSuccess = true;
                console.log(chalk.green(`  ✔ Generated adapter applied (${generated.source})`));
              }
            }
          } catch (err: any) {
            console.log(chalk.yellow(`  ⚠️  Adapter generation failed: ${err.message}`));
          }
        }
      }

      // ── Fallback / Phase 2: browser-use Python sidecar ──────────────────
      // Always runs — the TS adapter does profile-fill, the sidecar handles
      // AI fields, resume upload, and verification pass.
      console.log(chalk.bold("\n  Phase 2: browser-use agent taking over..."));

      try {
        await runBrowserUseSidecar({
          url: resolvedUrl,
          llmConfig,
          resumePdfPath: resumePdf,
          profile,
        });
      } catch (err: any) {
        console.log(chalk.yellow(`\n  ⚠️  browser-use agent error: ${err.message}`));
        console.log(chalk.dim("  The browser may still be open — check manually.\n"));
      }

      // ── 8. Done — browser stays open (managed by browser_sidecar.py) ────
      console.log(
        chalk.bold.green("\n  ✅ Agent finished! Review the browser and submit when ready.\n") +
        chalk.cyan("  👀 Check all fields before clicking Submit.\n") +
        chalk.dim("  The browser will stay open until you close it.\n")
      );

      // ── 9. Optional: update tracker ──────────────────────────────────────
      if (jobId && isInteractive) {
        const { markDone } = await prompt<{ markDone: string }>({
          type: "select",
          name: "markDone",
          message: "After submitting, update tracker status?",
          choices: [
            { name: "applied", message: "✅  Yes — mark as Applied" },
            { name: "skip",    message: "⏭   No — keep current status" },
          ],
        }).catch(() => ({ markDone: "skip" }));

        const resolved = (markDone as any).markDone ?? markDone;
        if (resolved === "applied") {
          await jobsUpdate({
            jobId,
            status: "Applied",
            notes: `Auto-applied via cv jobs apply on ${new Date().toLocaleDateString()}`,
          }).catch(() => null);
          console.log(chalk.green("  ✔ Tracker updated → Applied\n"));
        }
      }
    });
}
