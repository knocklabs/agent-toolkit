import { toolPermissions, tools } from "../lib/tools/index.js";
import { ToolkitConfig, ToolCategory } from "../types.js";

import { KnockClient } from "./knock-client.js";
import { KnockTool } from "./knock-tool.js";
import { createWorkflowTools } from "./tools/workflows-as-tools.js";

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
  categoryPermissions: Record<string, boolean | string[] | undefined>
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
      if (
        (Array.isArray(hasPermission) && hasPermission.length > 0) ||
        hasPermission === true
      ) {
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
 * If the user has run permissions for workflows, then we need to get the workflow triggers tools,
 * and add them to the list of tools for the workflows category.
 *
 * @param config - The config to use
 * @returns A list of tools for each category that the user has permission to use
 */
export async function getToolsByPermissionsInCategories(
  knockClient: KnockClient,
  config: ToolkitConfig
): Promise<Record<ToolCategory, KnockTool[]>> {
  const toolsByCategory = Object.keys(config.permissions).reduce(
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

  // If the user has run permissions for workflows, then we need to get the workflow triggers tools,
  // and add them to the list of tools for the workflows category.
  if (
    config.permissions.workflows &&
    config.permissions.workflows.trigger &&
    Array.isArray(config.permissions.workflows.trigger)
  ) {
    const workflowTools = await createWorkflowTools(
      knockClient,
      config,
      config.permissions.workflows.trigger
    );
    toolsByCategory.workflows = [
      ...toolsByCategory.workflows,
      ...workflowTools,
    ];
  }

  return toolsByCategory;
}

/**
 * Given a list of tools, return a map of tools by method name.
 *
 * @param tools - The tools to serialize
 * @returns A map of tools by method name
 */
export function getToolMap(tools: KnockTool[]) {
  return tools.reduce(
    (acc, tool) => {
      acc[tool.method] = tool;
      return acc;
    },
    {} as Record<string, KnockTool>
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

export async function safeExecute<T>(
  fn: () => Promise<T>
): Promise<T | { message: string; error: unknown }> {
  try {
    return await fn();
  } catch (error: unknown) {
    console.error(error);

    if (error instanceof Error) {
      return {
        message: `An error occurred with the call to the Knock API: ${error.message}`,
        error,
      };
    }

    return {
      message: "An unknown error occurred with the call to the Knock API.",
      error,
    };
  }
}
