/**
 * LLMProvider — abstract interface for all LLM providers.
 *
 * Providers must implement `generate` (for non-streaming loops)
 * and optionally `generateStream` (for streaming UX).
 *
 * All providers receive the same unified `LLMRequest` and return `LLMResponse`.
 */

import type { Content, Part } from "@google/genai";
import type { Tool } from "../Tool.js";

export interface LLMRequest {
  /** Full conversation history (alternating user/model Content objects) */
  history: Content[];
  /** The new user message (may include function response parts) */
  userTurn: Content;
  /** Available tools for this request */
  tools: Tool[];
  /** System instruction */
  systemInstruction: string;
  /** Thinking budget for models that support it (0 = disabled) */
  thinkingBudget?: number;
  /** Whether to include thinking text */
  includeThoughts?: boolean;
  /** Optional model override for BYO providers */
  model?: string;
}

export interface LLMResponse {
  /** Text response parts from the model */
  text: string;
  /** Function calls the model wants to make */
  functionCalls: Array<{ name: string; args: any }>;
  /** Raw model content parts (needed for history, includes thought_signature) */
  rawParts: Part[];
  /** Stop reason */
  stopReason: "stop" | "tool_calls" | "max_tokens" | "error";
}

export interface LLMStreamChunk {
  text?: string;
  thought?: string;
  functionCalls?: Array<{ name: string; args: any }>;
  rawParts?: Part[];
  done: boolean;
}

export interface LLMProvider {
  /**
   * Single-shot generate: sends the full conversation + new user turn,
   * returns the model's response.
   */
  generate(request: LLMRequest): Promise<LLMResponse>;

  /**
   * Streaming generate: calls onChunk for each streamed token,
   * then resolves with the accumulated LLMResponse.
   */
  generateStream(
    request: LLMRequest,
    onChunk: (chunk: LLMStreamChunk) => void,
  ): Promise<LLMResponse>;
}
