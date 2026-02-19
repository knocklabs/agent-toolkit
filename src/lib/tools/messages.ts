import { z } from "zod";

import { KnockTool } from "../knock-tool.js";

const getMessage = KnockTool({
  method: "get_message",
  name: "Get message",
  description: `
  Retrieves a single message by its ID, including its current status and engagement statuses (e.g. seen, read, interacted, link_clicked). Use this tool when you need to check the delivery status or engagement state of a specific message.
  `,
  parameters: z.object({
    environment: z
      .string()
      .optional()
      .describe(
        "(string): The environment to retrieve the message from. Defaults to `development`."
      ),
    messageId: z
      .string()
      .describe("(string): The ID of the message to retrieve."),
  }),
  execute: (knockClient) => async (params) => {
    const publicClient = await knockClient.publicApi(params.environment);
    return await publicClient.messages.get(params.messageId);
  },
});

const getMessageContent = KnockTool({
  method: "get_message_content",
  name: "Get message content",
  description: `
  Retrieves the complete contents of a single message, specified by the messageId. The message contents includes the rendered template that was sent to the recipient. Use this tool when you want to surface information about the emails, SMS, and push notifications that were sent to a user.
  `,
  parameters: z.object({
    environment: z
      .string()
      .optional()
      .describe(
        "(string): The environment to retrieve the message from. Defaults to `development`."
      ),
    messageId: z
      .string()
      .describe("(string): The messageId of the message to retrieve."),
  }),
  execute: (knockClient) => async (params) => {
    const publicClient = await knockClient.publicApi(params.environment);
    return await publicClient.messages.getContent(params.messageId);
  },
});

const getMessageDeliveryLogs = KnockTool({
  method: "get_message_delivery_logs",
  name: "Get message delivery logs",
  description: `
  Retrieves the delivery logs for a specific message. Delivery logs contain details about each delivery attempt, including any errors that occurred. Use this tool when you need to debug why a message was not delivered or to inspect delivery attempt details.
  `,
  parameters: z.object({
    environment: z
      .string()
      .optional()
      .describe(
        "(string): The environment to retrieve the delivery logs from. Defaults to `development`."
      ),
    messageId: z
      .string()
      .describe(
        "(string): The ID of the message to retrieve delivery logs for."
      ),
  }),
  execute: (knockClient) => async (params) => {
    const publicClient = await knockClient.publicApi(params.environment);
    return await publicClient.messages.listDeliveryLogs(params.messageId);
  },
});

const getMessageEvents = KnockTool({
  method: "get_message_events",
  name: "Get message events",
  description: `
  Retrieves the event timeline for a specific message. Events include delivery, bounce, open, click, and other engagement events. Use this tool when you need to see the full lifecycle of a message.
  `,
  parameters: z.object({
    environment: z
      .string()
      .optional()
      .describe(
        "(string): The environment to retrieve the message events from. Defaults to `development`."
      ),
    messageId: z
      .string()
      .describe(
        "(string): The ID of the message to retrieve events for."
      ),
  }),
  execute: (knockClient) => async (params) => {
    const publicClient = await knockClient.publicApi(params.environment);
    return await publicClient.messages.listEvents(params.messageId);
  },
});

export const messages = {
  getMessage,
  getMessageContent,
  getMessageDeliveryLogs,
  getMessageEvents,
};

export const permissions = {
  read: ["getMessage", "getMessageContent", "getMessageDeliveryLogs", "getMessageEvents"],
};
