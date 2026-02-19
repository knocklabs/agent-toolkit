import {
  ChatTemplate,
  EmailTemplate,
  InAppFeedTemplate,
  PushTemplate,
  SMSTemplate,
  Workflow,
  WorkflowStep,
  WorkflowUpsertParams,
} from "@knocklabs/mgmt/resources/index.js";
import { z } from "zod";

import { KnockClient } from "../knock-client.js";
import { KnockTool } from "../knock-tool.js";

import { serializeWorkflowResponse } from "./workflows";

function generateStepRef(stepType: string) {
  const randomString = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${stepType}_${randomString}`;
}

async function updateWorkflowWithStep(
  knockClient: KnockClient,
  workflow: Workflow,
  step: WorkflowStep,
  environment: string
) {
  let workflowSteps = workflow.steps;
  const existingStepIdx = workflow.steps.findIndex((s) => s.ref === step.ref);

  // If the step already exists, update it. Otherwise, add it to the end of the steps array.
  if (existingStepIdx !== -1) {
    workflowSteps[existingStepIdx] = step;
  } else {
    workflowSteps.push(step);
  }

  const workflowParams: WorkflowUpsertParams = {
    environment,
    workflow: {
      ...workflow,
      steps: workflowSteps,
    },
  };

  const result = await knockClient.workflows.upsert(
    workflow.key,
    workflowParams
  );

  return serializeWorkflowResponse(result.workflow);
}

const SHARED_PROMPTS = {
  workflow: `
  To use this tool, you MUST first create a workflow using the \`createWorkflow\` tool, or get an existing workflow using the \`getWorkflow\` tool. 
  
  If you are updating an existing step, you can pass the \`stepRef\` parameter to the tool. If you do not pass the \`stepRef\` parameter, a new step will be created and added to the end of the workflow's steps array. You should ONLY pass the \`stepRef\` parameter if you are updating an existing step.
  `,
  liquid: `
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
  `,
};

const contentBlockSchema = z.union([
  z.object({
    type: z.literal("markdown"),
    content: z
      .string()
      .describe("(string): The markdown content of the block."),
  }),
  z.object({
    type: z.literal("html"),
    content: z.string().describe("(string): The HTML content of the block."),
  }),
  z.object({
    type: z.literal("image"),
    url: z.string().describe("(string): The URL of the image."),
  }),
  z.object({
    type: z.literal("button_set"),
    buttons: z
      .array(
        z.object({
          label: z.string().describe("(string): The label of the button."),
          action: z.string().describe("(string): The action of the button."),
          variant: z
            .enum(["solid", "outline"])
            .default("solid")
            .describe(
              "(enum): The variant of the button. Defaults to `solid`."
            ),
        })
      )
      .describe("(array): The buttons for the button set."),
  }),
  z.object({
    type: z.literal("divider"),
  }),
  z.object({
    type: z.literal("partial"),
    key: z.string().describe("(string): The key of the partial to use."),
    name: z.string().describe("(string): The name of the partial."),
    attrs: z
      .record(z.string(), z.string())
      .describe(
        "(object): The attributes for the partial. ALWAYS supply an empty object when you don't know which params are required."
      ),
  }),
]);

