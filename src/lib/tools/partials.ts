import { Partial } from "@knocklabs/mgmt/resources/partials.js";
import { z } from "zod";

import { KnockTool } from "@/lib/knock-tool.js";

/**
 * A slimmed down version of the Partial resource that is easier to work with in the LLM.
 */
type SerializedPartial = {
  key: string;
  type: Partial["type"];
  name: string;
  description?: string;
};

function serializePartial(partial: Partial): SerializedPartial {
  return {
    key: partial.key,
    type: partial.type,
    name: partial.name,
    description: partial.description,
  };
}

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
    const allPartials: SerializedPartial[] = [];
    for await (const partial of knockClient.partials.list({
      environment: params.environment ?? config.environment ?? "development",
    })) {
      allPartials.push(serializePartial(partial));
    }
    return allPartials;
  },
});

const getPartial = KnockTool({
  method: "get_partial",
  name: "Get partial",
  description: `
  Get a partial by its key. Use this tool when you need to know if a specific partial exists by key.
  `,
  parameters: z.object({
    environment: z
      .string()
      .optional()
      .describe(
        "(string): The environment to get the partial for. Defaults to `development`."
      ),
    key: z.string().describe("(string): The key of the partial to get."),
  }),
  execute: (knockClient, config) => async (params) => {
    const partial = await knockClient.partials.retrieve(params.key, {
      environment: params.environment ?? config.environment ?? "development",
    });

    return serializePartial(partial);
  },
});

const createOrUpdatePartial = KnockTool({
  method: "upsert_partial",
  name: "Upsert partial",
  description: `
  Create or update a partial. A partial is a reusable piece of content that can be used in a template. Use this tool when you need to create a new partial or update an existing one.

  When working with a partial you must chose the type of the partial. The type determines the format of the content. If you're working with an email template, you should use the "html" or "markdown" type.

  If you need to work with dynamic content in your partial you can use liquid syntax. Liquid is a templating language that is supported in Knock. You can supply a variable like {{ some_variable }} in the content and it will be replaced with the actual value when the partial is used in a template.

  <example>
  {
    "name": "Greeting",
    "key": "greeting",
    "type": "html",
    "content": "<div>Hello, {{ recipient_name }}</div>"
  }
  </example>

  Changes to a partial MUST be committed before they can be used in a template.
  `,
  parameters: z.object({
    environment: z
      .string()
      .optional()
      .describe(
        "(string): The environment to upsert the partial for. Defaults to `development`."
      ),
    key: z.string().describe("(string): The key of the partial to upsert."),
    name: z.string().describe("(string): The name of the partial."),
    description: z
      .string()
      .optional()
      .describe("(string): The description of the partial."),
    content: z.string().describe("(string): The content of the partial."),
    type: z
      .enum(["html", "text", "json", "markdown"])
      .describe("(string): The type of the partial."),
  }),
  execute: (knockClient, config) => async (params) => {
    const partial = await knockClient.partials.upsert(params.key, {
      environment: params.environment ?? config.environment ?? "development",
      partial: {
        name: params.name,
        description: params.description,
        content: params.content,
        type: params.type,
      },
    });
    return serializePartial(partial.partial);
  },
});

export const partials = {
  getPartial,
  listPartials,
  createOrUpdatePartial,
};

export const permissions = {
  read: ["getPartial", "listPartials"],
  manage: ["createOrUpdatePartial"],
};
