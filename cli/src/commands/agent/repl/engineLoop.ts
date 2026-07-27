/**
 * repl/engineLoop.ts
 *
 * Runs the AI response loop for both engine types:
 *   - CareerVividProxyEngine  (cv_live_ API key → cloud proxy)
 *   - BYO providers           (OpenAI, Anthropic, OpenRouter, custom)
 *
 * Returns the full accumulated text response for TTS / audit.
 */

import chalk from "chalk";
import ora from "ora";
import { CareerVividProxyEngine } from "../../../agent/CareerVividProxyEngine.js";
import { QueryEngine } from "../../../agent/QueryEngine.js";
import { loadConfig, getProviderKey, type LLMProvider } from "../../../config.js";
import { printCreditStatus } from "../repl.js";
import { onToolCall, onToolResult, ToolHandlerState } from "./toolHandlers.js";

/** Timeout wrapper */
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms / 1000}s. Press Ctrl+C if stuck.`)),
      ms
    );
    p.then(v => { clearTimeout(timer); resolve(v); })
     .catch(e => { clearTimeout(timer); reject(e); });
  });
}

export interface EngineRunOptions {
  engine: QueryEngine | CareerVividProxyEngine | null;
  userInput: string;
  selectedProvider: LLMProvider;
  selectedModel: string;
  currentModel: string;
  byoHistory: any[];
  tools: any[];
  systemInstruction: string;
  verbose: boolean;
  sessionTurns: number;
  apiKey: string | undefined;
  baseUrl: string | undefined;
  handleSigInt: () => void;
  toolState: ToolHandlerState;
  onCreditInfo: (remaining: number | null, limit: number | null) => void;
}

/**
 * Run one full agent turn. Returns the accumulated text response.
 */
export async function runEngineLoop(opts: EngineRunOptions): Promise<string> {
  const {
    engine, userInput, selectedProvider, currentModel, byoHistory, tools,
    systemInstruction, verbose, apiKey, baseUrl, handleSigInt, toolState,
  } = opts;

  let responseAccumulator = "";
  let firstChunk = true;

  const thinkingSpinner = ora({
    text: chalk.dim("Vivid is thinking…"),
    color: "cyan",
    spinner: "dots",
  }).start();

  try {
    const onChunk = (text: string) => {
      if (firstChunk) {
        thinkingSpinner.stop();
        process.stdout.write("\n" + chalk.hex("#6366f1")("✦ "));
        firstChunk = false;
      }
      process.stdout.write(text);
      responseAccumulator += text;
    };

    const onThinking = (thought: string) => {
      if (verbose) {
        console.log(chalk.dim(`\n[thinking] ${thought.substring(0, 200)}...`));
      }
    };

    const onError = (error: Error) => {
      thinkingSpinner.stop();
      if (toolState.currentSpinner) {
        toolState.currentSpinner.fail("Tool error");
        toolState.currentSpinner = null;
      }
      console.log(chalk.red(`\n❌ Error: ${error.message}\n`));
    };

    const onCompacting = () => {
      console.log(chalk.dim("\n📦 Compacting context window...\n"));
    };

    const boundOnToolCall = (name: string, args: any) =>
      onToolCall(name, args, thinkingSpinner, toolState);
    const boundOnToolResult = (name: string, result: any) =>
      onToolResult(name, result, toolState);

    // ── CareerVivid Cloud engine ──────────────────────────────────────────────
    if (engine instanceof CareerVividProxyEngine) {
      await engine.runLoopStreaming(userInput, {
        onChunk,
        onThinking,
        onToolCall: boundOnToolCall,
        onToolResult: boundOnToolResult,
        onCompacting,
        onError,
        onResponse: async (creditInfo: any) => {
          opts.onCreditInfo(creditInfo.creditsRemaining, creditInfo.monthlyLimit);
          printCreditStatus(creditInfo.creditsRemaining, creditInfo.monthlyLimit);
        },
        onCreditLimitReached: (remaining: number) => {
          console.log(
            chalk.red(
              `\n\n⚠️  Credit limit reached (${remaining} remaining).\n` +
              chalk.dim("   Upgrade or top up at ") +
              chalk.underline.blue("careervivid.app/developer"),
            ),
          );
        },
      });

    // ── QueryEngine (direct Gemini) ───────────────────────────────────────────
    } else if (engine instanceof QueryEngine) {
      await (engine as QueryEngine).runLoopStreaming(userInput, {
        onChunk,
        onThinking,
        onToolCall: boundOnToolCall,
        onToolResult: boundOnToolResult,
        onCompacting,
        onError,
      } as any);

    // ── BYO Provider (OpenAI / Anthropic / OpenRouter / custom) ──────────────
    } else {
      const { createOpenAICompatibleProvider } = await import(
        "../../../agent/providers/OpenAIProvider.js"
      );
      const { AnthropicProvider } = await import(
        "../../../agent/providers/AnthropicProvider.js"
      );

      const byoApiKey = apiKey || getProviderKey(selectedProvider) || loadConfig().llmApiKey || "";
      const resolvedBaseUrl = baseUrl || loadConfig().llmBaseUrl;

      let provider: any;
      if (selectedProvider === "anthropic") {
        provider = new AnthropicProvider({ apiKey: byoApiKey });
      } else {
        const sub: "openai" | "openrouter" | "custom" =
          selectedProvider === "openrouter" ? "openrouter" :
          selectedProvider === "custom" ? "custom" : "openai";
        provider = createOpenAICompatibleProvider(sub, byoApiKey, resolvedBaseUrl);
      }

      let userTurn: any = { role: "user", parts: [{ text: userInput }] };
      let round = 0;

      while (round < 10) {
        const result: any = await withTimeout(
          provider.generate({ model: currentModel, history: byoHistory, userTurn, tools, systemInstruction }),
          45_000,
          "LLM generate()"
        );

        if (round === 0) {
          thinkingSpinner.stop();
          process.stdout.write("\n" + chalk.hex("#6366f1")("✦ "));
          firstChunk = false;
        }
        if (result.text) {
          process.stdout.write(result.text);
          responseAccumulator += result.text;
        }

        byoHistory.push(userTurn);
        byoHistory.push({ role: "model", parts: result.rawParts || [{ text: result.text }] });

        if (!result.functionCalls?.length) break;

        const fnResponses: any[] = [];
        for (const fc of result.functionCalls) {
          const allow = await boundOnToolCall(fc.name, fc.args);
          if (!allow) {
            fnResponses.push({
              functionResponse: { id: fc.id, name: fc.name, response: { error: "User denied execution." } },
            });
            continue;
          }

          const tool = tools.find((t: any) => t.name === fc.name);
          let out: any;
          try {
            if (fc.name === "start_interview") {
              process.removeListener("SIGINT", handleSigInt);
              try {
                out = tool ? await tool.execute(fc.args, currentModel) : { error: "Tool not found" };
              } finally {
                process.on("SIGINT", handleSigInt);
              }
            } else {
              out = tool
                ? await withTimeout(tool.execute(fc.args, currentModel), 45_000, `tool:${fc.name}`)
                : { error: "Tool not found" };
            }
          } catch (e: any) {
            out = e.message?.includes("No API key configured")
              ? { error: "CareerVivid API key not found. Run 'cv login' to authenticate." }
              : { error: e.message };
          }

          boundOnToolResult(fc.name, out);
          fnResponses.push({ functionResponse: { id: fc.id, name: fc.name, response: out } });
        }

        userTurn = { role: "user", parts: fnResponses };
        round++;
      }
    }

    process.stdout.write("\n" + chalk.dim("─".repeat(48)) + "\n");
    return responseAccumulator;
  } finally {
    thinkingSpinner.stop();
  }
}
