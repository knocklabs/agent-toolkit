import {
  Workflow,
  WorkflowUpsertParams,
} from "@knocklabs/mgmt/resources/index.js";
import { z } from "zod";

import { KnockTool } from "../knock-tool.js";

/**
 * A slimmed down version of the Workflow resource that is easier to work with in the LLM.
 */
type SerializedWorkflow = {
  key: string;
  name: string;
  description: string | undefined;
  categories: string[] | undefined;
  schema: Record<string, unknown> | undefined;
};

function serializeWorkflowResponse(workflow: Workflow): SerializedWorkflow {
  return {
    key: workflow.key,
    name: workflow.name,
    description: workflow.description,
    categories: workflow.categories,
    schema: workflow.trigger_data_json_schema,
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

    return serializeWorkflowResponse(workflow);
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

const createEmailWorkflow = KnockTool({
  method: "create_rich_email_workflow",
  name: "Create rich email workflow",
  description: `
  Creates a Knock workflow with a single step for sending an email. Use this tool when you're asked to create an email notification and you need to specify the content of the email.

  ## Blocks

  The content of the email is supplied as an array of "blocks". The simplest block is a "markdown" block, which supports content in a markdown format. That should always be your default block type. 

  The following block types are supported:

  - \`markdown\`: A block that supports markdown content.
  - \`html\`: A block that supports markdown content.
  - \`image\`: A block that supports an image.
  - \`button_set\`: A block that adds one or more buttons.
  - \`divider\`: A block that supports a divider.
  - \`partial\`: A block that supports rendering a shared content partial.

  <example>
  {
    "blocks": [
      {
        "type": "markdown",
        "content": "# Greetings from Knock!\nHello, {{ recipient.name }}."
      },
      {
        "type": "divider"
      },
      {
        "type": "button_set",
        "buttons": [
          {
            "label": "Approve",
            "action": "{{ data.primary_action_url }}",
            "variant": "solid"
          }
        ]
      }
    ]
  }
  </example>

  ### Markdown

  When using the \`markdown\` block, you must supply a \`content\` key. The \`content\` key supports markdown.

  <example>
  {
    "type": "markdown",
    "content": "Hello, world!"
  }
  </example>

  ### HTML 

  The \`html\` block supports raw HTML content. This should be used sparingly, and only when you need to include custom HTML content that markdown doesn't support. When using the \`html\` block, you must supply a \`content\` key. HTML content can include liquid personalization.

  ### Button sets

  Button sets are a special type of block that allows you to add one or more buttons to the email. They're useful for directing users to take specific actions. Button sets support one or more buttons. You must always include at least one button in a button set.

  Buttons are specified in a button set under the \`buttons\` key. Each button requires a \`label\`, \`action\`, and \`variant\`. The ONLY valid variants are \`solid\` and \`outline\`. The label and action can allowed be dynamic variables using liquid.

  <example>
  {
    "type": "button_set",
    "buttons": [
      {
        "label": "Approve",
        "action": "https://example.com",
        "variant": "solid"
      }
    ]
  }
  </example>

  ### Image

  Images are a special type of block that allows you to add an image to the email. When using the \`image\` block, you must supply a \`url\` key. The \`url\` key supports a URL to an image.

  <example>
  {
    "type": "image",
    "url": "https://example.com/image.png"
  }
  </example>

  ## Personalization

  If you need to include personalization, you can use liquid to include dynamic content in the email and the subject line.
  The following variables are always available to use in liquid:

  - \`recipient.id\`: The ID of the recipient.  
  - \`recipient.name\`: The name of the recipient.
  - \`recipient.email\`: The email of the recipient.
  - \`recipient.phone_number\`: The phone number of the recipient.

  You can supply **any** other dynamic variables you think are needed by referencing them under the \`data\` key. You add those like \`{{ data.variable_name }}\`.

  <example>
  # Hello, {{ recipient.name }}

  This is a dynamic message: 
  
  > {{ data.message }}
  </example>

  ## Liquid helpers

  You have access to a full suite of liquid helpers to help you perform common templating tasks. The full list of helper is available here: https://docs.knock.app/designing-workflows/template-editor/reference-liquid-helpers.

  <example>
  Hello, {{ recipient.name | split: " " | first | default: "there" }}
  </example>

  ## Partials

  If you need to reuse content across multiple emails, you can create or reference an existing partial and reference it in the email. You should only use partials if you're instructed to do so.

  When you do need to use a partial in an email, you can use the \`partial\` block and then set the \`key\` to the key of the partial you want to use. If the partial requires any variables, you pass those in the \`attrs\` key.

  ## Writing style

  Unless asked otherwise, you should write content for the email in a concise and formal writing style. Do NOT use complex language or try to over explain. Keep the subject line to 8 words or less.
  `,
  parameters: z.object({
    name: z.string().describe("(string): The name of the workflow."),
    description: z
      .string()
      .optional()
      .describe("(string): The description of the workflow."),
    categories: z
      .array(z.string())
      .optional()
      .describe("(array): The categories to add to the workflow."),
    blocks: z
      .array(z.any())
      .describe("(array): The blocks to add to the workflow."),
    subject: z.string().describe("(string): The subject of the email."),
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
      environment: config.environment ?? "development",
      workflow: {
        name: params.name,
        description: params.description,
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
              visual_blocks: params.blocks,
            },
            name: "Email",
            ref: "email_1",
          },
        ],
      },
    };

    const result = await knockClient.workflows.upsert(
      params.workflowKey,
      workflowParams
    );

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
  createEmailWorkflow,
  createOneOffWorkflowSchedule,
};

export const permissions = {
  read: ["listWorkflows", "getWorkflow"],
  manage: ["createEmailWorkflow", "createOneOffWorkflowSchedule"],
  run: ["triggerWorkflow"],
};
