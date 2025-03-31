import { ToolkitConfig } from "../types.js";
import { toolPermissions } from "../lib/tools/index.js";
import { getToolsByPermissionsInCategories } from "../lib/utils.js";
import { createKnockClient } from "../lib/knock-client.js";
import { Tool } from "ai";
import { knockToolToAiTool } from "./tool-converter.js";

const createKnockToolkit = (config: ToolkitConfig) => {
  const knockClient = createKnockClient(config);
  const allowedToolsByCategory = getToolsByPermissionsInCategories(config);

  return {
    /**
     * Get all tools for all categories
     * @returns An array of all tools
     */
    getAllTools: (): Tool[] =>
      Object.values(allowedToolsByCategory)
        .flat()
        .map((t) => knockToolToAiTool(knockClient, config, t)),

    /**
     * Get all tools for a specific category
     * @param category - The category of tools to get
     * @returns An array of tools for the given category
     */
    getTools: (category: keyof typeof toolPermissions): Tool[] =>
      allowedToolsByCategory[category].map((t) =>
        knockToolToAiTool(knockClient, config, t)
      ),
  };
};

export { createKnockToolkit };
