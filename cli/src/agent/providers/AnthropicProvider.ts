/**
 * AnthropicProvider — wraps Claude models via Anthropic's Messages API.
 *
 * Supports Claude Opus 4.5, Sonnet, Haiku, and any future anthropic models.
 * Translates our internal Gemini-style Content history ↔ Anthropic messages.
 *
 * IMPORTANT: Anthropic requires a separate system prompt (not in messages[]),
 * and tool result messages use a special "tool_result" content block format.
 */

import type {
  LLMProvider,
  LLMRequest,
  LLMResponse,
  LLMStreamChunk,
} from "./LLMProvider.js";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_API_VERSION = "2023-06-01";

export interface AnthropicProviderOptions {
  apiKey: string;
}

export class AnthropicProvider implements LLMProvider {
  private apiKey: string;

  constructor(options: AnthropicProviderOptions) {
    this.apiKey = options.apiKey;
  }

  // ── Convert Gemini @google/genai Type enum values to JSON Schema ──────────
  private geminiSchemaToJsonSchema(schema: any): any {
    if (!schema || typeof schema !== "object") return schema;
    const TYPE_MAP: Record<string, string> = {
      OBJECT: "object", STRING: "string", NUMBER: "number",
      INTEGER: "integer", BOOLEAN: "boolean", ARRAY: "array",
      object: "object", string: "string", number: "number",
      integer: "integer", boolean: "boolean", array: "array",
    };
    const result: any = {};
    if (schema.type) result.type = TYPE_MAP[schema.type] ?? schema.type.toLowerCase();
    if (schema.description) result.description = schema.description;
    if (schema.enum) result.enum = schema.enum;
    if (schema.required) result.required = schema.required;
    if (schema.properties && typeof schema.properties === "object") {
      result.properties = {};
      for (const [key, val] of Object.entries(schema.properties)) {
        result.properties[key] = this.geminiSchemaToJsonSchema(val);
      }
    }
    if (schema.items) result.items = this.geminiSchemaToJsonSchema(schema.items);
    return result;
  }

  // ── Convert our Tool[] to Anthropic tool definitions ─────────────────────
  private toAnthropicTools(tools: LLMRequest["tools"]): any[] {
    return tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: this.geminiSchemaToJsonSchema(t.parameters),
    }));
  }


  // ── Convert Gemini Content[] to Anthropic messages[] ─────────────────────
  private toAnthropicMessages(
    history: LLMRequest["history"],
    userTurn: LLMRequest["userTurn"],
  ): any[] {
    const messages: any[] = [];

    for (const content of history) {
      if (content.role === "user") {
        const fnParts = (content.parts || []).filter(
          (p: any) => p.functionResponse,
        );
        if (fnParts.length > 0) {
          messages.push({
            role: "user",
            content: (fnParts as any[]).map((p) => ({
              type: "tool_result",
              tool_use_id: p.functionResponse.id || p.functionResponse.name,
              content: JSON.stringify(p.functionResponse.response),
            })),
          });
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
        const contentBlocks: any[] = [];

        if (textParts.length > 0) {
          contentBlocks.push({
            type: "text",
            text: textParts.map((p: any) => p.text).join(""),
          });
        }
        for (const p of fnCallParts as any[]) {
          contentBlocks.push({
            type: "tool_use",
            id: `toolu_${p.functionCall.name}`,
            name: p.functionCall.name,
            input: p.functionCall.args || {},
          });
        }

        if (contentBlocks.length > 0) {
          messages.push({ role: "assistant", content: contentBlocks });
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

    const messages = this.toAnthropicMessages(history, userTurn);
    const anthropicTools =
      tools.length > 0 ? this.toAnthropicTools(tools) : undefined;

    const body: any = {
      model: request.model || "", // set by caller
      max_tokens: 8192,
      system: systemInstruction,
      messages,
      ...(anthropicTools ? { tools: anthropicTools } : {}),
    };

    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": ANTHROPIC_API_VERSION,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Anthropic API error ${response.status}: ${text}`);
    }

    const data: any = await response.json();
    const contentBlocks: any[] = data.content || [];

    let text = "";
    const functionCalls: Array<{ name: string; args: any }> = [];

    for (const block of contentBlocks) {
      if (block.type === "text") {
        text += block.text;
      } else if (block.type === "tool_use") {
        functionCalls.push({ name: block.name, args: block.input || {} });
      }
    }

    const rawParts: any[] = [];
    if (text) rawParts.push({ text });
    for (const fc of functionCalls) {
      rawParts.push({ functionCall: { name: fc.name, args: fc.args } });
    }

    return {
      text,
      functionCalls,
      rawParts,
      stopReason:
        data.stop_reason === "tool_use"
          ? "tool_calls"
          : data.stop_reason === "end_turn"
            ? "stop"
            : "max_tokens",
    };
  }

  async generateStream(
    request: LLMRequest,
    onChunk: (chunk: LLMStreamChunk) => void,
  ): Promise<LLMResponse> {
    const { history, userTurn, tools, systemInstruction } = request;

    const messages = this.toAnthropicMessages(history, userTurn);
    const anthropicTools =
      tools.length > 0 ? this.toAnthropicTools(tools) : undefined;

    const body: any = {
      model: request.model || "",
      max_tokens: 8192,
      system: systemInstruction,
      messages,
      stream: true,
      ...(anthropicTools ? { tools: anthropicTools } : {}),
    };

    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": ANTHROPIC_API_VERSION,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Anthropic API error ${response.status}: ${text}`);
    }

    let accText = "";
    const accToolUse: Map<
      number,
      { id: string; name: string; inputRaw: string }
    > = new Map();

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
        if (line.startsWith("data: ")) {
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "content_block_delta") {
              const delta = event.delta;
              if (delta?.type === "text_delta") {
                accText += delta.text;
                onChunk({ text: delta.text, done: false });
              } else if (delta?.type === "input_json_delta") {
                const idx = event.index ?? 0;
                const existing = accToolUse.get(idx) || {
                  id: "",
                  name: "",
                  inputRaw: "",
                };
                existing.inputRaw += delta.partial_json || "";
                accToolUse.set(idx, existing);
              }
            } else if (event.type === "content_block_start") {
              const block = event.content_block;
              if (block?.type === "tool_use") {
                const idx = event.index ?? 0;
                accToolUse.set(idx, {
                  id: block.id,
                  name: block.name,
                  inputRaw: "",
                });
              }
            }
          } catch {
            // ignore
          }
        }
      }
    }

    onChunk({ done: true });

    const functionCalls = Array.from(accToolUse.values()).map((tc) => ({
      name: tc.name,
      args: (() => {
        try {
          return JSON.parse(tc.inputRaw || "{}");
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
