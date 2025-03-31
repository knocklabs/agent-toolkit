import { z } from "zod";
import { KnockTool } from "../knock-tool.js";
import {
  Workflow,
  WorkflowUpsertParams,
} from "@knocklabs/mgmt/resources/index.js";

const listWorkflows = KnockTool({
  method: "list_workflows",
  name: "List workflows",
  description: `
  List all workflows available for the given environment. Returns structural information about the workflows, including the key, name, description, and categories. Will also return the steps that make up the workflow. 

  Use this tool when you need to understand which workflows are available to be called. 
  `,
  parameters: z.object({
    environment: z
      .string()
      .describe(
        "(string): The environment to list workflows for. Defaults to `development`."
      ),
  }),
  execute: (knockClient, config) => async (params) => {
    const allWorkflows: Workflow[] = [];
    const listParams = {
      environment: params.environment ?? config.environment ?? "development",
    };

    for await (const workflow of knockClient.workflows.list(listParams)) {
      allWorkflows.push(workflow);
    }
    return allWorkflows;
  },
});

const triggerWorkflow = KnockTool({
  method: "trigger_workflow",
  name: "Trigger workflow",
  description: `
  Trigger a workflow for one or more recipients.

  Use this tool when you need to trigger a workflow to send a notification across the channels configured for the workflow. The workflow must be committed in the environment for you to trigger it.

  When recipients aren't provided, the workflow will be triggered for the current user specified in the config.
  `,
  parameters: z.object({
    workflowKey: z
      .string()
      .describe("(string): The key of the workflow to trigger."),
    recipients: z
      .array(z.string())
      .describe("(array): The recipients to trigger the workflow for."),
    data: z
      .record(z.string(), z.any())
      .describe("(object): Data to pass to the workflow."),
    tenant: z
      .record(z.string(), z.any())
      .describe(
        "(object): The tenant to trigger the workflow for. Must contain an id if being sent."
      ),
  }),
  execute: (knockClient, config) => async (params) => {
    const publicClient = await knockClient.publicApi();

    const result = await publicClient.workflows.trigger(params.workflowKey, {
      recipients: params.recipients,
      data: params.data,
      tenant: params.tenant,
    });

    return result.workflow_run_id;
  },
});

const createEmailWorkflow = KnockTool({
  method: "create_email_workflow",
  name: "Create email workflow",
  description: `
  Creates a simple email workflow with a single step that sends an email to the recipient. Use this tool when you need to need to create an email notification, and you don't need to specify any additional steps. You can only create workflows in the development environment.

  The content of the email you supply should ONLY ever be in markdown format for simplicity. You can supply dynamic variables to the subject and body of the email using the liquid template language.

  When writing markdown, be sure to use headings (##) to separate sections of the email. Use an informal writing style, and avoid using complex language.

  The following variables are available to use in the email subject and body:

  - \`recipient.name\`: The name of the recipient.
  - \`recipient.email\`: The email of the recipient.
  - \`recipient.phone_number\`: The phone number of the recipient.
  - \`tenant.id\`: The id of the tenant.
  - \`tenant.name\`: The name of the tenant.

  You can supply any other dynamic variables by referencing them under the \`data\` key in the \`data\` parameter when triggering the workflow. You add those like \`{{ data.variable_name }}\`.

  You can also supply a list of categories to the workflow. These are used to categorize workflows for notification preferences. Categories should be supplied as lowercase strings in kebab case.

  Once you've created the workflow, you should ask if you should commit the changes to the environment.
  `,
  parameters: z.object({
    environment: z
      .string()
      .describe(
        "(string): The environment to create the workflow in. Defaults to `development`."
      ),
    workflowKey: z.string().describe("(string): The key of the workflow."),
    name: z.string().describe("(string): The name of the workflow."),
    categories: z
      .array(z.string())
      .describe("(array): The categories to add to the workflow."),
    subject: z.string().describe("(string): The subject of the email."),
    body: z.string().describe("(string): The body of the email."),
  }),
  execute: (knockClient, config) => async (params) => {
    const emailChannelsPage = await knockClient.channels.list();
    const emailChannels = emailChannelsPage.entries.filter(
      (channel) => channel.type === "email"
    );

    if (emailChannels.length === 0) {
      throw new Error("No email channels found");
    }

    const workflowParams: WorkflowUpsertParams = {
      environment: params.environment ?? config.environment ?? "development",
      workflow: {
        name: params.name,
        categories: params.categories ?? [],
        steps: [
          {
            type: "channel",
            channel_key: emailChannels[0].key,
            template: {
              settings: {
                layout_key: "default",
              },
              subject: params.subject,
              visual_blocks: [
                // @ts-ignore
                {
                  type: "markdown",
                  content: params.body,
                },
              ],
            },
            name: "Email",
            ref: "email_1",
          },
        ],
      },
    };

    return await knockClient.workflows.upsert(
      params.workflowKey,
      workflowParams
    );
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
      .describe("(object): Data to pass to the workflow."),
  }),
  execute: (knockClient, config) => async (params) => {
    const publicClient = await knockClient.publicApi();

    return await publicClient.workflows.createSchedules(params.workflowKey, {
      recipients: [params.userId ?? config.userId],
      scheduled_at: params.scheduledAt,
      data: params.data,
    });
  },
});

export const workflows = {
  listWorkflows,
  triggerWorkflow,
  createEmailWorkflow,
  createOneOffWorkflowSchedule,
};

export const permissions = {
  read: ["listWorkflows"],
  manage: ["createEmailWorkflow", "createOneOffWorkflowSchedule"],
  trigger: ["triggerWorkflow"],
};
