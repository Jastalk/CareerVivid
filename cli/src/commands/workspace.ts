import { Command } from "commander";
import chalk from "chalk";
import boxen from "boxen";
import { checkGwsReady } from "../utils/gws-runner.js";
import { COLORS } from "../branding.js";

export function registerWorkspaceCommand(program: Command): void {
    const workspace = program
        .command("workspace")
        .alias("gws")
        .description("Manage Google Workspace integrations (Google Docs, Gmail, Sheets)");

    workspace
        .command("check")
        .description("Verify that the Google Workspace CLI is installed and authenticated")
        .action(async () => {
            console.log(`\n  ${chalk.bold("CareerVivid Google Workspace Integration")}\n`);

            const isReady = await checkGwsReady();

            if (isReady) {
                console.log(
                    boxen(
                        `${chalk.green("✔ Google Workspace integration is fully configured.")}\n\n` +
                        `You can now use CareerVivid commands that export to Google Docs,\n` +
                        `sync with Gmail, and manage Calendar invites.`,
                        {
                            padding: 1,
                            margin: { top: 1, bottom: 1 },
                            borderStyle: "round",
                            borderColor: COLORS.success,
                        }
                    )
                );
            } else {
                console.log(
                    boxen(
                        `${chalk.red("✖ Google Workspace integration is not ready.")}\n\n` +
                        `Please ensure you have installed \`gws\` and authenticated:\n\n` +
                        `${chalk.cyan("npm install -g @googleworkspace/cli")}\n` +
                        `${chalk.cyan("gws auth setup")}`,
                        {
                            padding: 1,
                            margin: { top: 1, bottom: 1 },
                            borderStyle: "round",
                            borderColor: COLORS.error,
                        }
                    )
                );
                process.exit(1);
            }
        });
}
