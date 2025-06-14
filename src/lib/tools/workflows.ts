import { Workflow, WorkflowStep } from "@knocklabs/mgmt/resources/index.js";
import { z } from "zod";

import { KnockTool } from "../knock-tool.js";

import { workflowStepTools } from "./workflow-steps.js";

/**
 * A slimmed down version of the Workflow resource that is easier to work with in the LLM.
 */
export type SerializedWorkflow = {
  key: string;
  name: string;
  description: string | undefined;
  categories: string[] | undefined;
  schema: Record<string, unknown> | undefined;
};

export function serializeWorkflowResponse(
  workflow: Workflow
): SerializedWorkflow {
  return {
    key: workflow.key,
    name: workflow.name,
    description: workflow.description,
    categories: workflow.categories,
    schema: workflow.trigger_data_json_schema,
  };
}

export function serializeFullWorkflowResponse(
  workflow: Workflow
): SerializedWorkflow & { steps: WorkflowStep[] } {
  return {
    key: workflow.key,
    name: workflow.name,
    description: workflow.description,
    categories: workflow.categories,
    schema: workflow.trigger_data_json_schema,
    steps: workflow.steps,
  };
}

const listWorkflows = KnockTool({
  method: "list_workflows",
  name: "List workflows",
  description: `
  List all workflows available for the given environment. Returns structural information about the workflows, including the key, name, description, and categories.

  Use this tool when you need to understand which workflows are available to be called.
  `,
  parameters: z.object({
    environment: z
      .string()
      .optional()
      .describe(
        "(string): The environment to list workflows for. Defaults to `development`."
      ),
  }),
  execute: (knockClient, config) => async (params) => {
    const allWorkflows: SerializedWorkflow[] = [];
    const listParams = {
      environment: params.environment ?? config.environment ?? "development",
    };

    for await (const workflow of knockClient.workflows.list(listParams)) {
      allWorkflows.push(serializeWorkflowResponse(workflow));
    }

    return allWorkflows;
  },
});

const getWorkflow = KnockTool({
  method: "get_workflow",
  name: "Get workflow",
  description: `
  Get a workflow by key. Returns structural information about the workflow, including the key, name, description, and categories.
  `,
  parameters: z.object({
    environment: z
      .string()
      .optional()
      .describe(
        "(string): The environment to get the workflow for. Defaults to `development`."
      ),
    workflowKey: z
      .string()
      .describe("(string): The key of the workflow to get."),
  }),
  execute: (knockClient, config) => async (params) => {
    const workflow = await knockClient.workflows.retrieve(params.workflowKey, {
      environment: params.environment ?? config.environment ?? "development",
    });

    return serializeFullWorkflowResponse(workflow);
  },
});

const triggerWorkflow = KnockTool({
  method: "trigger_workflow",
  name: "Trigger workflow",
  description: `
  Trigger a workflow for one or more recipients, which may produce one or more messages for each recipient depending on the workflow's steps.

  Use this tool when you need to trigger a workflow to send a notification across the channels configured for the workflow. 

  When recipients aren't provided, the workflow will be triggered for the current user specified in the config.

  Returns the workflow run ID, which can be used to lookup messages produced by the workflow.
  `,
  parameters: z.object({
    environment: z
      .string()
      .optional()
      .describe(
        "(string): The environment to trigger the workflow in. Defaults to `development`."
      ),
    workflowKey: z
      .string()
      .describe("(string): The key of the workflow to trigger."),
    recipients: z
      .array(z.string())
      .optional()
      .describe(
        "(array): The recipients to trigger the workflow for. This is an array of user IDs."
      ),
    data: z
      .record(z.string(), z.any())
      .optional()
      .describe("(object): Data to pass to the workflow."),
    tenant: z
      .record(z.string(), z.any())
      .optional()
      .describe(
        "(object): The tenant to trigger the workflow for. Must contain an id if being sent."
      ),
  }),
  execute: (knockClient, config) => async (params) => {
    const publicClient = await knockClient.publicApi(params.environment);

    const result = await publicClient.workflows.trigger(params.workflowKey, {
      recipients: params.recipients ?? [config.userId] ?? [],
      data: params.data,
      tenant: params.tenant ?? config.tenantId,
    });

    return result.workflow_run_id;
  },
});

const createWorkflow = KnockTool({
  method: "create_workflow",
  name: "Create workflow",
  description: `
  Create a new workflow, which is used to control the flow of notifications. Use this tool when you're asked to create a new workflow, or you need to create a new workflow before adding a step to it.
  `,
  parameters: z.object({
    environment: z
      .string()
      .optional()
      .describe(
        "(string): The environment to create the workflow in. Defaults to `development`."
      ),
    workflowKey: z
      .string()
      .describe(
        "(string): The key of the workflow to create. Only use a kebab-case string with no spaces or special characters."
      ),
    name: z.string().describe("(string): The name of the workflow."),
    description: z
      .string()
      .describe("(string): The description of the workflow."),
    categories: z
      .array(z.string())
      .describe("(array): The categories to add to the workflow."),
  }),
  execute: (knockClient, config) => async (params) => {
    const result = await knockClient.workflows.upsert(params.workflowKey, {
      environment: config.environment ?? "development",
      workflow: {
        name: params.name,
        description: params.description,
        categories: params.categories ?? [],
        steps: [],
      },
    });

    return serializeWorkflowResponse(result.workflow);
  },
});

const createOneOffWorkflowSchedule = KnockTool({
  method: "create_one_off_workflow_schedule",
  name: "Create one-off workflow schedule",
  description: `
  Create a one-off workflow schedule for a user. Use this tool when you need to schedule the execution of a workflow for a specific user in the future, like to power a delayed notification.
  
  Schedules can accept a set of data that will be passed to the workflow trigger when it is executed. When the userId is not provided, the schedule will be created for the current user specified in the config.

  Examples:
  
  - In three days, send a welcome email to a user
  - In one hour, send a password reset email to a user
  - In two weeks, send a survey to a user
  `,
  parameters: z.object({
    environment: z
      .string()
      .optional()
      .describe(
        "(string): The environment to create the workflow in. Defaults to `development`."
      ),
    workflowKey: z
      .string()
      .describe("(string): The key of the workflow to schedule."),
    userId: z
      .string()
      .describe(
        "(string): The userId of the user to schedule the workflow for."
      ),
    scheduledAt: z
      .string()
      .describe(
        "(string): The date and time to schedule the workflow for. Must be in ISO 8601 format."
      ),
    data: z
      .record(z.string(), z.any())
      .optional()
      .describe("(object): Data to pass to the workflow."),
  }),
  execute: (knockClient, config) => async (params) => {
    const publicClient = await knockClient.publicApi(params.environment);

    return await publicClient.workflows.createSchedules(params.workflowKey, {
      recipients: [params.userId ?? config.userId],
      scheduled_at: params.scheduledAt,
      data: params.data,
    });
  },
});

export const workflows = {
  listWorkflows,
  getWorkflow,
  triggerWorkflow,
  createWorkflow,
  ...workflowStepTools,
  createOneOffWorkflowSchedule,
};

export const permissions = {
  read: ["listWorkflows", "getWorkflow"],
  manage: [
    "createWorkflow",
    "createOneOffWorkflowSchedule",
    "triggerWorkflow",
  ].concat(...Object.keys(workflowStepTools)),
  trigger: [],
};
