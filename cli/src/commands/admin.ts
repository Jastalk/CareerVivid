/**
 * cv admin — Admin-only commands: log inspection, audit, diagnostics.
 *
 * Usage:
 *   cv admin logs                             Last 100 events across all features
 *   cv admin logs --feature interview          Interview events only
 *   cv admin logs --feature interview --level error  Errors only
 *   cv admin logs --uid <userId>               Events for a specific user
 *   cv admin logs --since 2025-01-01           Events since a date
 *   cv admin logs --limit 50                   Custom limit (max 500)
 *   cv admin logs --json                       Raw JSON output (pipe-friendly)
 *
 * Access: requires `role: "admin"` on the caller's Firestore user document.
 * Feature logs are written by cli/src/lib/logger.ts and stored in Firestore cliLogs.
 */

import { Command } from "commander";
import chalk from "chalk";
import { getApiKey } from "../config.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const CLI_GET_LOGS_URL =
    process.env.CV_FUNCTIONS_URL
        ? `${process.env.CV_FUNCTIONS_URL}/cliGetLogs`
        : "https://us-west1-jastalk-firebase.cloudfunctions.net/cliGetLogs";

// ─── Level styling ────────────────────────────────────────────────────────────

function levelBadge(level: string): string {
    switch (level) {
        case "error": return chalk.bgRed.white.bold(" ERR ");
        case "warn":  return chalk.bgYellow.black.bold(" WRN ");
        case "info":  return chalk.bgBlue.white.bold(" INF ");
        case "debug": return chalk.bgGray.white.bold(" DBG ");
        default:      return chalk.bgGray.white.bold(` ${level.toUpperCase().slice(0, 3)} `);
    }
}

function featureBadge(feature: string): string {
    const colors: Record<string, (s: string) => string> = {
        interview: (s: string) => chalk.hex("#4f46e5").bold(s),
        agent:     (s: string) => chalk.hex("#059669").bold(s),
        resume:    (s: string) => chalk.hex("#d97706").bold(s),
        jobs:      (s: string) => chalk.hex("#dc2626").bold(s),
    };
    const fn = colors[feature] ?? ((s: string) => chalk.gray.bold(s));
    return fn(`[${feature}]`);
}

function dim(s: string): string { return chalk.dim(s); }

// ─── Display helpers ──────────────────────────────────────────────────────────

function formatEvent(e: any, verbose: boolean): void {
    const ts = dim(new Date(e.clientTime ?? e.serverTime ?? 0).toISOString().replace("T", " ").slice(0, 19));
    const badge = levelBadge(e.level ?? "info");
    const feat = featureBadge(e.feature ?? "?");
    const evt = chalk.white(e.event ?? "unknown");
    const sid = e.sessionId ? dim(` sid:${String(e.sessionId).slice(0, 8)}…`) : "";
    const ver = dim(` v${e.cliVersion ?? "?"}`);

    console.log(`  ${ts}  ${badge}  ${feat}  ${evt}${sid}${ver}`);

    if (e.errorMessage) {
        console.log(`          ${chalk.red("↳ " + e.errorMessage)}`);
        if (verbose && e.errorStack) {
            const stack = e.errorStack.split("\n").slice(1, 4).join("\n    ");
            console.log(chalk.red(`    ${stack}`));
        }
    }

    if (verbose && e.metadata && Object.keys(e.metadata).length > 0) {
        const json = JSON.stringify(e.metadata, null, 2)
            .split("\n").map(l => `    ${chalk.dim(l)}`).join("\n");
        console.log(json);
    }
}

function printHeader(filters: {
    feature?: string; level?: string; uid?: string; since?: string; limit: number;
}): void {
    console.log("\n" + chalk.bgHex("#4f46e5").white.bold("  CareerVivid — CLI Logs  "));
    const parts = [
        filters.feature ? chalk.cyan(`feature=${filters.feature}`) : chalk.dim("feature=*"),
        filters.level   ? chalk.yellow(`level=${filters.level}`)   : chalk.dim("level=*"),
        filters.uid     ? chalk.magenta(`uid=${filters.uid.slice(0, 8)}…`) : chalk.dim("uid=*"),
        filters.since   ? chalk.green(`since=${filters.since}`)    : chalk.dim("since=all"),
        chalk.dim(`limit=${filters.limit}`),
    ];
    console.log("  " + parts.join(chalk.dim("  ·  ")));
    console.log(chalk.dim("  " + "─".repeat(78)));
}

