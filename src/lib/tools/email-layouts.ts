import { EmailLayout } from "@knocklabs/mgmt/resources/email-layouts.js";
import { z } from "zod";

import { KnockTool } from "../knock-tool.js";

/**
 * A slimmed down version of the EmailLayout resource that is easier to work with in the LLM.
 */
type SerializedEmailLayout = {
  key: string;
  name: string;
};

function serializeEmailLayoutResponse(
  emailLayout: EmailLayout
): SerializedEmailLayout {
  return {
    key: emailLayout.key,
    name: emailLayout.name,
  };
}

const listEmailLayouts = KnockTool({
  method: "list_email_layouts",
  name: "List email layouts",
  description: `List all email layouts within the environment given. Returns information about the email layout, including the name and the key. 
  
  Use this tool when building a workflow that is building an email notification when you need to know the available email layouts.`,
  parameters: z.object({
    environment: z
      .string()
      .optional()
      .describe(
        "(string): The environment to list email layouts for. Defaults to `development`."
      ),
  }),
  execute: (knockClient, config) => async (params) => {
    const allEmailLayouts: SerializedEmailLayout[] = [];
    for await (const emailLayout of knockClient.emailLayouts.list({
      environment: params.environment ?? config.environment ?? "development",
    })) {
      allEmailLayouts.push(serializeEmailLayoutResponse(emailLayout));
    }
    return allEmailLayouts;
  },
});

const createOrUpdateEmailLayout = KnockTool({
  method: "create_or_update_email_layout",
  name: "Create or update email layout",
  description: `Create or update a new email layout within the environment given. Use this tool when you need to define shared pieces of content across multiple email templates, like a header/footer. The email layout will be used to render the email template.

  Here are the rules for creating an email layout:

  - Every email layout must have a \`{{ content }}\` tag. This is where the content of the email will be injected.
  - You must set both an HTML and text version of the email layout.
  - CSS should be included in the HTML version of the email layout under <style> tags.
  `,
  parameters: z.object({
    environment: z
      .string()
      .optional()
      .describe(
        "(string): The environment to create or update the email layout for. Defaults to `development`."
      ),
    key: z
      .string()
      .describe("(string): The key of the email layout to create or update."),
    name: z.string().describe("(string): The name of the email layout."),
    htmlContent: z
      .string()
      .describe("(string): The HTML content of the email layout."),
    textContent: z
      .string()
      .describe("(string): The text content of the email layout."),
  }),
  execute: (knockClient, config) => async (params) => {
    const response = await knockClient.emailLayouts.upsert(params.key, {
      environment: params.environment ?? config.environment ?? "development",
      email_layout: {
        name: params.name,
        html_layout: params.htmlContent,
        text_layout: params.textContent,
      },
    });

    return serializeEmailLayoutResponse(response.email_layout);
  },
});

export const emailLayouts = {
  listEmailLayouts,
  createOrUpdateEmailLayout,
};

export const permissions = {
  read: ["listEmailLayouts"],
  manage: ["createOrUpdateEmailLayout"],
};
