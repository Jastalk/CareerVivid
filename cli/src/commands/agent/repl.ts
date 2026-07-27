/**
 * repl.ts — REPL orchestrator for the CareerVivid agent
 *
 * This file is intentionally thin. Each concern lives in its own module:
 *
 *   repl/input.ts          — User input: first-turn menu, paste buffer, <<<
 *   repl/slashCommands.ts  — /help, /voice, /speak, /models, /model
 *   repl/toolHandlers.ts   — Tool confirmation, spinner, mutation budget, audit
 *   repl/engineLoop.ts     — CareerVivid & BYO provider run loops
 */

import chalk from "chalk";
import pkg from "enquirer";
import { CareerVividProxyEngine } from "../../agent/CareerVividProxyEngine.js";
import { QueryEngine } from "../../agent/QueryEngine.js";
import { type LLMProvider } from "../../config.js";
import { writeSessionSummary } from "../../agent/agentAuditLog.js";
import { runShellEscape } from "../../lib/shell.js";
import { setLastResponse, isVoiceEnabled, speakText } from "../../lib/tts.js";
import type { PersonaDefinition } from "./personas.js";

import { readFirstTurnInput, readMultiLineInput, readNormalInput } from "./repl/input.js";
import { handleSlashCommand } from "./repl/slashCommands.js";
import { createToolHandlerState, TURN_MAX_MUTATIONS } from "./repl/toolHandlers.js";
import { runEngineLoop } from "./repl/engineLoop.js";

const { prompt } = pkg;

// ── Credit status display (also exported for engineLoop.ts) ───────────────────
export function printCreditStatus(remaining: number | null, limit: number | null = null) {
  if (remaining === null) return;
  const pct = limit ? remaining / limit : 1;
  if (remaining === 0) {
    console.log(
      chalk.red(
        "\n⚠️  Credit limit reached (0 remaining).\n" +
        chalk.dim("   Buy more at ") +
        chalk.underline.blue("careervivid.app/developer") +
        chalk.dim(" → \"Top Up Credits\"\n") +
        chalk.dim("   Or use your own API key: ") +
        chalk.yellow("cv agent --provider openai"),
      ),
    );
  } else if (remaining < 10 || pct < 0.05) {
    console.log(chalk.yellow(`\n💳 Credits remaining: ${remaining}  ⚠️  Running low`));
      console.log(
        chalk.dim("   💡 Tip: Switch to gemini-1.5-flash (0.5 cr/turn) to stretch your budget."),
      );
  }
}

// ── 401 error handler ─────────────────────────────────────────────────────────
async function handle401Error(
  selectedProvider: LLMProvider,
  options: { "api-key"?: string }
): Promise<boolean> {
  const LABELS: Record<string, string> = {
    openai: "OpenAI", anthropic: "Anthropic",
    gemini: "Gemini", openrouter: "OpenRouter", custom: "Custom",
  };
  const KEY_URLS: Record<string, string> = {
    openai:    "https://platform.openai.com/api-keys",
    anthropic: "https://console.anthropic.com/settings/keys",
    gemini:    "https://aistudio.google.com/app/apikey",
    openrouter:"https://openrouter.ai/settings/keys",
  };
  const { setProviderKey } = await import("../../config.js");
  const label = LABELS[selectedProvider] ?? selectedProvider;

  console.log();
  console.log(chalk.red(`❌ API key rejected by ${label} (401 Unauthorized).`));
  console.log(chalk.dim("   The saved key may be expired or invalid."));
  if (KEY_URLS[selectedProvider]) {
    console.log(chalk.dim("   Get a new key at: ") + chalk.cyan(KEY_URLS[selectedProvider]));
  }
  console.log();

  try {
    const answer = await (prompt as any)({
      type: "select",
      name: "action",
      message: "What would you like to do?",
      choices: [
        { name: "reset",    message: `🔑 Enter a new ${label} API key` },
        { name: "continue", message: "⏭️  Continue anyway (will keep failing)" },
        { name: "exit",     message: "🚪 Exit the agent" },
      ],
    });
    if (answer.action === "reset") {
      const { key } = await (prompt as any)({
        type: "password",
        name: "key",
        message: `Enter your new ${label} API key:`,
      });
      const newKey = (key ?? "").trim();
      if (newKey) {
        setProviderKey(selectedProvider as LLMProvider, newKey);
        options["api-key"] = newKey;
        console.log(chalk.green(`\n✔ New ${label} key saved. Resuming session...\n`));
      }
    } else if (answer.action === "exit") {
      console.log(chalk.gray("\nGoodbye! 👋\n"));
      process.exit(0);
    }
  } catch {
    // User cancelled — just continue
  }
  return true; // re-prompt
}

