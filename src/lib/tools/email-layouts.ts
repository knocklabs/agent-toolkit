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

export const emailLayouts = {
  listEmailLayouts,
};

export const permissions = {
  read: ["listEmailLayouts"],
};
