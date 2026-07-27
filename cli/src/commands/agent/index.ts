import { Command } from "commander";
import chalk from "chalk";
import pkg from "enquirer";
import { getApiKey, getLlmConfig, getGeminiKey, loadConfig, setConfigValue, type LLMProvider } from "../../config.js";
import { CV_MODELS, BYO_MODELS, runAgentConfig, promptForAgentModel } from "./configurator.js";
import { getTools } from "./toolRegistry.js";
import { getSystemInstruction, buildEngine, printBanner } from "./engineResolver.js";
import { askLoop } from "./repl.js";
import { initSessionContext } from "../../agent/agentAuditLog.js";
import { resolvePersona } from "./personas.js";


const { prompt } = pkg;

export function registerAgentCommand(program: Command) {
  const agentCmd = program
    .command("agent")
    .description("Start an interactive autonomous AI agent in your terminal.")
    .option("--coding", "Enable full coding tool suite (file I/O, shell, search).")
    .option("--prompt <prompt>", "Execute a single prompt/task directly.")
    .option("--once", "Exit immediately after executing the first agent turn.")
    .option("--no-menu", "Bypass the interactive selection menu.")
    .option("--resume", "Add resume tools — load and discuss your CareerVivid resume.")
    .option("--jobs", "Add job-hunting tools (default — enabled automatically).")
    .option("--flash", "Use gemini-2.5-flash (fast, 1 credit/turn).")
    .option("--pro", "Use gemini-2.5-pro (recommended for complex tasks).")
    .option(
      "--think <budget>",
      "Enable Gemini thinking mode with the given token budget (e.g. 8192).",
      parseInt,
    )
    .option("--verbose", "Show thinking tokens in the output (requires --think or --pro).")
    .option("--project <id>", "GCP project ID for Vertex AI mode (uses gcloud ADC, no API key needed).")
    .option("--provider <provider>", "Override LLM provider (careervivid|openai|anthropic|openrouter|gemini|custom).")
    .option("--model <model>", "Override model (e.g. gpt-4o, claude-opus-4-5).")
    .option("--api-key <key>", "BYO API key for this session (not saved).")
    .option("--base-url <url>", "Custom OpenAI-compatible base URL.")
    .action(async (options) => {
      // Jobs mode is the primary entry point — always enabled unless an explicit
      // alternate mode flag (--resume, --coding) was passed.
      if (!options.resume && !options.coding) {
        options.jobs = true;
      }

      const cvApiKey = getApiKey();
      const project = options.project ?? process.env.GOOGLE_CLOUD_PROJECT;
      const wantsCareerVividCloud = !options.provider || options.provider === "careervivid";

      if (wantsCareerVividCloud && !cvApiKey && !project && !options.apiKey) {
        console.log(chalk.red("\n❌ You need a CareerVivid API key to use the agent.\n"));
        console.log(
          "   Run: " + chalk.cyan("cv login") + "  then visit " +
          chalk.underline.blue("careervivid.app/developer") +
          "\n   to generate your free API key.\n",
        );
        console.log(
          chalk.dim("   💡 Or bring your own API key: ") +
          chalk.yellow("cv agent --provider openai --api-key sk-..."),
        );
        process.exit(1);
      }

      const tools = getTools(options);

      const isPro = Boolean(options.pro);
      const isFlash = Boolean(options.flash);
      const llmCfg = getLlmConfig({
        provider: options.provider as LLMProvider | undefined,
        model: options.model,
        apiKey: options["api-key"] || options.apiKey,
        baseUrl: options["base-url"] || options.baseUrl,
      });

      let selectedModel: string;
      let thinkingBudget: number;
      let selectedProvider: LLMProvider;

      if (isPro) {
        selectedModel = "gemini-2.5-pro";
        thinkingBudget = options.think ?? 0;
        selectedProvider = "careervivid";
      } else if (isFlash) {
        selectedModel = "gemini-2.5-flash";
        thinkingBudget = 0;
        selectedProvider = "careervivid";
      } else if (options.provider && options.provider !== "careervivid") {
        // User explicitly passed --provider on the CLI — use it directly, no picker
        selectedProvider = llmCfg.provider;
        selectedModel = llmCfg.model;
        thinkingBudget = 0;
      } else {
        // Always show the picker. Saved config pre-fills BYO model inputs but does
        // not bypass the prompt. This lets the user choose per-session.
        const result = await promptForAgentModel(options);
        selectedProvider = result.selectedProvider;
        selectedModel = result.selectedModel;
        thinkingBudget = result.thinkingBudget;
        if (result.apiKey) {
          options["api-key"] = result.apiKey;
        }
      }

      let geminiApiKey: string | undefined;
      if (selectedProvider === "careervivid") {
        if (!cvApiKey && !project) {
          console.log(chalk.red("\n❌ No credentials found. Please log in first.\n"));
          console.log("   " + chalk.cyan("cv login"));
          process.exit(1);
        }
      } else if (selectedProvider === "gemini") {
        geminiApiKey = options["api-key"] || loadConfig().llmApiKey || getGeminiKey();
        if (!geminiApiKey) {
          console.log(chalk.yellow("\n🔑 Personal Gemini API key required."));
          console.log(chalk.dim("  Get one at: https://aistudio.google.com/app/apikey\n"));
          const k = await prompt<{ key: string }>({ type: "password", name: "key", message: "Gemini API key:" });
          geminiApiKey = k.key.trim();
          setConfigValue("geminiKey", geminiApiKey);
        }
      }

      const includeThoughts = Boolean(options.verbose);
      const systemInstruction = getSystemInstruction(options);

      // ── Inject session LLM config into env so sub-tools (e.g. ApplyToJobTool)
      // always use the provider/model the user selected in this session, not the
      // stale value from ~/.careervividrc.json.
      process.env.CV_SESSION_LLM_PROVIDER = selectedProvider;
      process.env.CV_SESSION_LLM_MODEL    = selectedModel;
      if (options["api-key"]) {
        process.env.CV_SESSION_LLM_APIKEY = options["api-key"];
      } else if (geminiApiKey) {
        process.env.CV_SESSION_LLM_APIKEY = geminiApiKey;
      } else if (cvApiKey) {
        process.env.CV_SESSION_LLM_APIKEY = cvApiKey;
      }
      if (options["base-url"]) {
        process.env.CV_SESSION_LLM_BASE_URL = options["base-url"];
      }

      const engine = buildEngine(
        selectedProvider,
        selectedModel,
        systemInstruction,
        tools,
        thinkingBudget,
        includeThoughts,
        cvApiKey,
        geminiApiKey,
        project
      );

      printBanner(options, selectedProvider, selectedModel, thinkingBudget);

      const agentMode = options.resume ? "resume" : options.coding ? "coding" : "jobs";
      initSessionContext(agentMode, selectedModel);

      // Resolve the active persona — drives menu, pick-up prompt, and context
      const persona = resolvePersona(options);

      await askLoop(engine, options, selectedProvider, selectedModel, cvApiKey, systemInstruction, tools, persona);

    });

  agentCmd.command("config")
    .description("Configure the default LLM provider for cv agent")
    .action(runAgentConfig);
}
