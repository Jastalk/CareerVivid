/**
 * cv config — view and modify CLI configuration
 *
 * Subcommands:
 *   cv config show              Print current configuration
 *   cv config get <key>         Print single config value
 *   cv config set <key> <val>   Set a config value
 *
 * Security policy:
 *   - geminiKey  : CareerVivid's internal key — NEVER shown, cannot be get/set by users
 *   - apiKey     : User's CareerVivid token — shown masked (first 16 chars + bullets)
 *   - llmApiKey  : User's own BYO API key   — shown masked (first 8 chars + bullets)
 */

import { Command } from "commander";
import chalk from "chalk";
import { CONFIG_FILE, loadConfig, setConfigValue, CareerVividConfig } from "../config.js";
import { printError, printSuccess } from "../output.js";

// Keys the user is allowed to inspect or modify.
// "geminiKey" is intentionally excluded — it is CareerVivid's internal
// infrastructure credential and must never be surfaced to users.
const VALID_KEYS: (keyof CareerVividConfig)[] = [
    "apiKey",
    "apiUrl",
    "targetCompanies",
    "llmProvider",
    "llmModel",
    "llmApiKey",   // ← User's own BYO key (OpenAI, Anthropic, OpenRouter…)
    "llmBaseUrl",
];

// Keys whose values must be displayed masked (never in plaintext)
const SENSITIVE_KEYS = new Set<string>(["apiKey", "llmApiKey"]);

/** Mask a sensitive value: show a short prefix + bullets */
function maskValue(val: string, prefixLen = 8): string {
    return `${val.slice(0, prefixLen)}${"•".repeat(Math.max(0, val.length - prefixLen))}`;
}

export function registerConfigCommand(program: Command): void {
    const config = program
        .command("config")
        .description("View and modify CLI configuration (~/.careervividrc.json)");

    // ── show ──────────────────────────────────────────────────────────────────────
    config
        .command("show")
        .description("Print current configuration")
        .option("--json", "Machine-readable output")
        .action((opts: { json?: boolean }) => {
            const jsonMode = !!opts.json;
            const cfg = loadConfig();

            if (jsonMode) {
                // Strip CareerVivid's internal key — users must never see it
                const { geminiKey: _gk, ...safe } = cfg as any;
                // Mask user-controlled sensitive values
                if (safe.apiKey)    safe.apiKey    = maskValue(safe.apiKey, 10) + "...";
                if (safe.llmApiKey) safe.llmApiKey = maskValue(safe.llmApiKey, 8) + "...";
                console.log(JSON.stringify({ configFile: CONFIG_FILE, config: safe }));
                return;
            }

            console.log();
            console.log(`  ${chalk.bold("Config file:")} ${chalk.dim(CONFIG_FILE)}`);
            console.log();

            if (!cfg.apiKey && !cfg.apiUrl) {
                console.log(`  ${chalk.dim("No configuration set. Run: cv login")}`);
                console.log();
                return;
            }

            const row = (label: string, value: string) =>
                console.log(`  ${chalk.dim(label.padEnd(14))}  ${value}`);

            // CareerVivid API key — user's own auth token
            if (cfg.apiKey) {
                row("apiKey", maskValue(cfg.apiKey, 16));
            }

            // NOTE: geminiKey is CareerVivid's internal key — never displayed

            // BYO LLM configuration (user-provided)
            if (cfg.llmProvider) row("llmProvider", chalk.cyan(cfg.llmProvider));
            if (cfg.llmModel)    row("llmModel",    chalk.cyan(cfg.llmModel));
            if (cfg.llmBaseUrl)  row("llmBaseUrl",  cfg.llmBaseUrl);
            if (cfg.llmApiKey)   row("llmApiKey",   maskValue(cfg.llmApiKey, 8));

            // Other settings
            if (cfg.apiUrl)          row("apiUrl",          cfg.apiUrl);
            if (cfg.targetCompanies) row("targetCompanies", cfg.targetCompanies);

            console.log();

            if (cfg.llmProvider && cfg.llmProvider !== "careervivid") {
                console.log(
                    `  ${chalk.yellow("⚡")} Using BYO API key — ` +
                    chalk.dim("agent turns do not consume CareerVivid credits")
                );
                console.log();
            }
        });

    // ── get ───────────────────────────────────────────────────────────────────────
    config
        .command("get <key>")
        .description(`Get a config value (keys: ${VALID_KEYS.join(", ")})`)
        .option("--json", "Machine-readable output")
        .action((key: string, opts: { json?: boolean }) => {
            const jsonMode = !!opts.json;

            if (!VALID_KEYS.includes(key as keyof CareerVividConfig)) {
                printError(`Unknown key "${key}". Valid keys: ${VALID_KEYS.join(", ")}`, undefined, jsonMode);
                process.exit(1);
            }

            const cfg = loadConfig();
            const value = cfg[key as keyof CareerVividConfig] as string | undefined;

            if (!value) {
                if (jsonMode) {
                    console.log(JSON.stringify({ key, value: null }));
                } else {
                    console.log(`  ${chalk.dim(key)} is not set`);
                }
                return;
            }

            const displayValue = SENSITIVE_KEYS.has(key) ? maskValue(value, 8) : value;

            if (jsonMode) {
                console.log(JSON.stringify({ key, value: displayValue }));
            } else {
                console.log(`  ${chalk.dim(key.padEnd(14))}  ${displayValue}`);
            }
        });

    // ── set ───────────────────────────────────────────────────────────────────────
    config
        .command("set <key> <value>")
        .description(`Set a config value (keys: ${VALID_KEYS.join(", ")})`)
        .option("--json", "Machine-readable output")
        .action((key: string, value: string, opts: { json?: boolean }) => {
            const jsonMode = !!opts.json;

            if (!VALID_KEYS.includes(key as keyof CareerVividConfig)) {
                printError(`Unknown key "${key}". Valid keys: ${VALID_KEYS.join(", ")}`, undefined, jsonMode);
                process.exit(1);
            }

            setConfigValue(key as keyof CareerVividConfig, value);

            printSuccess(
                { key, saved: "true", configFile: CONFIG_FILE },
                jsonMode
            );
        });
}
