/**
 * OpenAIProvider — supports OpenAI, OpenRouter, Kimi, GLM, Qwen, and any
 * OpenAI-compatible API endpoint.
 *
 * Usage modes:
 *   provider=openai          → api.openai.com/v1
 *   provider=openrouter      → openrouter.ai/api/v1
 *   provider=custom + baseUrl → any OpenAI-compatible endpoint
 *
 * Well-known base URLs for Chinese model providers:
 *   Kimi (Moonshot): https://api.moonshot.cn/v1
 *   GLM (Zhipu):     https://open.bigmodel.cn/api/paas/v4
 *   Qwen (Alibaba):  https://dashscope.aliyuncs.com/compatible-mode/v1
 *
 * This adapter translates our internal tool format to OpenAI function calling,
 * and maps responses back to LLMResponse.
 */

import type {
  LLMProvider,
  LLMRequest,
  LLMResponse,
  LLMStreamChunk,
} from "./LLMProvider.js";
import { convertToGenAITool } from "../Tool.js";

export interface OpenAIProviderOptions {
  apiKey: string;
  baseUrl?: string;
  /** Extra headers (e.g. for OpenRouter: HTTP-Referer, X-Title) */
  extraHeaders?: Record<string, string>;
}

export class OpenAIProvider implements LLMProvider {
  private apiKey: string;
  private baseUrl: string;
  private extraHeaders: Record<string, string>;

