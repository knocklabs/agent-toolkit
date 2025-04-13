import { z } from "zod";

import { KnockTool } from "../knock-tool.js";

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
    messageId: z.string().describe("(string): The messageId of the message to retrieve."),
  }),
  execute: (knockClient) => async (params) => {
    const publicClient = await knockClient.publicApi(params.environment);
    return await publicClient.messages.getContent(params.messageId);
  },
});

export const messages = {
  getMessageContent,
};

export const permissions = {
  read: ["getMessageContent"],
};
