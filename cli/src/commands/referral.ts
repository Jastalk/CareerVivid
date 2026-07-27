import { Command } from "commander";
import boxen from "boxen";
import chalk from "chalk";
import ora from "ora";
import { getReferralStats, isApiError } from "../api.js";
import { printError } from "../output.js";

function getProgressBar(current: number, total: number, width: number = 30): string {
    const percentage = Math.min(Math.max(current / total, 0), 1);
    const filledLength = Math.round(width * percentage);
    const emptyLength = width - filledLength;
    const filledBar = '█'.repeat(filledLength);
    const emptyBar = '░'.repeat(emptyLength);
    return `[${chalk.cyan(filledBar)}${chalk.dim(emptyBar)}]`;
}

export function registerReferralCommand(program: Command) {
    const referralCmd = program
        .command("referral")
        .description("Manage your CareerVivid referral code, track progress, and view rewards")
        .option("-c, --code", "Retrieve and display your unique referral code")
        .option("-l, --link", "Generate and display your full shareable referral URL")
        .option("-d, --draft-message", "Generate a highly-converting draft message for your network")
        .option("-s, --status", "Display current state of active referrals (clicks, signups, progress)")
        .option("-i, --list", "Output a detailed list of your historical referral data")
        .option("--json", "Output raw JSON data")
        .action(async (opts) => {
            const isJson = opts.json ?? process.argv.includes("--json");
            const spinner = ora({
                text: chalk.dim("Fetching referral ecosystem data..."),
                color: "cyan"
            }).start();

            const result = await getReferralStats();
            
            if (isApiError(result)) {
                spinner.fail(chalk.red("Failed to sync referral data."));
                printError(result.message, undefined, isJson);
                process.exit(1);
            }

            spinner.succeed(chalk.dim("Referral data synchronized successfully."));

            const baseUrl = "https://careervivid.app/referral?ref=";
            const fullLink = `${baseUrl}${result.code}`;

            if (isJson) {
                console.log(JSON.stringify({ ...result, fullLink }, null, 2));
                return;
            }

            // If no specific flag is provided, show the summary dashboard
            const showSummary = !opts.code && !opts.link && !opts.draftMessage && !opts.status && !opts.list;

            console.log(""); // Spacer

            // ── Flag: --code ──────────────────────────────────────────────────
            if (opts.code) {
                console.log(boxen(
                    `${chalk.cyan.bold("REFERRAL CODE")}\n\n${chalk.white.bold.bgCyan("  " + result.code + "  ")}`,
                    { padding: 1, margin: 0, borderStyle: "round", borderColor: "cyan" }
                ));
            }

            // ── Flag: --link ──────────────────────────────────────────────────
            if (opts.link) {
                console.log(boxen(
                    `${chalk.cyan.bold("SHAREABLE LINK")}\n\n${chalk.underline.blue(fullLink)}`,
                    { padding: 1, margin: 0, borderStyle: "round", borderColor: "blue" }
                ));
            }

            // ── Flag: --draft-message ─────────────────────────────────────────
            if (opts.draftMessage) {
                const message = `Accelerate Your Career Path with CareerVivid! 🚀\n\nI've been using CareerVivid to automate my job tracker and resume building. It's a game-changer.\n\nUse my exclusive code ${result.code} to get 2 MONTHS of PRO for FREE.\n\nClaim it here: ${fullLink}`;
                
                console.log(boxen(
                    `${chalk.magenta.bold("HIGH-CONVERTING DRAFT")}\n\n${chalk.white(message)}`,
                    { padding: 1, margin: 0, borderStyle: "round", borderColor: "magenta", title: "Copy & Paste" }
                ));
            }

            // ── Flag: --status ───────────────────────────────────────────────
            if (opts.status || showSummary) {
                const remaining = Math.max(0, result.maxReferrals - result.totalReferred);
                const statusContent = [
                    `${chalk.yellow.bold("REDEMPTION PROGRESS")}`,
                    `${getProgressBar(result.totalReferred, result.maxReferrals)} ${chalk.bold(`${result.totalReferred}/${result.maxReferrals}`)}`,
                    `${chalk.dim(`${remaining} referrals remaining to maximize rewards`)}`,
                    "",
                    `${chalk.cyan.bold("ACTIVE REWARDS")}`,
                    `${chalk.green("✔")} ${chalk.white("THEY GET:")} 2 Months Pro + 1000 AI Credits`,
                    `${chalk.green("✔")} ${chalk.white("YOU GET:")}  1 Month Pro extension per signup`
                ].join("\n");

                console.log(boxen(statusContent, { padding: 1, borderStyle: "double", borderColor: "yellow" }));
            }

            // ── Flag: --list ──────────────────────────────────────────────────
            if (opts.list) {
                const listTitle = chalk.blue.bold("REFERRAL HISTORY");
                if (result.referredUsers.length === 0) {
                    console.log(boxen(`${listTitle}\n\n${chalk.dim("No successful referrals recorded yet.\nStart sharing to earn Pro extensions!")}`, { padding: 1, borderStyle: "round", borderColor: "blue" }));
                } else {
                    const rows = result.referredUsers.map((u, i) => {
                        const date = u.signupDate ? new Date(u.signupDate).toLocaleDateString() : "Recently";
                        return `${chalk.dim(`${i+1}.`)} ${chalk.white(u.email.padEnd(25))} ${chalk.dim(`[${date}]`)} ${chalk.green("● active")}`;
                    });
                    console.log(boxen(`${listTitle}\n\n${rows.join("\n")}`, { padding: 1, borderStyle: "round", borderColor: "blue" }));
                }
            }

            if (showSummary) {
                console.log(chalk.dim(`  Use ${chalk.cyan('cv referral --help')} to see all available flags.`));
            }

            console.log(""); // Final spacer
        });
}
