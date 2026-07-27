/**
 * repl/slashCommands.ts
 *
 * Handles all slash (/) commands typed in the REPL:
 *   /help, /voice, /speak, /models, /model
 *
 * Returns `true` if the command was handled (caller should re-prompt),
 * returns `false` if the input was not a slash command.
 */

import chalk from "chalk";
import pkg from "enquirer";
import { CV_MODELS } from "../configurator.js";
import { CareerVividProxyEngine } from "../../../agent/CareerVividProxyEngine.js";
import {
  isVoiceEnabled, setVoiceEnabled, stopPlayback,
  getLastResponse, speakText,
  getCurrentVoice, setCurrentVoice,
  getCurrentTtsModel, setCurrentTtsModel,
  AVAILABLE_VOICES, AVAILABLE_TTS_MODELS,
} from "../../../lib/tts.js";

const { prompt } = pkg;

// ── /help ─────────────────────────────────────────────────────────────────────

function handleHelp() {
  console.log(chalk.cyan("\n  Slash commands:"));
  console.log(chalk.dim("  /model <name>  — Switch to a different model mid-session"));
  console.log(chalk.dim("  /models        — List all available CareerVivid models"));
  console.log(chalk.dim("  /voice         — Voice / TTS settings (interactive)"));
  console.log(chalk.dim("  /voice on|off  — Quick toggle"));
  console.log(chalk.dim("  /speak         — Read the last agent response aloud"));
  console.log(chalk.dim("  /help          — Show this help message"));
  console.log(chalk.dim("  exit           — End the session"));
  console.log(chalk.cyan("\n  Shell escape (run terminal commands without leaving the agent):"));
  console.log(chalk.dim("  !<command>     — e.g. !ls -la  or  !git status\n"));
  console.log(chalk.cyan("  Paste long content (job descriptions, cover letters):"));
  console.log(chalk.dim("  <<<            — Open multi-line paste mode; press Enter twice when done"));
  console.log(chalk.dim("  <<<your text   — Start with text directly after <<<\n"));
}

// ── /voice (interactive select) ───────────────────────────────────────────────

async function handleVoice(arg: string) {
  // Quick text shortcuts (scriptable / muscle-memory)
  if (arg === "on") {
    setVoiceEnabled(true);
    console.log(chalk.green(`\n  🔊 Voice on  (${getCurrentVoice()} · ${getCurrentTtsModel()})\n`));
    return;
  }
  if (arg === "off") {
    setVoiceEnabled(false);
    stopPlayback();
    console.log(chalk.yellow("\n  🔇 Voice off\n"));
    return;
  }

  // Interactive top-level menu
  const topChoice = await (prompt as any)({
    type: "select",
    name: "action",
    message: `Voice settings  (${chalk.dim(`voice: ${getCurrentVoice()}  model: ${getCurrentTtsModel()}}`)})`,
    choices: [
      { name: "toggle",    message: isVoiceEnabled() ? "🔇 Turn voice off" : "🔊 Turn voice on" },
      { name: "set-voice", message: "🎵 Pick a voice" },
      { name: "set-model", message: "⚙️  Pick a TTS model" },
      { name: "speak",     message: "▶️  Replay last response" },
      { name: "cancel",    message: chalk.dim("Cancel") },
    ],
  });

  if (topChoice.action === "toggle") {
    const newState = !isVoiceEnabled();
    setVoiceEnabled(newState);
    if (!newState) stopPlayback();
    console.log(newState
      ? chalk.green(`\n  🔊 Voice on  (${getCurrentVoice()} · ${getCurrentTtsModel()})\n`)
      : chalk.yellow("\n  🔇 Voice off\n"));

  } else if (topChoice.action === "set-voice") {
    const { voice } = await (prompt as any)({
      type: "select",
      name: "voice",
      message: "Choose a voice:",
      choices: AVAILABLE_VOICES.map((v: string) => ({
        name: v,
        message: v === getCurrentVoice() ? chalk.green(`${v}  ← active`) : v,
      })),
    });
    setCurrentVoice(voice);
    console.log(chalk.green(`\n  🎵 Voice set to ${chalk.bold(voice)}\n`));

  } else if (topChoice.action === "set-model") {
    const MODEL_LABELS: Record<string, string> = {
      "gemini-3.1-flash-tts-preview": "Gemini 3.1 Flash  (latest, fast)",
      "gemini-2.5-flash-preview-tts": "Gemini 2.5 Flash  (previous gen, fast)",
      "gemini-2.5-pro-preview-tts":   "Gemini 2.5 Pro    (previous gen, high quality)",
    };
    const { model } = await (prompt as any)({
      type: "select",
      name: "model",
      message: "Choose a TTS model:",
      choices: AVAILABLE_TTS_MODELS.map((m: string) => ({
        name: m,
        message: m === getCurrentTtsModel()
          ? chalk.green(`${MODEL_LABELS[m] ?? m}  ← active`)
          : (MODEL_LABELS[m] ?? m),
      })),
    });
    setCurrentTtsModel(model);
    console.log(chalk.green(`\n  ⚙️  TTS model set to ${chalk.bold(model)}\n`));

  } else if (topChoice.action === "speak") {
    const last = getLastResponse();
    if (!last) {
      console.log(chalk.dim("\n  Nothing to speak yet.\n"));
    } else {
      speakText(last).catch(() => {});
      console.log(chalk.dim("\n  🔊 Speaking...\n"));
    }
  }
}

