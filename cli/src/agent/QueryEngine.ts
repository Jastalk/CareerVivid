import { GoogleGenAI, GenerateContentResponse, Content, Part } from '@google/genai';
import { Tool, convertToGenAITool } from './Tool.js';
import { compactHistory } from './contextCompaction.js';
import { buildSystemPrompt } from './instructions.js';

// ---------------------------------------------------------------------------
// Re-export system prompts from the single source of truth (instructions.ts)
// These exports exist for backward compatibility only — prefer buildSystemPrompt().
// ---------------------------------------------------------------------------

/** @deprecated Use buildSystemPrompt({ coding: true }) from agent/instructions.ts */
export const CODING_AGENT_SYSTEM_PROMPT = buildSystemPrompt({ coding: true });
/** @deprecated Use buildSystemPrompt({ jobs: true }) from agent/instructions.ts */
export const JOBS_SYSTEM_PROMPT = buildSystemPrompt({ jobs: true });




// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QueryEngineOptions {
  model?: string;
  systemInstruction?: string;
  tools?: Tool[];
  apiKey?: string;
  /** GCP project ID for Vertex AI mode (uses gcloud ADC, no API key needed). */
  project?: string;
  /** GCP region for Vertex AI. Default: us-central1 */
  location?: string;
  /** Max thinking tokens for Gemini 2.5+. Set to 0 to disable. Default: 8192 */
  thinkingBudget?: number;
  /** Show raw thinking text in onThinking hook. Default: false */
  includeThoughts?: boolean;
  /** Auto-compact history when it exceeds this many turns. Default: 40 */
  maxHistoryLength?: number;
}

export interface IterationHook {
  onStart?: () => void;
  /** Called after each Gemini API round-trip (streaming or non-streaming). May be async. */
  onResponse?: (response?: GenerateContentResponse) => void | Promise<void>;
  onToolCall?: (toolName: string, args: any) => Promise<boolean | void>;
  onToolResult?: (toolName: string, result: any) => void;
  onError?: (error: Error) => void;
  /** Fired for each text chunk in streaming mode */
  onChunk?: (text: string) => void;
  /** Fired when thinking tokens arrive (if includeThoughts is enabled) */
  onThinking?: (thought: string) => void;
  /** Fired when the context is being compacted */
  onCompacting?: () => void;
}

// ---------------------------------------------------------------------------
// Retry utility
// ---------------------------------------------------------------------------

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

function isRetryableError(e: any): boolean {
  // Google GenAI errors often have a status field
  if (e?.status && RETRYABLE_STATUS_CODES.has(e.status)) return true;
  if (e?.message && /rate.?limit|quota|too.?many.?requests|service.?unavailable|429/i.test(e.message)) return true;
  return false;
}

/** Parse the retryDelay (in seconds) from a Gemini 429 error message or details array. */
function extractRetryDelayMs(e: any): number | null {
  // Try structured errorDetails array first (e.g. RetryInfo proto)
  if (Array.isArray(e?.errorDetails)) {
    for (const detail of e.errorDetails) {
      const delay = detail?.retryDelay;
      if (delay) {
        // "16s" or "16.44s" → milliseconds
        const secs = parseFloat(String(delay).replace('s', ''));
        if (!isNaN(secs)) return Math.ceil(secs * 1000);
      }
    }
  }
  // Fallback: parse from error message string ("Please retry in 16.44s")
  if (e?.message) {
    const match = e.message.match(/retry\s*in\s*([\d.]+)\s*s/i);
    if (match) {
      const secs = parseFloat(match[1]);
      if (!isNaN(secs)) return Math.ceil(secs * 1000);
    }
  }
  return null;
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 5,
  baseDelayMs = 5000,
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e: any) {
      if (attempt === maxRetries || !isRetryableError(e)) throw e;
      // Honour the server-requested retry delay if present, use exponential backoff as floor
      const serverDelayMs = extractRetryDelayMs(e);
      const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
      const delayMs = Math.max(serverDelayMs ?? 0, exponentialDelay);
      // Add ±10% jitter to avoid thundering-herd on shared quota
      const jitter = delayMs * 0.1 * (Math.random() * 2 - 1);
      const finalDelay = Math.ceil(delayMs + jitter);
      console.error(`\n⏳  Rate limited (attempt ${attempt + 1}/${maxRetries}). Retrying in ${(finalDelay / 1000).toFixed(1)}s…`);
      await sleep(finalDelay);
    }
  }
  // TypeScript requires this even though it's unreachable
  throw new Error('retryWithBackoff: unreachable');
}

// ---------------------------------------------------------------------------
// QueryEngine
// ---------------------------------------------------------------------------

/**
 * The unified QueryEngine executing an autonomous REPL-like agentic loop
 * using @google/genai. Supports streaming, thinking mode, automatic context
 * compaction, and exponential-backoff retry.
 */
