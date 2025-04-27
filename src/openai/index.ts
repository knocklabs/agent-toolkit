import {
  ChatCompletionTool,
  ChatCompletionMessageToolCall,
  ChatCompletionToolMessageParam,
} from "openai/resources.mjs";

import { createKnockClient } from "../lib/knock-client.js";
import { getToolMap, getToolsByPermissionsInCategories } from "../lib/utils.js";
import { ToolCategory, ToolkitConfig } from "../types.js";

import { knockToolToChatCompletionTool } from "./tool-converter.js";

type KnockToolkit = {
  getAllTools: () => ChatCompletionTool[];
  getTools: (category: ToolCategory) => ChatCompletionTool[];
  getToolMap: () => Record<string, ChatCompletionTool>;
  handleToolCall: (
    toolCall: ChatCompletionMessageToolCall
  ) => Promise<ChatCompletionToolMessageParam>;
};

/**
 * Creates a Knock toolkit for use with the OpenAI API.
 *
 * When the `config.permissions.workflows.trigger` is set, then workflow triggers for
 * the specified workflows will be included in the returned tools.
 *
 * You can also specify a list of workflow keys to include in the returned tools, should you wish to
 * limit the set of workflows that are available.
 *
 * @example
 * ```ts
 * const toolkit = await createKnockToolkit({
 *   permissions: {
 *     workflows: { run: true },
 *   },
 * });
 * ```
 *
 * @param config - The configuration to use for the toolkit
 * @returns A toolkit for use with the OpenAI API
 */
const createKnockToolkit = async (
  config: ToolkitConfig
): Promise<KnockToolkit> => {
  const knockClient = createKnockClient(config);
  const allowedToolsByCategory = await getToolsByPermissionsInCategories(
    knockClient,
    config
  );
  const allTools = Object.values(allowedToolsByCategory).flat();
  const toolsByMethod = getToolMap(allTools);

  return Promise.resolve({
    /**
     * Get all tools as a flat list, including workflow triggers when workflows-as-tools are enabled.
     *
     * @returns An array of all tools
     */
    getAllTools: (): ChatCompletionTool[] => {
      return allTools.map((t) => knockToolToChatCompletionTool(t));
    },

    /**
     * Get all tools for a specific category, including workflow triggers when workflows-as-tools are enabled.
     *
     * @param category - The category of tools to get
     * @returns An array of tools for the given category
     */
    getTools: (category: ToolCategory): ChatCompletionTool[] => {
      return allowedToolsByCategory[category].map((t) =>
        knockToolToChatCompletionTool(t)
      );
    },

    /**
     * Get a map of all tools by method name, including workflow triggers when workflows-as-tools are enabled.
     *
     * @returns A map of all tools by method name
     */
    getToolMap: (): Record<string, ChatCompletionTool> => {
      return Object.entries(toolsByMethod).reduce(
        (acc, [method, tool]) => {
          acc[method] = knockToolToChatCompletionTool(tool);
          return acc;
        },
        {} as Record<string, ChatCompletionTool>
      );
    },

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
  });
};

export { createKnockToolkit };
