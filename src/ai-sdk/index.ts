import { Tool, ToolSet } from "ai";

import { createKnockClient } from "../lib/knock-client.js";
import { getToolMap, getToolsByPermissionsInCategories } from "../lib/utils.js";
import { ToolCategory, ToolkitConfig } from "../types.js";

import { knockToolsToToolSet, knockToolToAiTool } from "./tool-converter.js";

/**
 * Creates a Knock toolkit for use with the AI SDK.
 *
 * You can filter the set of tools that are available by setting the `config.permissions` property.
 *
 * When the `config.permissions.workflows.run` is set, then workflow triggers for
 * the specified workflows will be included in the returned tools.
 *
 * You can also specify a list of workflow keys to include in the returned tools, should you wish to
 * limit the set of workflows that are available.
 *
 * @example
 * ```ts
 * const toolkit = await createKnockToolkit({
 *   permissions: {
 *     workflows: { read: true },
 *   },
 * });
 * ```
 *
 * @param config - The configuration to use for the toolkit
 * @returns A toolkit for use with the AI SDK
 */
const createKnockToolkit = async (config: ToolkitConfig) => {
  const knockClient = createKnockClient(config);
  const allowedToolsByCategory = await getToolsByPermissionsInCategories(
    knockClient,
    config
  );
  const allTools = Object.values(allowedToolsByCategory).flat();
  const toolsByMethod = getToolMap(allTools);

  return {
    /**
     * Get all tools for all categories. When the `config.permissions.workflows.run` is set, then workflow triggers for
     * the specified workflows will be included in the returned tools.
     *
     * @returns A promise that resolves to a set of tools
     */
    getAllTools: async (): Promise<ToolSet> => {
      return knockToolsToToolSet(knockClient, config, allTools);
    },

    /**
     * Get all tools for a specific category. When trying to get tools for the `workflows` category and the run permission is set,
     * the workflow triggers for the specified workflows will be included in the returned tools.
     *
     * @param category - The category of tools to get
     * @returns An array of tools for the given category
     */
    getTools: async (category: ToolCategory): Promise<ToolSet> => {
      return knockToolsToToolSet(
        knockClient,
        config,
        allowedToolsByCategory[category]
      );
    },

    /**
     * Get a map of all tools by method name. When the `config.permissions.workflows.run` is set, then workflow triggers for
     * the specified workflows will be included in the returned tools.
     *
     * @returns A map of all tools by method name
     */
    getToolMap: async (): Promise<Record<string, Tool>> => {
      return Object.entries(toolsByMethod).reduce(
        (acc, [method, tool]) => ({
          ...acc,
          [method]: knockToolToAiTool(knockClient, config, tool),
        }),
        {} as Record<string, Tool>
      );
    },
  };
};

export { createKnockToolkit };