export class QueryEngine {
  private ai: GoogleGenAI;
  private history: Content[] = [];
  private model: string;
  private systemInstruction: string;
  private tools: Tool[];
  private toolMap: Map<string, Tool>;
  private thinkingBudget: number;
  private includeThoughts: boolean;
  private maxHistoryLength: number;

  constructor(options: QueryEngineOptions = {}) {
    const apiKey = options.apiKey;
    const project = options.project ?? process.env.GOOGLE_CLOUD_PROJECT ?? process.env.GCLOUD_PROJECT;
    const location = options.location ?? process.env.GOOGLE_CLOUD_LOCATION ?? 'us-central1';
    const useVertexAI = !apiKey && !!project;

    if (useVertexAI) {
      // Vertex AI mode — uses gcloud Application Default Credentials
      this.ai = new GoogleGenAI({ vertexai: true, project, location });
      // Vertex AI uses a different model namespace
      this.model = options.model || 'gemini-1.5-flash';
    } else {
      // Gemini API mode — requires an API key
      this.ai = new GoogleGenAI({ apiKey: apiKey || '' });
      this.model = options.model || 'gemini-1.5-flash';
    }

    this.systemInstruction = options.systemInstruction || CODING_AGENT_SYSTEM_PROMPT;
    this.tools = options.tools || [];
    this.toolMap = new Map(this.tools.map(t => [t.name, t]));
    this.thinkingBudget = options.thinkingBudget ?? 8192;
    this.includeThoughts = options.includeThoughts ?? false;
    this.maxHistoryLength = options.maxHistoryLength ?? 40;
  }

  public getHistory(): Content[] {
    return this.history;
  }

  public setHistory(history: Content[]) {
    this.history = history;
  }

