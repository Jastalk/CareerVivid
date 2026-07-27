/**
 * CareerVividProxyEngine
 *
 * A drop-in replacement for QueryEngine that routes all Gemini API calls
 * through the CareerVivid `agentProxy` Firebase function instead of calling
 * Gemini directly. This allows users without a personal Gemini key to use
 * the AI agent via their CareerVivid account credits.
 *
 * The proxy handles:
 *  - Authentication (via cv_live_... API key)
 *  - Credit deduction (atomically with each Gemini call)
 *  - Gemini API call (server-side, using the CareerVivid Gemini secret)
 *
 * The engine handles:
 *  - History management
 *  - Tool execution (locally, in the CLI)
 *  - Agentic loop (multi-turn tool calls)
 *  - Context compaction
 */

import type { Content, Part } from "@google/genai";
import { Tool, convertToGenAITool } from "./Tool.js";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const FIREBASE_REGION = "us-west1";
const FIREBASE_PROJECT_ID = "jastalk-firebase";
const PROXY_URL = `https://${FIREBASE_REGION}-${FIREBASE_PROJECT_ID}.cloudfunctions.net/agentProxy`;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ProxyEngineOptions {
  cvApiKey: string;
  model?: string;
  systemInstruction?: string;
  tools?: Tool[];
  thinkingBudget?: number;
  includeThoughts?: boolean;
  maxHistoryLength?: number;
}

export interface ProxyIterationHook {
  onStart?: () => void;
  onResponse?: (creditInfo: {
    creditsUsed: number;
    creditsRemaining: number;
    monthlyLimit: number;
  }) => void | Promise<void>;
  onToolCall?: (toolName: string, args: any) => Promise<boolean | void>;
  onToolResult?: (toolName: string, result: any) => void;
  onError?: (error: Error) => void;
  onChunk?: (text: string) => void;
  onThinking?: (thought: string) => void;
  onCompacting?: () => void;
  /** Fired when credit limit is reached — engine will stop the loop */
  onCreditLimitReached?: (remaining: number) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Retry utility
// ─────────────────────────────────────────────────────────────────────────────

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 1000
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e: any) {
      const isRetryable =
        e?.status === 429 ||
        e?.status === 503 ||
        /rate.?limit|quota|too.?many.?requests|service.?unavailable/i.test(
          e?.message || ""
        );
      if (attempt === maxRetries || !isRetryable) throw e;
      await sleep(baseDelayMs * Math.pow(2, attempt));
    }
  }
  throw new Error("retryWithBackoff: unreachable");
}

// ─────────────────────────────────────────────────────────────────────────────
// CareerVividProxyEngine
// ─────────────────────────────────────────────────────────────────────────────

export class CareerVividProxyEngine {
  private cvApiKey: string;
  private model: string;
  private systemInstruction: string;
  private tools: Tool[];
  private toolMap: Map<string, Tool>;
  private thinkingBudget: number;
  private includeThoughts: boolean;
  private maxHistoryLength: number;
  private history: Content[] = [];

  // Running credit totals for the session
  private sessionCreditsUsed = 0;
  private lastKnownRemaining: number | null = null;
  private monthlyLimit: number | null = null;

  constructor(options: ProxyEngineOptions) {
    this.cvApiKey = options.cvApiKey;
    this.model = options.model ?? "gemini-2.5-flash";
    this.systemInstruction = options.systemInstruction ?? "";
    this.tools = options.tools ?? [];
    this.toolMap = new Map(this.tools.map((t) => [t.name, t]));
    this.thinkingBudget = options.thinkingBudget ?? 0;
    this.includeThoughts = options.includeThoughts ?? false;
    this.maxHistoryLength = options.maxHistoryLength ?? 40;
  }

  public getHistory(): Content[] {
    return this.history;
  }

  public setHistory(history: Content[]) {
    this.history = history;
  }

  /** Credits used in this session */
  get sessionUsed(): number {
    return this.sessionCreditsUsed;
  }

