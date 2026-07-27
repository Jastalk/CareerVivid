import chalk from "chalk";
import boxen from "boxen";
import gradient from "gradient-string";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, "../package.json"), "utf-8"));

// ── Colors ───────────────────────────────────────────────────────────────────

export const COLORS = {
    primary: "#3b82f6", // Blue-500
    secondary: "#f59e0b", // Amber-500
    success: "#10b981", // Emerald-500
    error: "#ef4444",   // Red-500
    dim: "#6b7280",     // Gray-500
};

const brandGradient = gradient([COLORS.primary, COLORS.secondary]);

// ── Logo ─────────────────────────────────────────────────────────────────────

export const LOGO_ASCII = `
   ______                            _    ___                _     _ 
  / ____/____ _ _____ ___  ___  ____| |  / (_) _   __ (_) _ | |   | |
 / /    / __ \`/ ___/ _ \\/ _ \\/ ___/ | / / /| | | | / / | | | | |   | |
/ /___ / /_/ / /   /  __/  __/ /   | |/ / / | | | |/ /  | | | | |___| |
\\____/ \\__,_/_/    \\___/\\___/_/    |___/ /  |_| |___/   |_| |_|\\___/|_|
`;

export function getBrandedLogo(): string {
    return brandGradient.multiline(LOGO_ASCII);
}

// ── Welcome Screen ───────────────────────────────────────────────────────────

export function printWelcome(): void {
    const logo = getBrandedLogo();

    const content = `
${chalk.bold("Welcome to the CareerVivid CLI!")}
${chalk.dim("Your AI-powered career management command-center.")}

${chalk.white("To get started, run:")}
${chalk.cyan("  cv login")}

${chalk.dim("Quick Commands:")}
${chalk.white("• cv agent")}           Start the AI career agent
${chalk.white("• cv jobs hunt")}       Search & score job openings
${chalk.white("• cv resumes list")}    View your AI-parsed resumes
${chalk.white("• cv referral")}        View your referral dashboard
${chalk.white("• cv publish <file>")}  Publish to CareerVivid
${chalk.white("• cv help")}            Show all commands
`;

    console.log(
        boxen(logo + "\n" + content, {
            padding: 1,
            margin: 1,
            borderStyle: "round",
            borderColor: COLORS.primary,
            title: chalk.bold.blue(` v${pkg?.version ?? "latest"} `),
            titleAlignment: "right",
        })
    );
}

// ── Help Header ─────────────────────────────────────────────────────────────

export function getHelpHeader(): string {
    return boxen(brandGradient(" CAREERVIVID CLI "), {
        padding: 0,
        margin: { top: 1, bottom: 1 },
        borderStyle: "bold",
        borderColor: COLORS.secondary,
    });
}
