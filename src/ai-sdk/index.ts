import { Tool, ToolExecutionOptions, ToolSet } from "ai";

import {
  handleMessageInteraction,
  triggerHumanInTheLoopWorkflow,
  wrapToolDescription,
} from "../lib/human-in-the-loop/index.js";
import {
  DeferredToolCall,
  DeferredToolCallConfig,
  KnockOutboundWebhookEvent,
  DeferredToolCallInteractionResult,
} from "../lib/human-in-the-loop/types.js";
import { createKnockClient } from "../lib/knock-client.js";
import { getToolMap, getToolsByPermissionsInCategories } from "../lib/utils.js";
import { ToolCategory, ToolkitConfig } from "../types.js";

import { knockToolsToToolSet, knockToolToAiTool } from "./tool-converter.js";

type KnockToolkit = {
  getAllTools: () => ToolSet;
  getTools: (category: ToolCategory) => ToolSet;
  getToolMap: () => Record<string, Tool>;
  requireHumanInput: (
    toolsToWrap: ToolSet,
    inputConfig: DeferredToolCallConfig
  ) => ToolSet;
  resumeToolExecution: (toolInteraction: DeferredToolCall) => Promise<unknown>;
  wrappedToolsRequiringInput: () => Map<string, Tool>;
  handleMessageInteraction: (
    event: KnockOutboundWebhookEvent
  ) => DeferredToolCallInteractionResult | null;
};

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

  const wrappedToolsRequiringInput = new Map<string, Tool>();

  return Promise.resolve({
    /**
     * Get all tools for all categories. When the `config.permissions.workflows.run` is set, then workflow triggers for
     * the specified workflows will be included in the returned tools.
     *
     * @returns A promise that resolves to a set of tools
     */
    getAllTools: (): ToolSet => {
      return knockToolsToToolSet(knockClient, config, allTools);
    },

    /**
     * Get all tools for a specific category. When trying to get tools for the `workflows` category and the run permission is set,
     * the workflow triggers for the specified workflows will be included in the returned tools.
     *
     * @param category - The category of tools to get
     * @returns An array of tools for the given category
     */
    getTools: (category: ToolCategory): ToolSet => {
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
    getToolMap: (): Record<string, Tool> => {
      return Object.entries(toolsByMethod).reduce(
        (acc, [method, tool]) => ({
          ...acc,
          [method]: knockToolToAiTool(knockClient, config, tool),
        }),
        {} as Record<string, Tool>
      );
    },

    /**
     * Wraps one or more tools to require human input.
     *
     * @param toolsToWrap - The tools to wrap
     * @param inputConfig - The configuration to use for the HITL request
     */
    requireHumanInput: (
      toolsToWrap: ToolSet,
      inputConfig: DeferredToolCallConfig
    ): ToolSet => {
      const wrappedTools: Record<string, Tool> = {};

      for (const [method, toolToWrap] of Object.entries(toolsToWrap)) {
        // Keep a reference to the original tool so we can use it later
        wrappedToolsRequiringInput.set(method, { ...toolToWrap });

        const wrappedTool = {
          ...toolToWrap,
          description: wrapToolDescription(toolToWrap.description ?? ""),
          execute: async (input: any, options: ToolExecutionOptions) => {
            const toolExecution = {
              method,
              args: input,
              extra: {
                toolCallId: options.toolCallId,
              },
            };

            await triggerHumanInTheLoopWorkflow({
              knockClient,
              config,
              toolCall: toolExecution,
              inputConfig,
            });

            // TODO: Consider injecting a hook here to allow the AI SDK to react to the tool call being deferred
            return {
              type: "tool-status",
              status: "pending-input",
              toolCallId: options.toolCallId,
            };
          },
        };

        wrappedTools[method] = wrappedTool;
      }

      return wrappedTools;
    },

    /**
     * Returns any tools that were wrapped with `requireHumanInput`.
     *
     * @returns A map of wrapped tools that require human input
     */
    wrappedToolsRequiringInput: () => wrappedToolsRequiringInput,

    /**
     * Resumes the execution of a tool that required human input.
     *
     * @param toolInteraction - The tool interaction to resume
     * @returns A promise that resolves to the result of the tool execution
     */
    resumeToolExecution: async (toolInteraction: DeferredToolCall) => {
      const tool = wrappedToolsRequiringInput.get(toolInteraction.method);

      if (!tool) {
        throw new Error(
          `Tool "${toolInteraction.method}" not found. Did you forget to wrap the tool with requireHumanInput?`
        );
      }

      if (!tool.execute) {
        throw new Error(
          `Tool "${toolInteraction.method}" does not have an execute method. Nothing to resume.`
        );
      }

      const options = toolInteraction.extra as unknown as ToolExecutionOptions;
      const result = await tool.execute(toolInteraction.args, options);

      // Return two message objects to represent the tool call and the call result having
      // finished. Note: this can result in duplicate tool call IDs being present in the message history.
      return {
        type: "tool-status",
        status: "completed",
        toolCallId: options.toolCallId,
        result,
      };
    },

    /**
     * Handles a message interaction event by parsing it into a well-known format.
     *
     * @param event - The message interaction event
     * @returns An deferred tool call, or null if the event is not a message interaction
     */
    handleMessageInteraction,
  });
};

export { createKnockToolkit };