  /** Last known remaining credits */
  get remaining(): number | null {
    return this.lastKnownRemaining;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────────────────────────────────

  private async callProxy(
    contents: Content[]
  ): Promise<{
    candidates?: any[];
    creditsUsed: number;
    creditsRemaining: number;
    monthlyLimit: number;
    error?: string;
    reason?: string;
  }> {
    const genAITools = this.tools.map(convertToGenAITool);

    const body: Record<string, any> = {
      apiKey: this.cvApiKey,
      model: this.model,
      contents,
      systemInstruction: this.systemInstruction || undefined,
    };

    if (genAITools.length > 0) {
      // @google/generative-ai format: { functionDeclarations: [...] }
      body.tools = [{ functionDeclarations: genAITools.flatMap((t: any) => t.functionDeclarations ?? [t]) }];
    }

    if (this.thinkingBudget > 0) {
      body.thinkingBudget = this.thinkingBudget;
      body.includeThoughts = this.includeThoughts;
    }

    const response = await fetch(PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (response.status === 402) {
      const data = await response.json();
      return {
        creditsUsed: 0,
        creditsRemaining: data.creditsRemaining ?? 0,
        monthlyLimit: data.monthlyLimit ?? 100,
        reason: "limit_reached",
      };
    }

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || `Proxy error: HTTP ${response.status}`);
    }

    return response.json();
  }

  private async compactHistory(): Promise<void> {
    // Simple compaction: keep the last 20 turns
    if (this.history.length > this.maxHistoryLength) {
      const summary: Content = {
        role: "user",
        parts: [
          {
            text: `[Context compacted — ${this.history.length} prior turns summarized to save context space. Continue the conversation normally.]`,
          },
        ],
      };
      this.history = [summary, ...this.history.slice(-20)];
    }
  }

