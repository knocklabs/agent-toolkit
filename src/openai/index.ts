import {
  ChatCompletionTool,
  ChatCompletionMessageToolCall,
  ChatCompletionToolMessageParam,
} from "openai/resources.mjs";
import { ToolCategory, ToolkitConfig } from "../types.js";
import { getToolsByPermissionsInCategories } from "../lib/utils.js";
import { createKnockClient } from "../lib/knock-client.js";
import { knockToolToChatCompletionTool } from "./tool-converter.js";
import { KnockTool } from "../lib/knock-tool.js";

const createKnockToolkit = (config: ToolkitConfig) => {
  const knockClient = createKnockClient(config);
  const allowedToolsByCategory = getToolsByPermissionsInCategories(config);

  const toolsByMethod = Object.values(allowedToolsByCategory)
    .flat()
    .reduce(
      (acc, tool) => ({ ...acc, [tool.method]: tool }),
      {} as Record<string, KnockTool>
    );

  return {
    /**
     * Get all tools as a flat list.
     *
     * @returns An array of all tools
     */
    getAllTools: (): ChatCompletionTool[] =>
      Object.values(toolsByMethod).map((t) => knockToolToChatCompletionTool(t)),

    /**
     * Get all tools for a specific category.
     *
     * @param category - The category of too  ls to get
     * @returns An array of tools for the given category
     */
    getTools: (category: ToolCategory): ChatCompletionTool[] =>
      allowedToolsByCategory[category].map((t) =>
        knockToolToChatCompletionTool(t)
      ),

    /**
     * Get a map of all tools by method name.
     *
     * @returns A map of all tools by method name
     */
    getToolMap: () =>
      Object.entries(toolsByMethod).reduce(
        (acc, [method, tool]) => {
          acc[method] = knockToolToChatCompletionTool(tool);
          return acc;
        },
        {} as Record<string, ChatCompletionTool>
      ),
    /**
     * Handle a tool call from the OpenAI API. Call this to invoke the tool.
     *
     * @param toolCall - The tool call to handle
     * @returns The result of the tool call
     */
    handleToolCall: async (toolCall: ChatCompletionMessageToolCall) => {
      const tool = toolsByMethod[toolCall.function.name];

      if (!tool) {
        throw new Error(`Tool ${toolCall.function.name} not found`);
      }

      const result = await tool.bindExecute(
        knockClient,
        config
      )(toolCall.function.arguments);

      return {
        role: "tool",
        tool_call_id: toolCall.id,
        content: result,
      } as ChatCompletionToolMessageParam;
    },
  };
};

export { createKnockToolkit };
