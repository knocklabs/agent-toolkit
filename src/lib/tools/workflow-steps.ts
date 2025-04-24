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
  const workflowParams: WorkflowUpsertParams = {
    environment,
    workflow: {
      ...workflow,
      steps: [...workflow.steps, step],
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
  To use this tool, you MUST first create a workflow using the \`createWorkflow\` tool, or get an existing workflow using the \`getWorkflow\` tool. You ONLY need to pass the workflow key to this tool and the sms step will be added to the end of the workflow's steps array.
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

const createEmailStepInWorkflow = KnockTool({
  method: "create_email_step_in_workflow",
  name: "Create email step in workflow",
  description: `
  Creates an email step in a workflow. Use this tool when you're asked to create an email notification and you need to specify the content of the email.

  ${SHARED_PROMPTS.workflow}

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
    blocks: z
      .array(z.any())
      .describe("(array): The blocks for the email step."),
    subject: z.string().describe("(string): The subject of the email step."),
  }),
  execute: (knockClient, config) => async (params) => {
    const workflow = await knockClient.workflows.retrieve(params.workflowKey, {
      environment: config.environment ?? "development",
    });

    const emailChannelsPage = await knockClient.channels.list();
    const emailChannels = emailChannelsPage.entries.filter(
      (channel) => channel.type === "email"
    );

    if (emailChannels.length === 0) {
      throw new Error("No email channels found");
    }

    return await updateWorkflowWithStep(
      knockClient,
      workflow,
      // @ts-expect-error
      {
        type: "channel",
        channel_key: emailChannels[0].key,
        template: {
          settings: {
            layout_key: "default",
          },
          subject: params.subject,
          visual_blocks: params.blocks,
        } as EmailTemplate,
        ref: generateStepRef("email"),
      },
      config.environment ?? "development"
    );
  },
});

const createSmsStepInWorkflow = KnockTool({
  method: "create_sms_step_in_workflow",
  name: "Create sms step in workflow",
  description: `
  Creates an SMS step in a workflow. Use this tool when you're asked to create an SMS notification and you need to specify the content of the SMS. 
  
  ${SHARED_PROMPTS.workflow}

  ${SHARED_PROMPTS.liquid}
  `,
  parameters: z.object({
    workflowKey: z
      .string()
      .describe("(string): The key of the workflow to add the step to."),
    content: z.string().describe("(string): The content of the SMS."),
  }),
  execute: (knockClient, config) => async (params) => {
    const workflow = await knockClient.workflows.retrieve(params.workflowKey, {
      environment: config.environment ?? "development",
    });

    const smsChannelsPage = await knockClient.channels.list();
    const smsChannels = smsChannelsPage.entries.filter(
      (channel) => channel.type === "sms"
    );

    if (smsChannels.length === 0) {
      throw new Error("No SMS channels found");
    }

    return await updateWorkflowWithStep(
      knockClient,
      workflow,
      // @ts-expect-error
      {
        type: "channel",
        channel_key: smsChannels[0].key,
        template: {
          text_body: params.content,
        } as SMSTemplate,
        ref: generateStepRef("sms"),
      },
      config.environment ?? "development"
    );
  },
});

const createPushStepInWorkflow = KnockTool({
  method: "create_push_step_in_workflow",
  name: "Create push step in workflow",
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
    title: z.string().describe("(string): The title of the push notification."),
    content: z
      .string()
      .describe("(string): The content (body) of the push notification."),
  }),
  execute: (knockClient, config) => async (params) => {
    const workflow = await knockClient.workflows.retrieve(params.workflowKey, {
      environment: config.environment ?? "development",
    });

    const pushChannelsPage = await knockClient.channels.list();
    const pushChannels = pushChannelsPage.entries.filter(
      (channel) => channel.type === "push"
    );

    if (pushChannels.length === 0) {
      throw new Error("No push channels found");
    }

    return await updateWorkflowWithStep(
      knockClient,
      workflow,
      // @ts-expect-error
      {
        type: "channel",
        channel_key: pushChannels[0].key,
        template: {
          title: params.title,
          text_body: params.content,
        } as PushTemplate,
        ref: generateStepRef("push"),
      },
      config.environment ?? "development"
    );
  },
});

