import { Tool as MastraTool } from "@mastra/core/tools";
import { z } from "zod";

import { createKnockClient } from "@/lib/knock-client";
import { getToolsByPermissionsInCategories, getToolMap } from "@/lib/utils";
import { ToolCategory, ToolkitConfig } from "@/types";

import { knockToolToMastraTool } from "./tool-converter";

type KnockToolkit = {
  getAllTools: () => MastraTool<z.ZodObject<any, any>>[];
  getTools: (category: ToolCategory) => MastraTool<z.ZodObject<any, any>>[];
  getToolMap: () => Record<string, MastraTool<z.ZodObject<any, any>>>;
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
    getAllTools: (): MastraTool<z.ZodObject<any, any>>[] => {
      return allTools.map((tool) =>
        knockToolToMastraTool(knockClient, config, tool)
      );
    },

    /**
     * Get all tools for a specific category.
     *
     * @param category - The category of tools to get
     * @returns A list of tools for the given category
     */
    getTools: (category: ToolCategory): MastraTool<z.ZodObject<any, any>>[] => {
      return allowedToolsByCategory[category].map((tool) =>
        knockToolToMastraTool(knockClient, config, tool)
      );
    },

    /**
     * Get a map of all tools by method name.
     *
     * @returns A map of all tools by method name
     */
    getToolMap: (): Record<string, MastraTool<z.ZodObject<any, any>>> => {
      return Object.entries(toolsByMethod).reduce(
        (acc, [method, tool]) => ({
          ...acc,
          [method]: knockToolToMastraTool(knockClient, config, tool),
        }),
        {} as Record<string, MastraTool<z.ZodObject<any, any>>>
      );
    },
  });
};

export { createKnockToolkit };
