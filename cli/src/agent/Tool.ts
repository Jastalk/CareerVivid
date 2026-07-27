import { Type } from '@google/genai';

/**
 * Interface defining the parameters schema for a tool.
 * We use a subset of the Open API/JSON Schema specifically used by Google GenAI.
 */
export interface ToolParameters {
  type: Type | string;
  properties?: Record<string, any>;
  required?: string[];
  description?: string;
  enum?: string[];
  items?: ToolParameters;
}

/**
 * An abstraction of the Claude Code Tool system, adapted for Generation AI.
 */
export interface Tool<P = any, R = any> {
  name: string;
  description: string;
  parameters: ToolParameters;
  /**
   * Whether this tool should require user confirmation in the CLI / UI before running.
   */
  requiresConfirmation?: boolean;
  /**
   * Evaluated when the LLM triggers the tool.
   * @param params Validated arguments from the LLM.
   * @returns Resolves with JSON-serializable outputs or string.
   */
  execute: (params: P, context?: any) => Promise<R>;
}

/**
 * Converts a Tool definition into a format accepted by @google/genai tool arrays.
 */
export function convertToGenAITool(tool: Tool): any {
  return {
    functionDeclarations: [
      {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters as any,
      },
    ],
  };
}