// TODO: Add support for action buttons, not just the action URL
const createInAppFeedStepInWorkflow = KnockTool({
  method: "create_in_app_feed_step_in_workflow",
  name: "Create in app feed step in workflow",
  description: `
  Creates an in app feed step in a workflow. Use this tool when you're asked to create an in app feed notification and you need to specify the content of the in app feed notification.  

  ${SHARED_PROMPTS.workflow}

  ${SHARED_PROMPTS.liquid}
  `,
  parameters: z.object({
    workflowKey: z
      .string()
      .describe("(string): The key of the workflow to add the step to."),
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
    const workflow = await knockClient.workflows.retrieve(params.workflowKey, {
      environment: config.environment ?? "development",
    });

    const inAppChannelsPage = await knockClient.channels.list();
    const inAppChannels = inAppChannelsPage.entries.filter(
      (channel) => channel.type === "in_app_feed"
    );

    if (inAppChannels.length === 0) {
      throw new Error("No in app channels found");
    }

    return await updateWorkflowWithStep(
      knockClient,
      workflow,
      // @ts-expect-error
      {
        type: "channel",
        channel_key: inAppChannels[0].key,
        template: {
          action_url: params.actionUrl,
          markdown_body: params.body,
        } as InAppFeedTemplate,
        ref: generateStepRef("in_app_feed"),
      },
      config.environment ?? "development"
    );
  },
});

const createChatStepInWorkflow = KnockTool({
  method: "create_chat_step_in_workflow",
  name: "Create chat step in workflow",
  description: `
  Creates a chat step in a workflow. Use this tool when you're asked to create a chat, Slack, Discord, or Microsoft Teams notification and you need to specify the content of the chat notification.

  ${SHARED_PROMPTS.workflow}

  ${SHARED_PROMPTS.liquid}
  `,
  parameters: z.object({
    workflowKey: z
      .string()
      .describe("(string): The key of the workflow to add the step to."),
    body: z
      .string()
      .describe("(string): The markdown content of the notification."),
  }),
  execute: (knockClient, config) => async (params) => {
    const workflow = await knockClient.workflows.retrieve(params.workflowKey, {
      environment: config.environment ?? "development",
    });

    const chatChannelsPage = await knockClient.channels.list();
    const chatChannels = chatChannelsPage.entries.filter(
      (channel) => channel.type === "chat"
    );

    if (chatChannels.length === 0) {
      throw new Error("No chat channels found");
    }

    return await updateWorkflowWithStep(
      knockClient,
      workflow,
      // @ts-expect-error
      {
        type: "channel",
        channel_key: chatChannels[0].key,
        template: {
          markdown_body: params.body,
        } as ChatTemplate,
        ref: generateStepRef("chat"),
      },
      config.environment ?? "development"
    );
  },
});

const createDelayStepInWorkflow = KnockTool({
  method: "create_delay_step_in_workflow",
  name: "Create delay step in workflow",
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
    delayValue: z.number().describe("(number): The value of the delay."),
    delayUnit: z
      .enum(["seconds", "minutes", "hours", "days"])
      .describe("(enum): The unit of the delay."),
  }),
  execute: (knockClient, config) => async (params) => {
    const workflow = await knockClient.workflows.retrieve(params.workflowKey, {
      environment: config.environment ?? "development",
    });

    const workflowParams: WorkflowUpsertParams = {
      environment: config.environment ?? "development",
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
            ref: generateStepRef("delay"),
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

const createBatchStepInWorkflow = KnockTool({
  method: "create_batch_step_in_workflow",
  name: "Create batch step in workflow",
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
    batchWindow: z.object({
      value: z.number().describe("(number): The value of the batch window."),
      unit: z
        .enum(["seconds", "minutes", "hours", "days"])
        .describe("(enum): The unit of the batch window."),
    }),
  }),
  execute: (knockClient, config) => async (params) => {
    const workflow = await knockClient.workflows.retrieve(params.workflowKey, {
      environment: config.environment ?? "development",
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
        ref: generateStepRef("batch"),
      },
      config.environment ?? "development"
    );
  },
});

const workflowStepTools = {
  // Channel steps
  createEmailStepInWorkflow,
  createSmsStepInWorkflow,
  createPushStepInWorkflow,
  createInAppFeedStepInWorkflow,
  createChatStepInWorkflow,

  // Function steps
  createDelayStepInWorkflow,
  createBatchStepInWorkflow,
};

export { workflowStepTools };
