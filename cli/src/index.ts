#!/usr/bin/env node
/**
 * CareerVivid CLI — Entry Point
 *
 * Usage:
 *   cv login                           Authenticate via browser (human users)
 *   cv publish <file>                 Publish a markdown/mermaid file
 *   cv publish -                      Read from stdin (pipe-friendly)
 *   cv publish --official             Publish as CareerVivid Community (admin)
 *   cv whiteboard new                 Scaffold a Mermaid diagram file
 *   cv whiteboard new --template system-arch  Use a built-in template
 *   cv whiteboard list-templates      List all available templates
 *   cv auth set-key <key>             Save your API key (validates before saving)
 *   cv auth check                     Display your identity & verify your key
 *   cv config show                    Print current configuration
 *   cv config set <key> <value>       Update a config value
 *   cv config get <key>               Print a config value
 *   cv upgrade                        Upgrade the CLI to the latest version
 *   cv update [files...]              Update existing content on CareerVivid
 *   cv --help / cv --version
 */

// ── Node version guard (must be before ESM imports) ─────────────────────────
// Uses only Node built-ins so it works on ANY Node version.
const [nodeMajor] = process.versions.node.split(".").map(Number);
if (nodeMajor < 18) {
  process.stderr.write(
    `\n⚠️  CareerVivid CLI requires Node.js v18 or higher.\n` +
    `   You are running Node ${process.versions.node}.\n\n` +
    `   Upgrade at: https://nodejs.org  (download the LTS release)\n` +
    `   or:  nvm install --lts && nvm use --lts\n\n`
  );
  process.exit(1);
}

import { Command } from "commander";
import { readFileSync, existsSync } from "fs";
import chalk from "chalk";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { CONFIG_FILE } from "./config.js";
import { isSessionValid } from "./config.js";
import { getHelpHeader, printWelcome } from "./branding.js";
import { registerAuthCommand } from "./commands/auth.js";
import { registerLoginCommand } from "./commands/login.js";
import { registerLogoutCommand } from "./commands/logout.js";
import { registerPublishCommand } from "./commands/publish.js";
import { registerConfigCommand } from "./commands/config.js";
import { registerUpdateCommand } from "./commands/update.js";
import { registerAgentCommand } from "./commands/agent/index.js";
import { checkForUpdates } from "./updates.js";
import { registerListTemplatesCommand, registerNewCommand, registerWhiteboardCommand } from "./commands/whiteboard.js";
import { registerPortfolioCommand } from "./commands/portfolio.js";
import { registerWorkspaceCommand } from "./commands/workspace.js";
import { registerProfileCommand } from "./commands/profile.js";
import { registerJobsCommand } from "./commands/jobs.js";
import { registerResumesCommand } from "./commands/resumes.js";
import { registerReferralCommand } from "./commands/referral.js";
import { registerEvalCommand }    from "./commands/eval.js";
import { registerInterviewCommand } from "./commands/interview.js";
import { registerAdminCommand } from "./commands/admin.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, "../package.json"), "utf-8"));

const program = new Command();

program
    .name("cv")
    .description(
        "CareerVivid CLI — AI-powered career management: job hunting, resume building, referrals, and portfolio publishing."
    )
    .version(pkg.version, "-v, --version", "Print CLI version")
    .addHelpText("before", getHelpHeader())
    .helpOption("-h, --help", "Show help");

registerAuthCommand(program);
registerLoginCommand(program);
registerLogoutCommand(program);
registerPublishCommand(program);
registerConfigCommand(program);
registerUpdateCommand(program);
registerAgentCommand(program);
registerWhiteboardCommand(program);
registerPortfolioCommand(program);
registerWorkspaceCommand(program);
registerProfileCommand(program);
registerJobsCommand(program);
registerResumesCommand(program);
registerReferralCommand(program);
registerEvalCommand(program);
registerInterviewCommand(program);
if (process.env.CV_ADMIN === "true") {
    registerAdminCommand(program);
}

// Shortcuts for whiteboard creation
registerNewCommand(program);
registerListTemplatesCommand(program);

// ── Execution ──────────────────────────────────────────────────────────────

async function main() {
    // Show welcome screen if no config exists and no env var set
    const isFirstRun = !existsSync(CONFIG_FILE) && !process.env.CV_API_KEY;

    // Only show if running without arguments or just 'cv'
    if (isFirstRun && process.argv.length <= 2) {
        printWelcome();
        console.log(`  ${chalk.dim("Get started quickly with:")} ${chalk.cyan("cv login")}
`);
        return;
    }

    // ── Session expiry check (firebase-cli style) ──────────────────────────────
    // Skip for auth/login/logout/config/help commands — they don’t need a live session.
    // Subcommand help must work before login, e.g. `cv agent --help`.
    const SESSION_EXEMPT = ["login", "logout", "auth", "config", "upgrade", "-v", "--version", "-h", "--help", "help"];
    const subcommand = process.argv[2] ?? "";
    const wantsHelp = process.argv.includes("-h") || process.argv.includes("--help") || subcommand === "help";
    const isExempt = wantsHelp || SESSION_EXEMPT.includes(subcommand);

    if (!isExempt && !process.env.CV_API_KEY && !isSessionValid()) {
        const { loadConfig } = await import("./config.js");
        const hasKey = !!loadConfig().apiKey;
        if (hasKey) {
            // Session expired
            console.error(`
  ${chalk.yellow("⚠")}  ${chalk.bold("Your CareerVivid session has expired.")} (90-day limit)

  Please re-authenticate:
    ${chalk.cyan("cv login")}

  Or visit: ${chalk.underline.blue("https://careervivid.app/developer")}
`);
        } else {
            // No key at all
            console.error(`
  ${chalk.red("✖")}  ${chalk.bold("Not logged in to CareerVivid.")}

  ${chalk.cyan("cv login")}
`);
        }
        process.exit(1);
    }

    try {
        await program.parseAsync(process.argv);

        // Check for updates asynchronously after command execution
        // unless in JSON mode to avoid pollution
        const isJson = process.argv.includes("--json");
        if (!isJson) {
            checkForUpdates().catch(() => { });
        }
    } catch (err: any) {
        console.error(`\nFatal error: ${err.message}`);
        process.exit(1);
    }
}

main();