  constructor(options: OpenAIProviderOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl || "https://api.openai.com/v1").replace(
      /\/$/,
      "",
    );
    this.extraHeaders = options.extraHeaders || {};
  }

  // ── Convert Gemini @google/genai Type enum values to JSON Schema ──────────
  // Gemini uses uppercase strings like "OBJECT", "STRING", "ARRAY".
  // OpenAI-compatible APIs (OpenRouter, OpenAI, etc.) use lowercase JSON Schema.
  private geminiSchemaToJsonSchema(schema: any): any {
    if (!schema || typeof schema !== "object") return schema;

    const TYPE_MAP: Record<string, string> = {
      OBJECT: "object",
      STRING: "string",
      NUMBER: "number",
      INTEGER: "integer",
      BOOLEAN: "boolean",
      ARRAY: "array",
      // Already lowercase passthrough
      object: "object",
      string: "string",
      number: "number",
      integer: "integer",
      boolean: "boolean",
      array: "array",
    };

    const result: any = {};

    if (schema.type) {
      result.type = TYPE_MAP[schema.type] ?? schema.type.toLowerCase();
    }
    if (schema.description) result.description = schema.description;
    if (schema.enum) result.enum = schema.enum;
    if (schema.required) result.required = schema.required;

    if (schema.properties && typeof schema.properties === "object") {
      result.properties = {};
      for (const [key, val] of Object.entries(schema.properties)) {
        result.properties[key] = this.geminiSchemaToJsonSchema(val);
      }
    }

    if (schema.items) {
      result.items = this.geminiSchemaToJsonSchema(schema.items);
    }

    return result;
  }

  // ── convert our Tool[] to OpenAI function definitions ────────────────────
  private toOpenAITools(tools: LLMRequest["tools"]): any[] {
    return tools.map((t) => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: this.geminiSchemaToJsonSchema(t.parameters),
      },
    }));
  }


  // ── convert history (Gemini Content[]) to OpenAI messages[] ──────────────
  private toOpenAIMessages(
    history: LLMRequest["history"],
    userTurn: LLMRequest["userTurn"],
    systemInstruction: string,
  ): any[] {
    const messages: any[] = [{ role: "system", content: systemInstruction }];

    for (const content of history) {
      if (content.role === "user") {
        // Handle function response parts
        const fnParts = (content.parts || []).filter(
          (p: any) => p.functionResponse,
        );
        if (fnParts.length > 0) {
          for (const p of fnParts as any[]) {
            messages.push({
              role: "tool",
              tool_call_id: p.functionResponse.id || p.functionResponse.name,
              content: JSON.stringify(p.functionResponse.response),
            });
          }
        } else {
          const text = (content.parts || [])
            .map((p: any) => p.text || "")
            .join("");
          if (text) messages.push({ role: "user", content: text });
        }
      } else if (content.role === "model") {
        const textParts = (content.parts || []).filter((p: any) => p.text);
        const fnCallParts = (content.parts || []).filter(
          (p: any) => p.functionCall,
        );

        if (fnCallParts.length > 0) {
          messages.push({
            role: "assistant",
            content:
              textParts.map((p: any) => p.text).join("") || null,
            tool_calls: (fnCallParts as any[]).map((p, i) => ({
              id: `call_${i}`,
              type: "function",
              function: {
                name: p.functionCall.name,
                arguments: JSON.stringify(p.functionCall.args || {}),
              },
            })),
          });
        } else {
          const text = textParts.map((p: any) => p.text).join("");
          if (text) messages.push({ role: "assistant", content: text });
        }
      }
    }

    // Add current user turn
    const userText = (userTurn.parts || [])
      .filter((p: any) => p.text)
      .map((p: any) => p.text)
      .join("");
    if (userText) messages.push({ role: "user", content: userText });

    return messages;
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    const { history, userTurn, tools, systemInstruction } = request;

    const messages = this.toOpenAIMessages(history, userTurn, systemInstruction);
    const openAITools = tools.length > 0 ? this.toOpenAITools(tools) : undefined;

    const body: any = {
      model: request.model || "", // fallback to empty if missing
      messages,
      ...(openAITools ? { tools: openAITools, tool_choice: "auto" } : {}),
    };

    // NOTE: model is appended by the agent command when building the body
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        ...this.extraHeaders,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenAI API error ${response.status}: ${text}`);
    }

    const data: any = await response.json();
    const choice = data.choices?.[0];
    const message = choice?.message;

    const text = message?.content || "";
    const rawFnCalls = message?.tool_calls || [];
    const functionCalls = rawFnCalls.map((tc: any) => ({
      id: tc.id,
      name: tc.function.name,
      args: JSON.parse(tc.function.arguments || "{}"),
    }));

    // Convert back to GenAI-like rawParts for history consistency
    const rawParts: any[] = [];
    if (text) rawParts.push({ text });
    for (const fc of functionCalls) {
      rawParts.push({ functionCall: { id: fc.id, name: fc.name, args: fc.args } });
    }

    return {
      text,
      functionCalls,
      rawParts,
      stopReason:
        functionCalls.length > 0
          ? "tool_calls"
          : choice?.finish_reason === "stop"
            ? "stop"
            : "max_tokens",
    };
  }

  async generateStream(
    request: LLMRequest,
    onChunk: (chunk: LLMStreamChunk) => void,
  ): Promise<LLMResponse> {
    const { history, userTurn, tools, systemInstruction } = request;

    const messages = this.toOpenAIMessages(history, userTurn, systemInstruction);
    const openAITools = tools.length > 0 ? this.toOpenAITools(tools) : undefined;

    const body: any = {
      model: request.model || "",
      messages,
      stream: true,
      ...(openAITools ? { tools: openAITools, tool_choice: "auto" } : {}),
    };

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        ...this.extraHeaders,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenAI API error ${response.status}: ${text}`);
    }

    let accText = "";
    const accToolCalls: Map<number, { id: string; name: string; argsRaw: string }> = new Map();

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const raw = line.slice(6).trim();
        if (raw === "[DONE]") {
          onChunk({ done: true });
          break;
        }
        try {
          const event = JSON.parse(raw);
          const delta = event.choices?.[0]?.delta;
          if (!delta) continue;

          if (delta.content) {
            accText += delta.content;
            onChunk({ text: delta.content, done: false });
          }

          if (delta.tool_calls) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index ?? 0;
              const existing = accToolCalls.get(idx) || {
                id: tc.id || `call_${idx}`,
                name: "",
                argsRaw: "",
              };
              if (tc.function?.name) existing.name += tc.function.name;
              if (tc.function?.arguments) existing.argsRaw += tc.function.arguments;
              if (tc.id) existing.id = tc.id;
              accToolCalls.set(idx, existing);
            }
          }
        } catch {
          // ignore parse errors in stream
        }
      }
    }

    const functionCalls = Array.from(accToolCalls.values()).map((tc) => ({
      name: tc.name,
      args: (() => {
        try {
          return JSON.parse(tc.argsRaw || "{}");
        } catch {
          return {};
        }
      })(),
    }));

    const rawParts: any[] = [];
    if (accText) rawParts.push({ text: accText });
    for (const fc of functionCalls) {
      rawParts.push({ functionCall: { name: fc.name, args: fc.args } });
    }

    return {
      text: accText,
      functionCalls,
      rawParts,
      stopReason: functionCalls.length > 0 ? "tool_calls" : "stop",
    };
  }
}

/**
 * Factory: creates an OpenAIProvider pre-configured for the given sub-provider.
 */
export function createOpenAICompatibleProvider(
  subProvider: "openai" | "openrouter" | "kimi" | "glm" | "qwen" | "custom",
  apiKey: string,
  customBaseUrl?: string,
): OpenAIProvider {
  const BASE_URLS: Record<string, string> = {
    openai: "https://api.openai.com/v1",
    openrouter: "https://openrouter.ai/api/v1",
    kimi: "https://api.moonshot.cn/v1",
    glm: "https://open.bigmodel.cn/api/paas/v4",
    qwen: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    custom: customBaseUrl || "https://api.openai.com/v1",
  };

  const extraHeaders: Record<string, string> = {};
  if (subProvider === "openrouter") {
    extraHeaders["HTTP-Referer"] = "https://careervivid.app";
    extraHeaders["X-Title"] = "CareerVivid CLI";
  }

  return new OpenAIProvider({
    apiKey,
    baseUrl: BASE_URLS[subProvider] || customBaseUrl || BASE_URLS.openai,
    extraHeaders,
  });
}
