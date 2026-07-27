import chalk from "chalk";
import { getApiKey, getGeminiKey, getLlmConfig, type LLMProvider } from "../../config.js";
import { QueryEngine } from "../../agent/QueryEngine.js";
import { CareerVividProxyEngine } from "../../agent/CareerVividProxyEngine.js";
import { Tool } from "../../agent/Tool.js";
import { MODEL_CREDIT_COST } from "./configurator.js";
import { buildSystemPrompt } from "../../agent/instructions.js";

/**
 * Returns the assembled system prompt for the given agent mode.
 * Delegates to the single-source-of-truth in agent/instructions.ts.
 *
 * To update agent behaviour — edit agent/instructions.ts.
 * Nothing else needs to change.
 */
export function getSystemInstruction(options: { jobs?: boolean; resume?: boolean; coding?: boolean }): string {
  return buildSystemPrompt(options);
}

export function buildEngine(
  selectedProvider: LLMProvider,
  selectedModel: string,
  systemInstruction: string,
  tools: Tool[],
  thinkingBudget: number,
  includeThoughts: boolean,
  cvApiKey: string | undefined,
  geminiApiKey: string | undefined,
  project: string | undefined
): QueryEngine | CareerVividProxyEngine | null {
  let engine: QueryEngine | CareerVividProxyEngine | null = null;
  
  if (selectedProvider === "careervivid" && cvApiKey) {
    engine = new CareerVividProxyEngine({
      cvApiKey,
      model: selectedModel,
      systemInstruction,
      tools,
      thinkingBudget,
      includeThoughts,
      maxHistoryLength: 40,
    });
  } else if (selectedProvider === "careervivid" || selectedProvider === "gemini") {
    engine = new QueryEngine({
      apiKey: geminiApiKey || undefined,
      project: project || undefined,
      model: selectedModel,
      systemInstruction,
      tools,
      thinkingBudget,
      includeThoughts,
      maxHistoryLength: 40,
    });
  }
  
  return engine;
}

export function printBanner(
  options: { coding?: boolean; jobs?: boolean; resume?: boolean; pro?: boolean; think?: number },
  selectedProvider: string,
  selectedModel: string,
  _thinkingBudget: number
) {
  console.log(chalk.bold.hex("#6366f1")("\n  CareerVivid Agent"));
  if (selectedProvider === "careervivid") {
    const cost = MODEL_CREDIT_COST[selectedModel] ?? 1;
    console.log(
      chalk.dim(`  Model: ${selectedModel}`) +
      chalk.dim(`  [${cost} credit${cost !== 1 ? "s" : ""}/turn via CareerVivid Cloud]`)
    );
  } else {
    console.log(chalk.dim(`  Provider: ${selectedProvider}  ·  Model: ${selectedModel}  [0 credits]`));
  }
  const modeLabel = options.resume ? "Resume" : options.coding ? "Coding" : "Jobs & Applications";
  console.log(chalk.dim(`  Mode: ${modeLabel}  ·  Type 'exit' to quit  ·  /help for commands.\n`));
}
