/**
 * cv auth — API key management
 *
 * Subcommands:
 *   cv auth set-key          Interactively prompt for / provide an API key, validates it before saving
 *   cv auth check            Verify the saved key and display your identity
 *   cv auth whoami           Print the current key configuration
 *   cv auth revoke           Remove saved API key from config
 */

import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import boxen from "boxen";
import { CONFIG_FILE, loadConfig, setConfigValue, stampSession } from "../config.js";
import { verifyKey, isApiError } from "../api.js";
import { getApiKey } from "../config.js";
import { printError, printInfo } from "../output.js";
import { COLORS } from "../branding.js";

function adminBadge(isAdmin: boolean): string {
    return isAdmin ? ` ${chalk.bgYellow.black(" ADMIN ")}` : "";
}

export function registerAuthCommand(program: Command): void {
    const auth = program
        .command("auth")
        .description("Manage API key authentication");

    // ── set-key ───────────────────────────────────────────────────────────────
    auth
        .command("set-key [apiKey]")
        .description("Save your CareerVivid API key (validates before saving)")
        .option("--json", "Machine-readable output")
        .action(async (apiKeyArg: string | undefined, opts: { json?: boolean }) => {
            const jsonMode = !!opts.json;
            let apiKey = apiKeyArg;

            if (!apiKey) {
                if (jsonMode) {
                    printError("In --json mode, provide the API key as an argument: cv auth set-key <key>", undefined, true);
                    process.exit(1);
                }

                console.log();
                console.log(`  ${chalk.bold("Get your API key at:")} ${chalk.cyan("https://careervivid.app/developer")}`);
                console.log(`  ${chalk.dim("Or run")} ${chalk.cyan("cv login")} ${chalk.dim("to authenticate via browser.\n")}`);

                const enquirer = (await import("enquirer")) as any;
                const prompt = enquirer.default?.prompt || enquirer.prompt;
                const answers = await prompt({
                    type: "password",
                    name: "key",
                    message: "Paste your API key",
                });
                apiKey = (answers as any).key.trim();
            }

            if (!apiKey || !apiKey.startsWith("cv_live_")) {
                printError("Invalid key format. CareerVivid API keys start with cv_live_", undefined, jsonMode);
                process.exit(1);
            }

            // ── Validate key against /verifyAuth before saving ────────────────
            const spinner = jsonMode ? null : ora("Verifying key...").start();
            const result = await verifyKey(apiKey);
            spinner?.stop();

            if (isApiError(result)) {
                if (jsonMode) {
                    console.log(JSON.stringify({ success: false, ok: false, error: result.message }));
                } else {
                    console.error(`\n  ${chalk.red("✖")}  ${chalk.bold.red("Invalid key:")} ${result.message}`);
                    console.error(`\n  ${chalk.dim("Run")} ${chalk.cyan("cv login")} ${chalk.dim("to authenticate via browser.\n")}`);
                }
                process.exit(1);
            }

            setConfigValue("apiKey", apiKey);
            stampSession(); // start 90-day session clock

            if (!jsonMode) {
                console.log(
                    boxen(
                        `${chalk.bold.green("✔  Key saved successfully!")}\n\n` +
                        `${chalk.dim("Name:  ")} ${chalk.white(result.name)}${adminBadge(result.isAdmin)}\n` +
                        `${chalk.dim("Email: ")} ${chalk.white(result.email || "—")}\n` +
                        `${chalk.dim("File:  ")} ${chalk.dim(CONFIG_FILE)}`,
                        {
                            padding: 1,
                            margin: { top: 1, bottom: 1 },
                            borderStyle: "round",
                            borderColor: COLORS.success,
                        }
                    )
                );
            } else {
                console.log(JSON.stringify({
                    success: true,
                    ok: true,
                    name: result.name,
                    email: result.email,
                    role: result.role,
                    isAdmin: result.isAdmin,
                    configFile: CONFIG_FILE,
                }));
            }
        });

    // ── check ──────────────────────────────────────────────────────────────────
    auth
        .command("check")
        .description("Verify your API key and display your identity")
        .option("--json", "Machine-readable output")
        .action(async (opts: { json?: boolean }) => {
            const jsonMode = !!opts.json;
            const key = getApiKey();

            if (!key) {
                printError("No API key configured. Run: cv login", undefined, jsonMode);
                process.exit(1);
            }

            const spinner = jsonMode ? null : ora("Verifying identity...").start();
            const result = await verifyKey(key);
            spinner?.stop();

            if (isApiError(result)) {
                if (!jsonMode) {
                    console.error(
                        `\n  ${chalk.red("✖")}  ${chalk.bold.red("Authentication failed:")} ${result.message}\n` +
                        `\n  ${chalk.dim("Your key may have been revoked. Run")} ${chalk.cyan("cv login")} ${chalk.dim("to re-authenticate.\n")}`
                    );
                } else {
                    console.log(JSON.stringify({ success: false, ok: false, error: result.message }));
                }
                process.exit(1);
            }

            if (!jsonMode) {
                console.log(
                    boxen(
                        `${chalk.bold.green("✔  Authenticated successfully!")}\n\n` +
                        `${chalk.dim("Name:   ")} ${chalk.white(result.name)}${adminBadge(result.isAdmin)}\n` +
                        `${chalk.dim("Email:  ")} ${chalk.white(result.email || "—")}\n` +
                        `${chalk.dim("Role:   ")} ${chalk.cyan(result.role)}\n` +
                        `${chalk.dim("Source: ")} ${process.env.CV_API_KEY ? "Environment variable (CV_API_KEY)" : `Config file (${CONFIG_FILE})`}`,
                        {
                            padding: 1,
                            margin: { top: 1, bottom: 1 },
                            borderStyle: "round",
                            borderColor: COLORS.success,
                        }
                    )
                );
            } else {
                console.log(JSON.stringify({ success: true, ok: true, ...result }));
            }
        });

    // ── whoami ─────────────────────────────────────────────────────────────────
    auth
        .command("whoami")
        .description("Print the current API key configuration")
        .option("--json", "Machine-readable output")
        .action(async (opts: { json?: boolean }) => {
            const jsonMode = !!opts.json;
            const config = loadConfig();
            const keyFromEnv = !!process.env.CV_API_KEY;
            const key = getApiKey();

            if (!key) {
                printError("No API key configured. Run: cv login", undefined, jsonMode);
                process.exit(1);
            }

            const masked = `${key.slice(0, 16)}${"•".repeat(Math.max(0, key.length - 16))}`;

            if (!jsonMode) {
                console.log();
                console.log(`  ${chalk.dim("API Key:    ")} ${chalk.cyan(masked)}`);
                console.log(`  ${chalk.dim("Key source: ")} ${keyFromEnv ? "Environment variable (CV_API_KEY)" : `Config file (${CONFIG_FILE})`}`);
                console.log(`  ${chalk.dim("API URL:    ")} ${config.apiUrl || "https://careervivid.app/api/publish (default)"}`);
                console.log(`\n  ${chalk.dim("Run")} ${chalk.cyan("cv auth check")} ${chalk.dim("to verify and see your identity.")}`);
                console.log();
            } else {
                console.log(JSON.stringify({
                    apiKey: masked,
                    keySource: keyFromEnv ? "env" : "config",
                    configFile: CONFIG_FILE,
                    apiUrl: config.apiUrl || "default",
                }));
            }
        });

    // ── revoke ─────────────────────────────────────────────────────────────────
    auth
        .command("revoke")
        .description("Remove the saved API key from ~/.careervividrc.json")
        .option("--json", "Machine-readable output")
        .action(async (opts: { json?: boolean }) => {
            const jsonMode = !!opts.json;
            const config = loadConfig();
            if (!config.apiKey) {
                printInfo("No API key in config file to remove.", jsonMode);
                return;
            }
            delete config.apiKey;
            delete (config as any).sessionCreatedAt;

            const { saveConfig } = await import("../config.js");
            saveConfig(config);

            if (jsonMode) {
                console.log(JSON.stringify({ success: true, ok: true }));
            } else {
                console.log();
                console.log(`  ${chalk.green("✔")}  API key removed from ${chalk.dim(CONFIG_FILE)}`);
                console.log(`  ${chalk.dim("Run")} ${chalk.cyan("cv login")} ${chalk.dim("to re-authenticate.")}`);
                console.log();
            }
        });
}
