import { ToolSet } from "ai";

import { createKnockClient } from "../lib/knock-client.js";
import { getToolsByPermissionsInCategories } from "../lib/utils.js";
import { ToolCategory, ToolkitConfig } from "../types.js";

import { knockToolToAiTool } from "./tool-converter.js";

const createKnockToolkit = (config: ToolkitConfig) => {
  const knockClient = createKnockClient(config);
  const allowedToolsByCategory = getToolsByPermissionsInCategories(config);

  return {
    /**
     * Get all tools for all categories
     * @returns An array of all tools
     */
    getAllTools: (): ToolSet => {
      return Object.values(allowedToolsByCategory)
        .flat()
        .reduce(
          (acc, tool) => ({
            ...acc,
            [tool.method]: knockToolToAiTool(knockClient, config, tool),
          }),
          {} as ToolSet
        );
    },

    /**
     * Get all tools for a specific category
     * @param category - The category of tools to get
     * @returns An array of tools for the given category
     */
    getTools: (category: ToolCategory): ToolSet => {
      return allowedToolsByCategory[category].reduce(
        (acc, tool) => ({
          ...acc,
          [tool.method]: knockToolToAiTool(knockClient, config, tool),
        }),
        {} as ToolSet
      );
    },
  };
};

export { createKnockToolkit };
