/**
 * cv update — Effortless CLI upgrading
 *
 * Programmatically runs 'npm install -g careervivid@latest' 
 * to upgrade the CLI to the latest version.
 */

import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { spawn } from "child_process";
import { getHelpHeader } from "../branding.js";

export function registerUpdateCommand(program: Command): void {
    program
        .command("upgrade")
        .description("Upgrade the CareerVivid CLI to the latest version")
        .action(async () => {
            console.log(getHelpHeader());
            const spinner = ora("Upgrading CareerVivid CLI to latest...").start();

            // Run npm install -g careervivid@latest
            const isWin = process.platform === "win32";
            const npmCmd = isWin ? "npm.cmd" : "npm";
            const npm = spawn(npmCmd, ["install", "-g", "careervivid@latest"], {
                stdio: "pipe",
                shell: isWin,
            });

            let output = "";
            let errorOutput = "";

            npm.stdout.on("data", (data) => {
                output += data.toString();
            });

            npm.stderr.on("data", (data) => {
                errorOutput += data.toString();
            });

            npm.on("close", (code) => {
                spinner.stop();

                if (code === 0) {
                    console.log();
                    console.log(`  ${chalk.bold.green("✔  Successfully updated!")}`);
                    console.log(`  ${chalk.dim("Check the latest version with:")} ${chalk.cyan("cv --version")}\n`);
                } else {
                    console.error(`\n  ${chalk.red("✖")}  ${chalk.bold.red("Upgrade failed (code " + code + "):")}`);

                    if (errorOutput.includes("EACCES") || errorOutput.includes("permission denied")) {
                        console.error(`  ${chalk.yellow("Try running with sudo:")} ${chalk.bold("sudo npm install -g careervivid@latest")}`);
                    } else {
                        console.error(chalk.dim(errorOutput || output));
                    }
                    process.exit(1);
                }
            });
        });
}