// ── Main REPL loop ────────────────────────────────────────────────────────────

export async function askLoop(
  engine: QueryEngine | CareerVividProxyEngine | null,
  options: {
    verbose?: boolean;
    think?: number;
    "base-url"?: string;
    baseUrl?: string;
    "api-key"?: string;
    apiKey?: string;
    jobs?: boolean;
    resume?: boolean;
    coding?: boolean;
    prompt?: string;
    once?: boolean;
    menu?: boolean;
  },
  selectedProvider: LLMProvider,
  selectedModel: string,
  cvApiKey: string | undefined,
  systemInstruction: string,
  tools: any[],
  persona: PersonaDefinition
): Promise<void> {
  let sessionTurns = 0;
  let sessionLimit: number | null = null;
  let currentModel = selectedModel;
  let currentEngine = engine;
  let sessionMutations = 0;

  const toolState = createToolHandlerState();
  const byoHistory: any[] = [];
  let pasteBuffer: string[] = [];

  // ── SIGINT: Ctrl+C cancels current op, second exits ──────────────────────
  let activeAbort: AbortController | null = null;
  const handleSigInt = () => {
    const ab = activeAbort as AbortController | null;
    if (ab !== null && !ab.signal.aborted) {
      ab.abort();
      process.stdout.write("\n" + chalk.yellow("⚡ Interrupted. Press Ctrl+C again or type 'exit' to quit.\n"));
    } else {
      console.log(chalk.gray("\nGoodbye! 👋\n"));
      process.exit(0);
    }
  };
  process.on("SIGINT", handleSigInt);

  const ask = async (isFirstTurn = false): Promise<void> => {
    try {
      let userInput: string;

      // ── Collect user input ──────────────────────────────────────────────
      if (isFirstTurn) {
        if (options.prompt) {
          userInput = options.prompt;
        } else if (options.menu === false) {
          const { text } = await readNormalInput(false);
          userInput = text;
        } else {
          userInput = await readFirstTurnInput(persona);
        }
      } else {
        const { text, isFastLine } = await readNormalInput(pasteBuffer.length > 0);
        userInput = text;

        const cleanLower = userInput.trim().toLowerCase();
        if (cleanLower === "hi" || cleanLower === "hey" || cleanLower === "hello" || cleanLower === "menu" || cleanLower === "start") {
          userInput = await readFirstTurnInput(persona);
        }

        if (userInput.trim() === "<<<" || userInput.trim().toLowerCase().startsWith("<<<")) {
          const prefix = userInput.trim().slice(3).trim();
          userInput = await readMultiLineInput(prefix);
          pasteBuffer = [];
        } else if (isFastLine && !userInput.startsWith("!") && !userInput.startsWith("/")) {
          pasteBuffer.push(userInput);
          return ask();
        } else {
          if (pasteBuffer.length > 0) {
            if (userInput) pasteBuffer.push(userInput);
            userInput = pasteBuffer.join("\n");
            pasteBuffer = [];
          }
        }
      }

      userInput = userInput.trim();
      if (!userInput) return ask();

      // ── Input length guard ─────────────────────────────────────────────
      if (userInput.length > 20_000) {
        console.log(
          chalk.yellow(`\n⚠️  Input is too long (${userInput.length} chars).`) +
          chalk.dim("\n   Use <<< mode for long job descriptions so nothing gets cut off:") +
          chalk.cyan("\n\n   ❯ <<< ") +
          chalk.dim("\n   Then paste the job description, and press Enter twice to submit.\n")
        );
        return ask();
      }

      // ── Subshell escape: !command ──────────────────────────────────────
      if (userInput.startsWith("!")) {
        const shellCmd = userInput.slice(1).trim();
        if (shellCmd) {
          process.stdout.write(chalk.dim(`\n  $ ${shellCmd}\n`));
          await runShellEscape(shellCmd);
        }
        return ask();
      }

      // ── Slash commands ─────────────────────────────────────────────────
      if (userInput.startsWith("/")) {
        const result = await handleSlashCommand(userInput, currentModel, {
          cvApiKey,
          engine: currentEngine,
          systemInstruction,
          tools,
          options,
        });
        if (result?.modelSwitch) {
          currentModel = result.modelSwitch.newModel;
          currentEngine = result.modelSwitch.newEngine;
        }
        return ask();
      }

      // ── Exit ───────────────────────────────────────────────────────────
      if (userInput.toLowerCase() === "exit") {
        const proxyEngine = currentEngine instanceof CareerVividProxyEngine ? currentEngine : null;
        if (proxyEngine && sessionTurns > 0) {
          console.log(chalk.dim("\n─────────────────────────────────────────"));
          console.log(
            chalk.dim(`Session: ${sessionTurns} turn${sessionTurns !== 1 ? "s" : ""} · `) +
            chalk.yellow(`${proxyEngine.sessionUsed.toFixed(1)} credits used`),
          );
          if (proxyEngine.remaining !== null) {
            console.log(chalk.dim(`Remaining: ${proxyEngine.remaining} credits`));
          }
          console.log(chalk.dim("─────────────────────────────────────────"));
        }
        await writeSessionSummary({ turns: sessionTurns, mutations: sessionMutations, toolCalls: 0 });
        console.log(chalk.gray("\nGoodbye! 👋\n"));
        process.exit(0);
      }

      // ── Run the agent turn ─────────────────────────────────────────────
      sessionTurns++;
      toolState.turnMutations = 0; // reset per-turn counter

      process.stdout.write(chalk.dim("\n"));

      const response = await runEngineLoop({
        engine: currentEngine,
        userInput,
        selectedProvider,
        selectedModel,
        currentModel,
        byoHistory,
        tools,
        systemInstruction,
        verbose: Boolean(options.verbose),
        sessionTurns,
        apiKey: options["api-key"] || options.apiKey,
        baseUrl: options["base-url"] || options.baseUrl,
        handleSigInt,
        toolState,
        onCreditInfo: (remaining, limit) => {
          sessionLimit = limit;
        },
      });

      // ── TTS: store + auto-speak ────────────────────────────────────────
      if (response) {
        setLastResponse(response);
        if (isVoiceEnabled()) {
          speakText(response).catch(() => {});
        }
      }

      if (options.once) {
        const proxyEngine = currentEngine instanceof CareerVividProxyEngine ? currentEngine : null;
        if (proxyEngine && sessionTurns > 0) {
          console.log(chalk.dim("\n─────────────────────────────────────────"));
          console.log(
            chalk.dim(`Session: ${sessionTurns} turn${sessionTurns !== 1 ? "s" : ""} · `) +
            chalk.yellow(`${proxyEngine.sessionUsed.toFixed(1)} credits used`),
          );
          if (proxyEngine.remaining !== null) {
            console.log(chalk.dim(`Remaining: ${proxyEngine.remaining} credits`));
          }
          console.log(chalk.dim("─────────────────────────────────────────"));
        }
        await writeSessionSummary({ turns: sessionTurns, mutations: sessionMutations, toolCalls: 0 });
        process.exit(0);
      }

      return ask();

    } catch (err: any) {
      const msg: string = err?.message ?? "";

      if (!msg || msg.includes("cancelled") || msg.includes("User force closed")) {
        console.log(chalk.gray("\nCancelled. Exiting.\n"));
        process.exit(0);
      }

      const is401 =
        msg.includes("401") ||
        msg.toLowerCase().includes("user not found") ||
        msg.toLowerCase().includes("invalid api key") ||
        msg.toLowerCase().includes("unauthorized");

      if (is401 && selectedProvider && selectedProvider !== "careervivid") {
        await handle401Error(selectedProvider, options);
        return ask();
      }

      console.error(chalk.red(`\nAgent encountered an error: ${msg}`));
      return ask();
    }
  };

  return ask(true);
}
