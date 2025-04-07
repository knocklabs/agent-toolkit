import { KnockTool } from "./knock-tool.js";
import { toolPermissions, tools } from "../lib/tools/index.js";
import { ToolkitConfig } from "../types.js";
import { ToolCategory } from "../types.js";

/**
 * Given a list of tools, and some config may describe the tools that should be provided to the LLM,
 * returns a filtered list of tools that match the config.
 *
 * Options:
 * `*` - All tools
 * `users.*` - All tools that start with `users.`
 * `users.getUser` - A specific tool
 *
 */
export function filterTools(
  tools: Record<string, Record<string, KnockTool>>,
  pattern: string | undefined
): KnockTool[] {
  if (!pattern) {
    throw new Error("No pattern provided");
  }

  // If the pattern is `*`, return all tools
  if (pattern === "*") {
    return Object.values(tools).flatMap((category) => Object.values(category));
  }

  const [category, tool] = pattern.split(".");

  // If the pattern is `*.*`, return all tools
  if (category === "*" && tool === "*") {
    return Object.values(tools).flatMap((category) => Object.values(category));
  }

  if (category && !tools[category]) {
    throw new Error(`Tool category ${category} not found`);
  }

  // If the pattern is `users.*`, return all tools that start with `users.`
  if (category && tool === "*") {
    return Object.values(tools[category]);
  }

  // If the pattern is `users.getUser`, return the `getUser` tool
  if (category && tool && !tools[category][tool]) {
    throw new Error(`Tool ${pattern} not found`);
  }

  return [tools[category][tool]];
}

/**
 * Given a category and a list of permissions, return a list of tools that the user has permission to use.
 *
 * @param category - The category to get tools for
 * @param categoryPermissions - The permissions to use
 * @returns A list of tools that the user has permission to use
 */
export function getToolsWithPermissions(
  category: keyof typeof toolPermissions,
  categoryPermissions: Record<string, boolean | undefined>
) {
  // Return all of the tools for the category that have permission
  const toolsInCategory = tools[category] as Record<string, KnockTool>;
  const toolPermissionsInCategory = toolPermissions[category] as Record<
    string,
    string[]
  >;

  // Look over each permission type, like `read: true`
  // If it's `true`, then find all of the tools that have that permission
  return Object.entries(categoryPermissions).reduce(
    (acc: KnockTool[], [permissionType, hasPermission]) => {
      if (hasPermission) {
        return acc.concat(
          toolPermissionsInCategory[permissionType].map(
            (toolName) => toolsInCategory[toolName]
          )
        );
      }
      return acc;
    },
    []
  );
}

/**
 * Given a config, return a list of tools for each category that the user has permission to use.
 *
 * @param config - The config to use
 * @returns A list of tools for each category that the user has permission to use
 */
export function getToolsByPermissionsInCategories(
  config: ToolkitConfig
): Record<ToolCategory, KnockTool[]> {
  return Object.keys(config.permissions).reduce(
    (acc, category) => {
      const categoryKey = category as ToolCategory;
      const categoryPermissions = config.permissions[categoryKey];

      if (tools[categoryKey] && categoryPermissions) {
        const tools = getToolsWithPermissions(categoryKey, categoryPermissions);

        return { ...acc, [categoryKey]: tools };
      }

      return acc;
    },
    {} as Record<ToolCategory, KnockTool[]>
  );
}

/**
 * Serialize a message response from the API to a more LLM-friendly format.
 *
 * @param message - The message to serialize
 * @returns A serialized message
 */
export function serializeMessageResponse(message: Record<string, any>) {
  return {
    id: message.id,
    status: message.status,
    engagement_statuses: message.engagement_statuses,
    data: message.data,
    metadata: message.metadata,
  };
}