  /** Add API keys / tools after construction */
  public addTools(tools: Tool[]) {
    for (const t of tools) {
      this.tools.push(t);
      this.toolMap.set(t.name, t);
    }
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private buildGenerateConfig(genAITools: any[]) {
    const config: Record<string, any> = {
      systemInstruction: this.systemInstruction,
    };
    if (genAITools.length > 0) config.tools = genAITools;
    if (this.thinkingBudget > 0) {
      config.thinkingConfig = {
        thinkingBudget: this.thinkingBudget,
        includeThoughts: this.includeThoughts,
      };
    }
    return config;
  }

  private async maybeCompact(hooks?: IterationHook): Promise<void> {
    if (this.history.length > this.maxHistoryLength) {
      if (hooks?.onCompacting) hooks.onCompacting();
      this.history = await compactHistory(this.ai, this.history, this.model);
    }
  }

  private async executeToolCalls(
    functionCalls: Array<{ name?: string; args?: any }>,
    hooks?: IterationHook,
  ): Promise<Part[]> {
    const functionResponses: Part[] = [];

    for (const call of functionCalls) {
      const toolName = call.name || '';
      const args = call.args || {};
      const tool = this.toolMap.get(toolName);

      if (!tool) {
        functionResponses.push({
          functionResponse: {
            name: toolName,
            response: { error: `Tool "${toolName}" not found. Available tools: ${[...this.toolMap.keys()].join(', ')}` },
          },
        });
        continue;
      }

      // Confirmation gate
      if (hooks?.onToolCall) {
        const allow = await hooks.onToolCall(toolName, args);
        if (allow === false) {
          functionResponses.push({
            functionResponse: {
              name: toolName,
              response: { error: 'User denied tool execution.' },
            },
          });
          continue;
        }
      }

      try {
        const result = await tool.execute(args);
        if (hooks?.onToolResult) hooks.onToolResult(toolName, result);
        functionResponses.push({
          functionResponse: {
            name: toolName,
            response: { result },
          },
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

  // -------------------------------------------------------------------------
  // Non-streaming loop
  // -------------------------------------------------------------------------

  public async runLoop(prompt: string, hooks?: IterationHook): Promise<string> {
    this.history.push({ role: 'user', parts: [{ text: prompt }] });

    const genAITools = this.tools.map(convertToGenAITool);
    const config = this.buildGenerateConfig(genAITools);

    let maxIterations = 30;
    let iterations = 0;
    let finalAnswer = '';

    while (iterations < maxIterations) {
      iterations++;
      if (hooks?.onStart) hooks.onStart();

      // Auto-compact before hitting the API
      await this.maybeCompact(hooks);

      try {
        const response = await retryWithBackoff(() =>
          this.ai.models.generateContent({
            model: this.model,
            contents: this.history,
            config: config as any,
          }),
        );

        if (hooks?.onResponse) await hooks.onResponse(response);

        // Capture thinking text if included
        if (this.includeThoughts && hooks?.onThinking) {
          const thoughtParts = response.candidates?.[0]?.content?.parts?.filter(
            (p: any) => p.thought,
          );
          for (const part of thoughtParts || []) {
            if (part.text) hooks.onThinking(part.text);
          }
        }

        // Separate tool calls from text parts
        const functionCalls = response.functionCalls;
        const hasToolCalls = functionCalls && functionCalls.length > 0;

        // Add model response to history.
        // CRITICAL: Preserve original parts (including thought_signature) from the API
        // response when there are tool calls. Reconstructing parts drops thought_signature
        // which causes a 400 INVALID_ARGUMENT error on subsequent turns.
        const modelParts = response.candidates?.[0]?.content?.parts;
        this.history.push({
          role: 'model',
          parts: modelParts && modelParts.length > 0
            ? modelParts
            : [{ text: response.text || '' }],
        });

        if (!hasToolCalls) {
          const textOut = response.text || '';
          // [Harness Engineering] Prevent lazy conversational exits for Jobs Agent
          if (this.systemInstruction.includes("DO NOT ASK FOR PERMISSION")) {
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
          finalAnswer = textOut;
          break;
        }

        const functionResponses = await this.executeToolCalls(functionCalls, hooks);

        this.history.push({ role: 'user', parts: functionResponses });
      } catch (e: any) {
        if (hooks?.onError) hooks.onError(e);
        finalAnswer = `Generation Error: ${e.message}`;
        break;
      }
    }

    if (iterations >= maxIterations) {
      finalAnswer = finalAnswer || 'Max iterations (30) exceeded without a final answer.';
    }

    return finalAnswer;
  }

  // -------------------------------------------------------------------------
  // Streaming loop
  // -------------------------------------------------------------------------

  /**
   * Like runLoop() but streams text chunks via hooks.onChunk().
   * Tool-call iterations are still non-streaming (we need the full response
   * to extract functionCalls reliably).
   */
  public async runLoopStreaming(prompt: string, hooks?: IterationHook): Promise<string> {
    this.history.push({ role: 'user', parts: [{ text: prompt }] });

    const genAITools = this.tools.map(convertToGenAITool);
    const config = this.buildGenerateConfig(genAITools);

    let maxIterations = 30;
    let iterations = 0;
    let finalAnswer = '';

    while (iterations < maxIterations) {
      iterations++;
      if (hooks?.onStart) hooks.onStart();

      await this.maybeCompact(hooks);

      try {
        // Use streaming for final text responses; non-streaming for tool call turns
        const streamResponse = await retryWithBackoff(() =>
          this.ai.models.generateContentStream({
            model: this.model,
            contents: this.history,
            config: config as any,
          }),
        );

        let accumulatedText = '';
        let accumulatedFunctionCalls: any[] = [];
        // Collect raw parts across all chunks so thought_signature is preserved
        let accumulatedRawParts: any[] = [];

        for await (const chunk of streamResponse) {
          // Manually extract text to avoid the SDK's "there are non-text parts" warning
          let chunkText = '';
          const parts = chunk.candidates?.[0]?.content?.parts || [];
          if (parts.length > 0) {
            // Accumulate raw parts for history (preserves thought_signature)
            accumulatedRawParts.push(...parts);
            chunkText = parts
              .filter((p: any) => p.text && !p.functionCall && !p.thought)
              .map((p: any) => p.text)
              .join('');
          } else if (chunk.text && !chunk.text.includes('there are non-text parts')) {
            chunkText = chunk.text;
          }

          if (chunkText) {
            accumulatedText += chunkText;
            if (hooks?.onChunk) hooks.onChunk(chunkText);
          }

          // Accumulate function calls
          if (chunk.functionCalls) {
            accumulatedFunctionCalls.push(...chunk.functionCalls);
          }
        }

        const hasToolCalls = accumulatedFunctionCalls.length > 0;

        // Add model turn to history.
        // CRITICAL: For the streaming case we need to reconstruct parts carefully.
        // Accumulate raw parts (including thought parts with thought_signature) so we
        // can store them verbatim and satisfy the API's thought_signature requirement.
        this.history.push({
          role: 'model',
          parts: hasToolCalls
            ? accumulatedRawParts.length > 0
              ? accumulatedRawParts
              : accumulatedFunctionCalls.map(fc => ({ functionCall: { name: fc.name, args: fc.args } }))
            : [{ text: accumulatedText }],
        });

        // Fire onResponse after each streaming round-trip (for credit deduction etc.)
        if (hooks?.onResponse) await hooks.onResponse(undefined);

        if (!hasToolCalls) {
          const textOut = accumulatedText;
          // [Harness Engineering] Prevent lazy conversational exits for Jobs Agent
          if (this.systemInstruction.includes("DO NOT ASK FOR PERMISSION")) {
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
          finalAnswer = textOut;
          break;
        }

        const functionResponses = await this.executeToolCalls(accumulatedFunctionCalls, hooks);
        this.history.push({ role: 'user', parts: functionResponses });
      } catch (e: any) {
        if (hooks?.onError) hooks.onError(e);
        finalAnswer = `Generation Error: ${e.message}`;
        break;
      }
    }

    if (iterations >= maxIterations) {
      finalAnswer = finalAnswer || 'Max iterations (30) exceeded without a final answer.';
    }

    return finalAnswer;
  }
}