const createOrUpdateEmailStepInWorkflow = KnockTool({
  method: "upsert_workflow_email_step",
  name: "Create or update email step in workflow",
  description: `
  Creates or updates an email step in a workflow. Use this tool when you're asked to create an email notification and you need to specify the content of the email.

  ${SHARED_PROMPTS.workflow}

  When you're asked to create an email step, you can either set the HTML content directly or use blocks to build the email. If you're asked to set the HTML content directly, you can use the \`htmlContent\` parameter. We prefer to use blocks.

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

  ${SHARED_PROMPTS.liquid}

  ## Partials

  If you need to reuse content across multiple emails, you can create or reference an existing partial and reference it in the email. You should only use partials if you're instructed to do so.

  When you do need to use a partial in an email, you can use the \`partial\` block and then set the \`key\` to the key of the partial you want to use. If the partial requires any variables, you pass those in the \`attrs\` key.

  ## Writing style

  Unless asked otherwise, you should write content for the email in a concise and formal writing style. Do NOT use complex language or try to over explain. Keep the subject line to 8 words or less.
  `,
  parameters: z.object({
    workflowKey: z
      .string()
      .describe("(string): The key of the workflow to add the step to."),
    stepRef: z
      .string()
      .optional()
      .describe(
        "(string): The reference of the step to update. If not provided, a new step will be created."
      ),
    channelKey: z
      .string()
      .optional()
      .describe(
        "(string): The key of the channel to use for this step. Use `list_channels` to see available channels. If not provided, the first email channel will be used."
      ),
    environment: z
      .string()
      .optional()
      .describe(
        "(string): The environment to operate in. Defaults to `development`."
      ),
    htmlContent: z
      .string()
      .optional()
      .describe(
        "(string): The HTML content of the email template. Use this when not setting blocks."
      ),
    blocks: z
      .array(contentBlockSchema)
      .optional()
      .describe(
        "(array): The blocks for the email step. Use this when you don't need to set HTML directly."
      ),
    layoutKey: z
      .string()
      .describe("(string): The key of the layout to use for the email step."),
    subject: z.string().describe("(string): The subject of the email step."),
  }),
  execute: (knockClient, config) => async (params) => {
    const environment =
      params.environment ?? config.environment ?? "development";

    const workflow = await knockClient.workflows.retrieve(params.workflowKey, {
      environment,
    });

    const emailChannelsPage = await knockClient.channels.list();
    const emailChannels = emailChannelsPage.entries.filter(
      (channel) => channel.type === "email"
    );

    if (!params.channelKey && emailChannels.length === 0) {
      throw new Error("No email channels found");
    }

    return await updateWorkflowWithStep(
      knockClient,
      workflow,
      // @ts-expect-error
      {
        type: "channel",
        channel_key: params.channelKey ?? emailChannels[0].key,
        template: {
          settings: {
            layout_key: params.layoutKey ?? "default",
          },
          subject: params.subject,
          visual_blocks: params.blocks,
          html_content: params.htmlContent,
        } as EmailTemplate,
        ref: params.stepRef ?? generateStepRef("email"),
      },
      environment
    );
  },
});

const createOrUpdateSmsStepInWorkflow = KnockTool({
  method: "upsert_workflow_sms_step",
  name: "Create or update sms step in workflow",
  description: `
  Creates an SMS step in a workflow. Use this tool when you're asked to create an SMS notification and you need to specify the content of the SMS.

  ${SHARED_PROMPTS.workflow}

  ${SHARED_PROMPTS.liquid}
  `,
  parameters: z.object({
    workflowKey: z
      .string()
      .describe("(string): The key of the workflow to add the step to."),
    stepRef: z
      .string()
      .optional()
      .describe(
        "(string): The reference of the step to update. If not provided, a new step will be created."
      ),
    channelKey: z
      .string()
      .optional()
      .describe(
        "(string): The key of the channel to use for this step. Use `list_channels` to see available channels. If not provided, the first SMS channel will be used."
      ),
    environment: z
      .string()
      .optional()
      .describe(
        "(string): The environment to operate in. Defaults to `development`."
      ),
    content: z.string().describe("(string): The content of the SMS."),
  }),
  execute: (knockClient, config) => async (params) => {
    const environment =
      params.environment ?? config.environment ?? "development";

    const workflow = await knockClient.workflows.retrieve(params.workflowKey, {
      environment,
    });

    const smsChannelsPage = await knockClient.channels.list();
    const smsChannels = smsChannelsPage.entries.filter(
      (channel) => channel.type === "sms"
    );

    if (!params.channelKey && smsChannels.length === 0) {
      throw new Error("No SMS channels found");
    }

    return await updateWorkflowWithStep(
      knockClient,
      workflow,
      // @ts-expect-error
      {
        type: "channel",
        channel_key: params.channelKey ?? smsChannels[0].key,
        template: {
          text_body: params.content,
        } as SMSTemplate,
        ref: params.stepRef ?? generateStepRef("sms"),
      },
      environment
    );
  },
});

const createOrUpdatePushStepInWorkflow = KnockTool({
  method: "upsert_workflow_push_step",
  name: "Create or update push step in workflow",
  description: `
  Creates a push step in a workflow. Use this tool when you're asked to create a push notification and you need to specify the content of the push notification.

  ${SHARED_PROMPTS.workflow}

  ${SHARED_PROMPTS.liquid}

  Be terse in your writing as this is a push notification and should be direct and to the point.
  `,
  parameters: z.object({
    workflowKey: z
      .string()
      .describe("(string): The key of the workflow to add the step to."),
    stepRef: z
      .string()
      .optional()
      .describe(
        "(string): The reference of the step to update. If not provided, a new step will be created."
      ),
    channelKey: z
      .string()
      .optional()
      .describe(
        "(string): The key of the channel to use for this step. Use `list_channels` to see available channels. If not provided, the first push channel will be used."
      ),
    environment: z
      .string()
      .optional()
      .describe(
        "(string): The environment to operate in. Defaults to `development`."
      ),
    title: z.string().describe("(string): The title of the push notification."),
    content: z
      .string()
      .describe("(string): The content (body) of the push notification."),
  }),
  execute: (knockClient, config) => async (params) => {
    const environment =
      params.environment ?? config.environment ?? "development";

    const workflow = await knockClient.workflows.retrieve(params.workflowKey, {
      environment,
    });

    const pushChannelsPage = await knockClient.channels.list();
    const pushChannels = pushChannelsPage.entries.filter(
      (channel) => channel.type === "push"
    );

    if (!params.channelKey && pushChannels.length === 0) {
      throw new Error("No push channels found");
    }

    return await updateWorkflowWithStep(
      knockClient,
      workflow,
      // @ts-expect-error
      {
        type: "channel",
        channel_key: params.channelKey ?? pushChannels[0].key,
        template: {
          title: params.title,
          text_body: params.content,
          settings: {
            delivery_type: "content",
          },
        } as PushTemplate,
        ref: params.stepRef ?? generateStepRef("push"),
      },
      environment
    );
  },
});