  private async executeToolCalls(
    functionCalls: Array<{ name?: string; args?: any }>,
    hooks?: ProxyIterationHook
  ): Promise<Part[]> {
    const functionResponses: Part[] = [];

    for (const call of functionCalls) {
      const toolName = call.name || "";
      const args = call.args || {};
      const tool = this.toolMap.get(toolName);

      if (!tool) {
        functionResponses.push({
          functionResponse: {
            name: toolName,
            response: {
              error: `Tool "${toolName}" not found. Available: ${[...this.toolMap.keys()].join(", ")}`,
            },
          },
        });
        continue;
      }

      if (hooks?.onToolCall) {
        const allow = await hooks.onToolCall(toolName, args);
        if (allow === false) {
          functionResponses.push({
            functionResponse: {
              name: toolName,
              response: { error: "User denied tool execution." },
            },
          });
          continue;
        }
      }

      try {
        const result = await tool.execute(args);
        if (hooks?.onToolResult) hooks.onToolResult(toolName, result);
        functionResponses.push({
          functionResponse: { name: toolName, response: { result } },
        });
      } catch (err: any) {
        functionResponses.push({
          functionResponse: {
            name: toolName,
            response: { error: String(err.message || err) },
          },
        });
      }
    }

    return functionResponses;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Public: runLoopStreaming (interface-compatible with QueryEngine)
  // Note: The proxy does not stream — text is printed all at once after each
  // proxy call. True streaming requires a different proxy endpoint.
  // ─────────────────────────────────────────────────────────────────────────

  public async runLoopStreaming(
    prompt: string,
    hooks?: ProxyIterationHook
  ): Promise<string> {
    return this.runLoop(prompt, hooks);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Public: runLoop
  // ─────────────────────────────────────────────────────────────────────────

  public async runLoop(
    prompt: string,
    hooks?: ProxyIterationHook
  ): Promise<string> {
    this.history.push({ role: "user", parts: [{ text: prompt }] });

    let maxIterations = 30;
    let iterations = 0;
    let finalAnswer = "";

    while (iterations < maxIterations) {
      iterations++;
      if (hooks?.onStart) hooks.onStart();

      // Compact if needed
      if (this.history.length > this.maxHistoryLength) {
        if (hooks?.onCompacting) hooks.onCompacting();
        await this.compactHistory();
      }

      try {
        const proxyResult = await retryWithBackoff(() =>
          this.callProxy(this.history)
        );

        // Credit limit reached
        if (proxyResult.reason === "limit_reached") {
          this.lastKnownRemaining = proxyResult.creditsRemaining;
          if (hooks?.onCreditLimitReached) {
            hooks.onCreditLimitReached(proxyResult.creditsRemaining);
          }
          finalAnswer = "❌ Credit limit reached. Please upgrade or top up at careervivid.app/developer";
          break;
        }

        // Update credit tracking
        this.sessionCreditsUsed += proxyResult.creditsUsed ?? 0;
        this.lastKnownRemaining = proxyResult.creditsRemaining;
        this.monthlyLimit = proxyResult.monthlyLimit;

        if (hooks?.onResponse) {
          await hooks.onResponse({
            creditsUsed: proxyResult.creditsUsed,
            creditsRemaining: proxyResult.creditsRemaining,
            monthlyLimit: proxyResult.monthlyLimit,
          });
        }

        // Parse Gemini response
        const candidate = proxyResult.candidates?.[0];
        if (!candidate) {
          finalAnswer = "No response from Gemini.";
          break;
        }

        const parts: Part[] = candidate.content?.parts ?? [];

        // Add model response to history
        this.history.push({
          role: "model",
          parts: parts.length > 0 ? parts : [{ text: "" }],
        });

        // Extract thinking text
        if (this.includeThoughts && hooks?.onThinking) {
          const thoughtParts = parts.filter((p: any) => p.thought);
          for (const part of thoughtParts) {
            if ((part as any).text) hooks.onThinking((part as any).text);
          }
        }

        // Extract function calls
        const functionCalls: Array<{ name: string; args: any }> = parts
          .filter((p: any) => p.functionCall)
          .map((p: any) => ({
            name: p.functionCall.name,
            args: p.functionCall.args ?? {},
          }));

        if (functionCalls.length > 0) {
          // Tool call turn — execute tools and loop
          const functionResponses = await this.executeToolCalls(
            functionCalls,
            hooks
          );
          this.history.push({ role: "user", parts: functionResponses });
          continue;
        }

        // Text response — emit chunks and break
        const textParts = parts
          .filter((p: any) => p.text && !p.thought)
          .map((p: any) => p.text as string);
        const fullText = textParts.join("");

        // [Harness Engineering] Prevent lazy conversational exits for Jobs Agent
        if (this.systemInstruction && this.systemInstruction.includes("DO NOT ASK FOR PERMISSION")) {
          const textOut = fullText;
          const lowerText = textOut.toLowerCase();
          const askingPermission = lowerText.includes("would you like me to") || 
                                   lowerText.includes("how would you like to proceed") || 
                                   lowerText.includes("should i go ahead") ||
                                   lowerText.includes("shall i") ||
                                   lowerText.includes("could you please provide") ||
                                   lowerText.includes("i need your permission") ||
                                   lowerText.includes("please provide") ||
                                   lowerText.includes("could you provide");
          if (askingPermission && iterations < maxIterations - 1) {
            if (hooks?.onThinking) hooks.onThinking("Harness intercepted permission seeking. Auto-correcting...");
            this.history.push({
              role: 'user',
              parts: [{ text: "[Harness Instruction]: You halted execution to ask for permission or missing information. RE-READ YOUR HARNESS DIRECTIVES. You must autonomously execute the mutation (e.g., tracker_update_job or tracker_add_job) using defaults for missing fields. Do not wait for confirmation. Do it now." }]
            });
            continue;
          }
        }

        // Emit as a "chunk" so the caller's onChunk handler can print it
        if (hooks?.onChunk && fullText) {
          hooks.onChunk(fullText);
        }

        finalAnswer = fullText;
        break;
      } catch (e: any) {
        if (hooks?.onError) hooks.onError(e);
        finalAnswer = `Generation Error: ${e.message}`;
        break;
      }
    }

    if (iterations >= maxIterations) {
      finalAnswer =
        finalAnswer ||
        "Max iterations (30) exceeded without a final answer.";
    }

    return finalAnswer;
  }
}
