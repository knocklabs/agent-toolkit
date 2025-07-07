import { Workflow } from "@knocklabs/mgmt/resources/index.mjs";
import jsonSchemaToZod from "json-schema-to-zod";
import { z } from "zod";

import { Config } from "../../types.js";
import { KnockClient } from "../knock-client.js";
import { KnockTool } from "../knock-tool.js";

import { recipientSchema } from "./shared.js";

/**
 * Converts a workflow into a tool that can be used to trigger the workflow.
 *
 * @param workflow - The workflow to convert to a tool.
 *
 * @returns A `KnockTool` that can be used to trigger the workflow.
 */
function workflowAsTool(workflow: Workflow) {
  return KnockTool({
    method: `trigger_${workflow.key.replace("-", "_")}_workflow`,
    name: `Trigger ${workflow.name} workflow`,
    description: `Triggers the ${workflow.name} workflow. Use this tool when you're asked to notify, send, or trigger for ${workflow.name} or ${workflow.key}.

    ${workflow.description ? `Additional information to consider on when to use this tool: ${workflow.description}` : ""}
    
    Returns the workflow run ID, which can be used to lookup messages produced by the workflow.`,
    parameters: z.object({
      environment: z.string().optional(),
      actor: recipientSchema
        .optional()
        .describe("An optional actor to trigger the workflow with."),
      recipients: z
        .array(recipientSchema)
        .describe(
          "An optional array of recipients to trigger the workflow with."
        )
        .optional(),
      // Here we dynamically generate a zod schema from the workflow's `trigger_data_json_schema`
      // This allows us to validate the data passed to the workflow
      data: workflow.trigger_data_json_schema
        ? eval(jsonSchemaToZod(workflow.trigger_data_json_schema)).describe(
            "The data to pass to the workflow."
          )
        : z
            .record(z.string(), z.any())
            .optional()
            .describe("The data to pass to the workflow."),
      tenant: z
        .string()
        .optional()
        .describe("The tenant ID to trigger the workflow for."),
    }),
    execute: (knockClient, config) => async (params) => {
      const publicClient = await knockClient.publicApi(params.environment);

      const result = await publicClient.workflows.trigger(workflow.key, {
        recipients: params.recipients ?? [config.userId],
        actor: params.actor,
        data: params.data,
        tenant: params.tenant ?? config.tenantId,
      });

      return result.workflow_run_id;
    },
  });
}

/**
 * Creates a tool for each workflow in the given environment.
 *
 * @param knockClient - The Knock client to use to list workflows.
 * @param config - The config to use to list workflows.
 *
 * @returns An array of `KnockTool`s that can be used to trigger the workflows.
 */
async function createWorkflowTools(
  knockClient: KnockClient,
  config: Config,
  workflowKeysToInclude?: string[]
) {
  const workflows: Workflow[] = [];

  for await (const workflow of knockClient.workflows.list({
    environment: config.environment ?? "development",
  })) {
    // If we have a list of workflow keys to include, and the current workflow is not in the list, skip it
    if (
      workflowKeysToInclude &&
      !workflowKeysToInclude.includes(workflow.key)
    ) {
      continue;
    }

    workflows.push(workflow);
  }

  // Build a tool for each workflow
  return workflows.map((workflow) => workflowAsTool(workflow));
}

export { createWorkflowTools, workflowAsTool };
