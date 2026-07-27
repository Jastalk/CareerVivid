/**
 * CareerVivid CLI — Post-install hook
 *
 * This script runs after 'npm install -g careervivid'.
 * It checks Node version compatibility and prints a welcome message.
 */

import chalk from "chalk";
import boxen from "boxen";
import { getHelpHeader } from "./branding.js";

const VERSION = "1.1.14";
const MIN_NODE_MAJOR = 18;

function checkNodeVersion() {
  const [major] = process.versions.node.split(".").map(Number);
  if (major < MIN_NODE_MAJOR) {
    console.error(
      boxen(
        `${chalk.bold.red("⚠️  Node.js version too old")}\n\n` +
        `You have Node ${chalk.bold(process.versions.node)}, but CareerVivid CLI requires ${chalk.bold(`v${MIN_NODE_MAJOR}+`)}\n\n` +
        `${chalk.bold("To upgrade Node.js:")}\n` +
        `  ${chalk.cyan("https://nodejs.org")}  (download the LTS release)\n` +
        `  ${chalk.dim("or")}  ${chalk.cyan("nvm install --lts && nvm use --lts")}\n\n` +
        `${chalk.dim("The CLI may not work correctly until you upgrade.")}`,
        {
          padding: 1,
          borderStyle: "round",
          borderColor: "red",
          title: "Version Warning",
          titleAlignment: "center",
        }
      )
    );
    // Don't exit — let them at least see the welcome message
  }
}

export function printPostInstall() {
    checkNodeVersion();
    console.log();
    console.log(getHelpHeader());

    // ── Onboarding box ──────────────────────────────────────────────────────
    const steps = [
        `${chalk.bold.cyan("1.")} ${chalk.white("cv login")}${" ".repeat(14)}${chalk.dim("Sign in or create your free account")}`,
        `${chalk.bold.cyan("2.")} ${chalk.white("Visit")} ${chalk.underline.blue("careervivid.app/developer")}`,
        `   ${chalk.dim("→ Generate your free API key")}`,
        `${chalk.bold.cyan("3.")} ${chalk.white("cv auth set-key <your-key>")}  ${chalk.dim("Activate the key locally")}`,
    ].join("\n");

    const credits = [
        `${chalk.bold.yellow("✦")} Free plan includes ${chalk.bold("100 AI credits / month")}`,
        `  ${chalk.dim("No personal API key needed for Gemini models.")}`,
        `  ${chalk.dim("Credits are powered by Google Gemini — enterprise-grade AI,")}`,
        `  ${chalk.dim("available at no extra cost under your CareerVivid plan.")}`,
    ].join("\n");

    const quickStart = [
        `  ${chalk.cyan("cv agent --jobs")}    ${chalk.dim("Hunt for jobs with AI")}`,
        `  ${chalk.cyan("cv agent --resume")}  ${chalk.dim("Analyze & improve your resume")}`,
        `  ${chalk.cyan("cv agent")}           ${chalk.dim("Open general AI agent")}`,
    ].join("\n");

    console.log(
        boxen(
            `${chalk.bold.green("🎉 Welcome to CareerVivid CLI v" + VERSION + "!")}\n\n` +
            `${chalk.bold("Get started in 3 steps:")}\n` +
            steps + "\n\n" +
            credits + "\n\n" +
            `${chalk.bold("Quick start:")}\n` +
            quickStart,
            {
                padding: 1,
                margin: { top: 0, bottom: 1 },
                borderStyle: "round",
                borderColor: "#22c55e",
                title: "CareerVivid CLI",
                titleAlignment: "center",
            }
        )
    );
}

// Run if executed directly
if (import.meta.url.endsWith("postinstall.js") || process.argv[1].endsWith("postinstall.js")) {
    printPostInstall();
}
