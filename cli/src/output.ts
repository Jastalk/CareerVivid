import chalk from "chalk";
import boxen from "boxen";
import type { ApiError } from "./api.js";
import { COLORS } from "./branding.js";

// ── Output helpers ─────────────────────────────────────────────────────────────

export function printSuccess(
    fields: Record<string, string>,
    jsonMode: boolean
): void {
    if (jsonMode) {
        console.log(JSON.stringify({ success: true, ...fields }));
        return;
    }

    let content = "";
    for (const [label, value] of Object.entries(fields)) {
        content += `${chalk.dim(label.padEnd(12))} ${chalk.cyan(value)}\n`;
    }

    console.log(
        boxen(content.trim(), {
            padding: 1,
            margin: { top: 1, bottom: 1 },
            borderStyle: "round",
            borderColor: COLORS.success,
            title: chalk.bold.green(" ✔ Success "),
            titleAlignment: "left",
        })
    );
}

export function printError(
    message: string,
    fields?: { field: string; message: string }[],
    jsonMode = false
): void {
    if (jsonMode) {
        console.error(JSON.stringify({ success: false, error: message, fields }));
        return;
    }

    console.error();
    console.error(`  ${chalk.red("✖")}  ${chalk.bold.red("Error:")} ${message}`);
    if (fields && fields.length > 0) {
        console.error();
        for (const f of fields) {
            console.error(`     ${chalk.yellow("•")} ${chalk.bold(f.field)}: ${f.message}`);
        }
    }
    console.error();
}

export function printInfo(message: string, jsonMode: boolean): void {
    if (!jsonMode) {
        console.log(`  ${chalk.blue("ℹ")}  ${chalk.dim(message)}`);
    }
}

export function printTable(
    rows: Record<string, string>[],
    jsonMode: boolean
): void {
    if (jsonMode) {
        console.log(JSON.stringify(rows));
        return;
    }
    console.log();
    for (const row of rows) {
        let line = "  ";
        for (const [k, v] of Object.entries(row)) {
            line += `${chalk.dim(k + ":")} ${chalk.white(v)}  `;
        }
        console.log(line);
    }
    console.log();
}

export function handleApiError(err: ApiError, jsonMode: boolean): never {
    printError(err.message, err.fields, jsonMode);
    process.exit(1);
}