// TODO: Add support for action buttons, not just the action URL
const createOrUpdateInAppFeedStepInWorkflow = KnockTool({
  method: "upsert_workflow_in_app_step",
  name: "Create or update in app feed step in workflow",
  description: `
  Creates an in app feed step in a workflow. Use this tool when you're asked to create an in app feed notification and you need to specify the content of the in app feed notification.

  ${SHARED_PROMPTS.workflow}

  ${SHARED_PROMPTS.liquid}
  `,
  parameters: z.object({
    workflowKey: z
      .string()
      .describe("(string): The key of the workflow to add the step to."),
    stepRef: z
      .string()
      .optional()
      .describe(
        "(string): The reference of the step to update. If not provided, a new step will be created."
      ),
    channelKey: z
      .string()
      .optional()
      .describe(
        "(string): The key of the channel to use for this step. Use `list_channels` to see available channels. If not provided, the first in-app feed channel will be used."
      ),
    environment: z
      .string()
      .optional()
      .describe(
        "(string): The environment to operate in. Defaults to `development`."
      ),
    actionUrl: z
      .string()
      .describe(
        "(string): The URL to navigate to when the in app feed is tapped."
      ),
    body: z
      .string()
      .describe("(string): The markdown content of the in app feed."),
  }),
  execute: (knockClient, config) => async (params) => {
    const environment =
      params.environment ?? config.environment ?? "development";

    const workflow = await knockClient.workflows.retrieve(params.workflowKey, {
      environment,
    });

    const inAppChannelsPage = await knockClient.channels.list();
    const inAppChannels = inAppChannelsPage.entries.filter(
      (channel) => channel.type === "in_app_feed"
    );

    if (!params.channelKey && inAppChannels.length === 0) {
      throw new Error("No in app channels found");
    }

    return await updateWorkflowWithStep(
      knockClient,
      workflow,
      // @ts-expect-error
      {
        type: "channel",
        channel_key: params.channelKey ?? inAppChannels[0].key,
        template: {
          action_url: params.actionUrl,
          markdown_body: params.body,
        } as InAppFeedTemplate,
        ref: params.stepRef ?? generateStepRef("in_app_feed"),
      },
      environment
    );
  },
});

const createOrUpdateChatStepInWorkflow = KnockTool({
  method: "upsert_workflow_chat_step",
  name: "Create or update chat step in workflow",
  description: `
  Creates a chat step in a workflow. Use this tool when you're asked to create a chat, Slack, Discord, or Microsoft Teams notification and you need to specify the content of the chat notification.

  ${SHARED_PROMPTS.workflow}

  ${SHARED_PROMPTS.liquid}
  `,
  parameters: z.object({
    workflowKey: z
      .string()
      .describe("(string): The key of the workflow to add the step to."),
    stepRef: z
      .string()
      .describe(
        "(string): The reference of the step to update. If not provided, a new step will be created."
      ),
    channelKey: z
      .string()
      .optional()
      .describe(
        "(string): The key of the channel to use for this step. Use `list_channels` to see available channels. If not provided, the first chat channel will be used."
      ),
    environment: z
      .string()
      .optional()
      .describe(
        "(string): The environment to operate in. Defaults to `development`."
      ),
    body: z
      .string()
      .describe("(string): The markdown content of the notification."),
  }),
  execute: (knockClient, config) => async (params) => {
    const environment =
      params.environment ?? config.environment ?? "development";

    const workflow = await knockClient.workflows.retrieve(params.workflowKey, {
      environment,
    });

    const chatChannelsPage = await knockClient.channels.list();
    const chatChannels = chatChannelsPage.entries.filter(
      (channel) => channel.type === "chat"
    );

    if (!params.channelKey && chatChannels.length === 0) {
      throw new Error("No chat channels found");
    }

    return await updateWorkflowWithStep(
      knockClient,
      workflow,
      // @ts-expect-error
      {
        type: "channel",
        channel_key: params.channelKey ?? chatChannels[0].key,
        template: {
          markdown_body: params.body,
        } as ChatTemplate,
        ref: params.stepRef ?? generateStepRef("chat"),
      },
      environment
    );
  },
});

