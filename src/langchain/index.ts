import { DynamicStructuredTool } from "@langchain/core/tools";

import { createKnockClient } from "@/lib/knock-client";
import { getToolsByPermissionsInCategories, getToolMap } from "@/lib/utils";
import { ToolCategory, ToolkitConfig } from "@/types";

import { knockToolToLangchainTool } from "./tool-converter";

type KnockToolkit = {
  getAllTools: () => DynamicStructuredTool[];
  getTools: (category: ToolCategory) => DynamicStructuredTool[];
  getToolMap: () => Record<string, DynamicStructuredTool>;
};

/**
 * Create a toolkit for use with the LangChain framework.
 *
 * @param config - The configuration to use for the toolkit
 * @returns A toolkit for use with the LangChain framework
 */
const createKnockToolkit = async (
  config: ToolkitConfig
): Promise<KnockToolkit> => {
  const knockClient = createKnockClient({
    serviceToken: config.serviceToken ?? process.env.KNOCK_SERVICE_TOKEN!,
  });

  const allowedToolsByCategory = await getToolsByPermissionsInCategories(
    knockClient,
    config
  );

  const allTools = Object.values(allowedToolsByCategory).flat();
  const toolsByMethod = getToolMap(allTools);

  return Promise.resolve({
    /**
     * Get all tools as list.
     *
     * @returns A list of all tools
     */
    getAllTools: (): DynamicStructuredTool[] => {
      return allTools.map((tool) =>
        knockToolToLangchainTool(knockClient, config, tool)
      );
    },

    /**
     * Get all tools for a specific category.
     *
     * @param category - The category of tools to get
     * @returns A list of tools for the given category
     */
    getTools: (category: ToolCategory): DynamicStructuredTool[] => {
      return allowedToolsByCategory[category].map((tool) =>
        knockToolToLangchainTool(knockClient, config, tool)
      );
    },

    /**
     * Get a map of all tools by method name.
     *
     * @returns A map of all tools by method name
     */
    getToolMap: (): Record<string, DynamicStructuredTool> => {
      return Object.entries(toolsByMethod).reduce(
        (acc, [method, tool]) => ({
          ...acc,
          [method]: knockToolToLangchainTool(knockClient, config, tool),
        }),
        {} as Record<string, DynamicStructuredTool>
      );
    },
  });
};

export { createKnockToolkit };