function printSummary(events: any[]): void {
    const counts: Record<string, number> = {};
    for (const e of events) counts[e.level ?? "info"] = (counts[e.level ?? "info"] || 0) + 1;
    const parts = Object.entries(counts).map(([l, n]) => `${levelBadge(l)} ${n}`);
    console.log(chalk.dim("\n  " + "─".repeat(78)));
    console.log(`  ${chalk.bold("Total:")} ${events.length} events   ${parts.join("   ")}`);
    const errorCount = counts["error"] ?? 0;
    if (errorCount > 0) {
        console.log(chalk.red.bold(`\n  ⚠  ${errorCount} error${errorCount > 1 ? "s" : ""} found. Run with --level error to filter.`));
    }
    console.log("");
}

// ─── Command registration ──────────────────────────────────────────────────────

export function registerAdminCommand(program: Command): void {
    const admin = program
        .command("admin", { hidden: true })   // hidden from public --help
        .description("Admin-only commands — requires admin role");

    admin
        .command("logs")
        .description("Fetch and inspect CLI event logs")
        .option("-f, --feature <name>", "Filter by feature (interview, agent, resume, jobs, …)")
        .option("-l, --level <level>",  "Filter by level (error, warn, info)")
        .option("--uid <userId>",       "Filter by specific user UID")
        .option("--since <date>",       "Only show logs after this date (ISO format: 2025-01-01)")
        .option("-n, --limit <n>",      "Number of log batches to fetch (default 100, max 500)", "100")
        .option("--verbose",            "Show full metadata and stack traces")
        .option("--json",               "Output raw JSON (pipe-friendly)")
        .addHelpText("after", `
Examples:
  cv admin logs
  cv admin logs --feature interview
  cv admin logs --feature interview --level error
  cv admin logs --level error --limit 50
  cv admin logs --uid abc123def456
  cv admin logs --since 2025-01-01
  cv admin logs --feature interview --json | jq '.[] | select(.level=="error")'
`)
        .action(async (opts: {
            feature?: string;
            level?: string;
            uid?: string;
            since?: string;
            limit: string;
            verbose?: boolean;
            json?: boolean;
        }) => {
            const apiKey = getApiKey();
            if (!apiKey) {
                console.error(chalk.red("\n  Not logged in. Run: cv login\n"));
                process.exit(1);
            }

            const limit = Math.min(Math.max(parseInt(opts.limit, 10) || 100, 1), 500);

            // ── Fetch logs ──────────────────────────────────────────────────
            if (!opts.json) {
                printHeader({ feature: opts.feature, level: opts.level, uid: opts.uid, since: opts.since, limit });
                process.stdout.write(chalk.dim("  Fetching logs…\r"));
            }

            let result: any;
            try {
                const res = await fetch(CLI_GET_LOGS_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        apiKey,
                        feature: opts.feature,
                        level: opts.level,
                        uid: opts.uid,
                        since: opts.since,
                        limit,
                    }),
                });
                result = await res.json() as any;

                if (res.status === 403) {
                    console.error(chalk.red("\n  ✖  Admin access required.\n"));
                    process.exit(1);
                }
                if (!res.ok) {
                    throw new Error(result?.error ?? `HTTP ${res.status}`);
                }
            } catch (err: any) {
                console.error(chalk.red(`\n  Failed to fetch logs: ${err.message}\n`));
                process.exit(1);
            }

            // ── Flatten all events from all batches ─────────────────────────
            const allEvents: any[] = [];
            for (const batch of result.logs ?? []) {
                for (const e of batch.events ?? []) {
                    allEvents.push({ ...e, _batchId: batch.batchId, _receivedAt: batch.receivedAt });
                }
            }

            // ── Output ──────────────────────────────────────────────────────
            if (opts.json) {
                console.log(JSON.stringify(allEvents, null, 2));
                return;
            }

            if (allEvents.length === 0) {
                process.stdout.write("                          \r");
                console.log(chalk.dim("  No log events found with the current filters.\n"));
                return;
            }

            process.stdout.write("                          \r");

            // Sort by clientTime ascending (oldest first for readability)
            allEvents.sort((a, b) => {
                const ta = new Date(a.clientTime || a._receivedAt || 0).getTime();
                const tb = new Date(b.clientTime || b._receivedAt || 0).getTime();
                return ta - tb;
            });

            for (const e of allEvents) {
                formatEvent(e, !!opts.verbose);
            }

            printSummary(allEvents);
        });

    // Future subcommands can be added here:
    // admin.command("sessions") — list interviewSessions
    // admin.command("users")    — user credit audit
    // admin.command("billing")  — billing reconciliation
}