const createOrUpdateDelayStepInWorkflow = KnockTool({
  method: "upsert_workflow_delay_step",
  name: "Create or update delay step in workflow",
  description: `
  Creates a delay step in a workflow. Use this tool when you're asked to add a delay to the workflow that pauses, or waits for a period of time before continuing.

  ${SHARED_PROMPTS.workflow}

  Delays are specified in "unit" and "value" pairs. The only valid units are "seconds", "minutes", "hours", and "days".

  <example>
  {
    "delayValue": 5,
    "delayUnit": "minutes"
  }
  </example>
  `,
  parameters: z.object({
    workflowKey: z
      .string()
      .describe("(string): The key of the workflow to add the step to."),
    stepRef: z
      .string()
      .optional()
      .describe(
        "(string): The reference of the step to update. If not provided, a new step will be created."
      ),
    environment: z
      .string()
      .optional()
      .describe(
        "(string): The environment to operate in. Defaults to `development`."
      ),
    delayValue: z.number().describe("(number): The value of the delay."),
    delayUnit: z
      .enum(["seconds", "minutes", "hours", "days"])
      .describe("(enum): The unit of the delay."),
  }),
  execute: (knockClient, config) => async (params) => {
    const environment =
      params.environment ?? config.environment ?? "development";

    const workflow = await knockClient.workflows.retrieve(params.workflowKey, {
      environment,
    });

    const workflowParams: WorkflowUpsertParams = {
      environment,
      workflow: {
        ...workflow,
        steps: [
          // @ts-expect-error
          ...workflow.steps,
          // @ts-expect-error
          {
            type: "delay",
            settings: {
              delay_for: {
                value: params.delayValue,
                unit: params.delayUnit,
              },
            },
            ref: params.stepRef ?? generateStepRef("delay"),
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

const createOrUpdateBatchStepInWorkflow = KnockTool({
  method: "upsert_workflow_batch_step",
  name: "Create or update batch step in workflow",
  description: `
  Creates a batch step in a workflow. Use this tool when you're asked to create a batch step or asked to add digesting behavior to a workflow. The batch step collects multiple workflow triggers for a single recipient over a period of time and then flushes the content to the next step.

  ${SHARED_PROMPTS.workflow}

  Batch windows are specified in "unit" and "value" pairs. The only valid units are "seconds", "minutes", "hours", and "days".

  <example>
  {
    "batchWindow": {
      "value": 5,
      "unit": "minutes"
    }
  }
  </example>
  `,
  parameters: z.object({
    workflowKey: z
      .string()
      .describe("(string): The key of the workflow to add the step to."),
    stepRef: z
      .string()
      .optional()
      .describe(
        "(string): The reference of the step to update. If not provided, a new step will be created."
      ),
    environment: z
      .string()
      .optional()
      .describe(
        "(string): The environment to operate in. Defaults to `development`."
      ),
    batchWindow: z.object({
      value: z.number().describe("(number): The value of the batch window."),
      unit: z
        .enum(["seconds", "minutes", "hours", "days"])
        .describe("(enum): The unit of the batch window."),
    }),
  }),
  execute: (knockClient, config) => async (params) => {
    const environment =
      params.environment ?? config.environment ?? "development";

    const workflow = await knockClient.workflows.retrieve(params.workflowKey, {
      environment,
    });

    return await updateWorkflowWithStep(
      knockClient,
      workflow,
      // @ts-expect-error
      {
        type: "batch",
        settings: {
          batch_window: {
            value: params.batchWindow.value,
            unit: params.batchWindow.unit,
          },
        },
        ref: params.stepRef ?? generateStepRef("batch"),
      },
      environment
    );
  },
});

const workflowStepTools = {
  // Channel steps
  createOrUpdateEmailStepInWorkflow,
  createOrUpdateSmsStepInWorkflow,
  createOrUpdatePushStepInWorkflow,
  createOrUpdateInAppFeedStepInWorkflow,
  createOrUpdateChatStepInWorkflow,

  // Function steps
  createOrUpdateDelayStepInWorkflow,
  createOrUpdateBatchStepInWorkflow,
};

export { workflowStepTools };