// ── /speak ────────────────────────────────────────────────────────────────────

function handleSpeak() {
  const last = getLastResponse();
  if (!last) {
    console.log(chalk.dim("\n  Nothing to speak yet. Ask the agent something first.\n"));
  } else {
    speakText(last).catch(() => {});
    console.log(chalk.dim("\n  🔊 Speaking last response...\n"));
  }
}

// ── /models ───────────────────────────────────────────────────────────────────

function handleModels(currentModel: string) {
  console.log(chalk.cyan("\n  Available CareerVivid models:"));
  for (const m of CV_MODELS) {
    const active = m.value === currentModel ? chalk.green(" ← active") : "";
    console.log(`  ${m.name}${active}`);
  }
  console.log(chalk.dim("\n  Usage: /model gemini-2.5-flash\n"));
}

// ── /model ────────────────────────────────────────────────────────────────────

interface ModelSwitchContext {
  currentModel: string;
  cvApiKey: string | undefined;
  engine: any;
  systemInstruction: string;
  tools: any[];
  options: { think?: number };
}

function handleModel(
  arg: string,
  ctx: ModelSwitchContext
): { newModel: string; newEngine: any } | null {
  if (!arg) {
    console.log(chalk.yellow(`\n  Current model: ${chalk.bold(ctx.currentModel)}`));
    console.log(chalk.dim("  Usage: /model <name>   e.g. /model gemini-3.1-pro-preview"));
    console.log(chalk.dim("  Run /models to see all available options.\n"));
    return null;
  }

  const known = CV_MODELS.find(m => m.value === arg);
  if (!known && !arg.includes("/") && !arg.includes("-")) {
    console.log(chalk.red(`\n  Unknown model: ${arg}`));
    console.log(chalk.dim("  Run /models to see available options.\n"));
    return null;
  }

  let newEngine = ctx.engine;
  if (ctx.cvApiKey && ctx.engine instanceof CareerVividProxyEngine) {
    newEngine = new CareerVividProxyEngine({
      cvApiKey: ctx.cvApiKey,
      model: arg,
      systemInstruction: ctx.systemInstruction,
      tools: ctx.tools,
      thinkingBudget: arg.includes("pro") ? (ctx.options.think ?? 8192) : 0,
      maxHistoryLength: 40,
    });
  }

  const creditInfo = known ? chalk.dim(` (${known.cost} credit/turn)`) : "";
  console.log(chalk.green(`\n  ✔ Switched to ${chalk.bold(arg)}${creditInfo}`));
  console.log(chalk.dim("  Conversation history has been reset.\n"));

  return { newModel: arg, newEngine };
}

// ── Router ────────────────────────────────────────────────────────────────────

export interface SlashCommandResult {
  /** If model was switched, contains the new values */
  modelSwitch?: { newModel: string; newEngine: any };
}

/**
 * Dispatch a slash command. Returns the result or null if not a slash command.
 * Always returns non-null for slash inputs — caller should re-prompt after.
 */
export async function handleSlashCommand(
  input: string,
  currentModel: string,
  modelCtx: Omit<ModelSwitchContext, "currentModel">
): Promise<SlashCommandResult | null> {
  if (!input.startsWith("/")) return null;

  const [cmd, ...rest] = input.slice(1).split(" ");
  const arg = rest.join(" ").trim();

  switch (cmd) {
    case "help":
      handleHelp();
      break;

    case "voice":
      await handleVoice(arg);
      break;

    case "speak":
      handleSpeak();
      break;

    case "models":
      handleModels(currentModel);
      break;

    case "model": {
      const result = handleModel(arg, { ...modelCtx, currentModel });
      if (result) return { modelSwitch: result };
      break;
    }

    default:
      console.log(chalk.yellow(`\n  Unknown command: /${cmd}. Type /help for available commands.\n`));
  }

  return {};
}
