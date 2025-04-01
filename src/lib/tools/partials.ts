import { KnockTool } from "../knock-tool.js";
import { z } from "zod";
import { Partial } from "@knocklabs/mgmt/resources/partials.js";

const listPartials = KnockTool({
  method: "list_partials",
  name: "List partials",
  description: `
  List all partials within the environment given. Partials provide common building blocks for notification templates. Returns information about the partial, including the name and the key.  
  Use this tool when you need to know the available partials for the environment, like when building a notification template and wanting to use a partial to build the template.`,
  parameters: z.object({
    environment: z
      .string()
      .optional()
      .describe(
        "(string): The environment to list partials for. Defaults to `development`."
      ),
  }),
  execute: (knockClient, config) => async (params) => {
    const allPartials: Partial[] = [];
    for await (const partial of knockClient.partials.list({
      environment: params.environment ?? config.environment ?? "development",
    })) {
      allPartials.push(partial);
    }
    return allPartials;
  },
});

export const partials = {
  listPartials,
};

export const permissions = {
  read: ["listPartials"],
};
