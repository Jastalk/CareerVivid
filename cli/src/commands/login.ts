/**
 * cv login — Human-friendly browser-based authentication
 *
 * Opens careervivid.app/cli/auth in the default browser,
 * spins up a temporary localhost server to catch the key redirect,
 * verifies the key, then saves it locally.
 *
 * This mirrors the Vercel/Stripe CLI login flow.
 */

import { createServer } from "http";
import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import boxen from "boxen";
import { saveConfig, loadConfig } from "../config.js";
import { verifyKey, isApiError } from "../api.js";
import { COLORS } from "../branding.js";

const TIMEOUT_MS = 120_000; // 2 minutes

export function registerLoginCommand(program: Command): void {
    program
        .command("login")
        .description("Authenticate via browser — opens careervivid.app/cli/auth")
        .option("--json", "Machine-readable output")
        .action(async (opts: { json?: boolean }) => {
            const jsonMode = !!opts.json;

            // ── Start local callback server ──────────────────────────────────
            let resolveKey: (key: string) => void;
            let rejectKey: (err: Error) => void;

            const keyPromise = new Promise<string>((res, rej) => {
                resolveKey = res;
                rejectKey = rej;
            });

            const server = createServer((req, serverRes) => {
                try {
                    const url = new URL(req.url || "/", `http://localhost`);
                    if (url.pathname !== "/callback") {
                        serverRes.writeHead(404);
                        serverRes.end();
                        return;
                    }

                    const token = url.searchParams.get("token");

                    serverRes.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
                    serverRes.end(`
                        <!DOCTYPE html>
                        <html>
                        <head>
                          <meta charset="utf-8">
                          <title>CareerVivid CLI</title>
                        </head>
                        <body style="font-family:sans-serif;text-align:center;padding:60px;background:#0f172a;color:#e2e8f0;">
                          <h1 style="color:#10b981">Authentication Successful!</h1>
                          <p>You can safely close this tab and return to your terminal.</p>
                          <script>
                            setTimeout(() => { window.close(); }, 2000);
                          </script>
                        </body>
                        </html>
                    `);

                    if (token) {
                        resolveKey(token);
                    } else {
                        rejectKey(new Error("No API token in callback URL. Please try again."));
                    }
                } catch (err: any) {
                    rejectKey(err);
                }
            });

            await new Promise<void>((resolve) => {
                server.listen(0, "0.0.0.0", () => resolve());
            });

            const address = server.address();
            const callbackPort = typeof address === "object" && address ? address.port : 9876;
            const loginUrl = `https://careervivid.app/signin?cli_port=${callbackPort}`;

            if (!jsonMode) {
                console.log();
                console.log(
                    `  ${chalk.bold("CareerVivid Login")}\n` +
                    `  ${chalk.dim("Opening your browser...")} ${chalk.cyan(loginUrl)}\n`
                );
            }

            // Auto-timeout
            const timeout = setTimeout(() => {
                server.close();
                rejectKey(new Error(
                    `Login timed out after ${TIMEOUT_MS / 1000}s. ` +
                    `Run 'cv login' again or use 'cv auth set-key <key>' instead.`
                ));
            }, TIMEOUT_MS);

            // ── Open browser ─────────────────────────────────────────────────
            try {
                const { default: open } = await import("open");
                await open(loginUrl);
            } catch {
                if (!jsonMode) {
                    console.log(
                        `  ${chalk.yellow("⚠")}  Could not open browser automatically.\n` +
                        `  ${chalk.dim("Please open this URL manually:")}\n` +
                        `  ${chalk.cyan(loginUrl)}\n`
                    );
                }
            }

            if (!jsonMode) {
                const spinner = ora("Waiting for authentication...").start();
                try {
                    const apiKey = await keyPromise;
                    clearTimeout(timeout);
                    server.close();
                    spinner.stop();

                    // ── Verify the key ───────────────────────────────────────
                    const spinner2 = ora("Verifying your credentials...").start();
                    const result = await verifyKey(apiKey);
                    spinner2.stop();

                    if (isApiError(result)) {
                        console.error(
                            `\n  ${chalk.red("✖")}  ${chalk.bold.red("Login failed:")} ${result.message}\n`
                        );
                        process.exit(1);
                    }

                    // Save the key while preserving other config
                    const cfg = loadConfig();
                    cfg.apiKey = apiKey;
                    saveConfig(cfg);

                    const adminBadge = result.isAdmin
                        ? ` ${chalk.bgYellow.black(" ADMIN ")}`
                        : "";

                    console.log(
                        boxen(
                            `${chalk.bold.green("✔  Successfully logged in!")}\n\n` +
                            `${chalk.dim("Name:  ")} ${chalk.white(result.name)}${adminBadge}\n` +
                            `${chalk.dim("Email: ")} ${chalk.white(result.email || "—")}\n` +
                            `${chalk.dim("Role:  ")} ${chalk.cyan(result.role)}`,
                            {
                                padding: 1,
                                margin: { top: 1, bottom: 1 },
                                borderStyle: "round",
                                borderColor: COLORS.success,
                            }
                        )
                    );
                } catch (err: any) {
                    clearTimeout(timeout);
                    server.close();
                    spinner.stop();
                    console.error(`\n  ${chalk.red("✖")}  ${chalk.bold.red("Error:")} ${err.message}\n`);
                    process.exit(1);
                }
            } else {
                // JSON mode
                try {
                    const apiKey = await keyPromise;
                    clearTimeout(timeout);
                    server.close();
                    const result = await verifyKey(apiKey);
                    if (isApiError(result)) {
                        console.log(JSON.stringify({ success: false, error: result.message }));
                        process.exit(1);
                    }
                    const cfg = loadConfig();
                    cfg.apiKey = apiKey;
                    saveConfig(cfg);
                    console.log(JSON.stringify({ success: true, ...result }));
                } catch (err: any) {
                    clearTimeout(timeout);
                    server.close();
                    console.log(JSON.stringify({ success: false, error: err.message }));
                    process.exit(1);
                }
            }
        });
}
