import KnockMgmt from "@knocklabs/mgmt";
import { Guide } from "@knocklabs/mgmt/resources.js";
import { z } from "zod";

import { KnockTool } from "../knock-tool.js";

import { conditionSchema } from "./shared.js";

/**
 * A slimmed down version of the Guide resource that is easier to work with in the LLM.
 */
type SerializedGuide = Pick<
  Guide,
  "key" | "name" | "description" | "type" | "active"
> & {
  steps: {
    ref: string;
    name: string;
    schemaKey: string;
    schemaVariantKey: string;
    schemaContent?: Record<string, any>;
  }[];
};

function serializeGuide(guide: Guide): SerializedGuide {
  return {
    key: guide.key,
    name: guide.name,
    description: guide.description,
    type: guide.type,
    active: guide.active,
    steps: (guide.steps ?? []).map((step) => ({
      ref: step.ref,
      name: step.name!,
      schemaKey: step.schema_key,
      schemaVariantKey: step.schema_variant_key,
      schemaContent: step.values,
    })),
  };
}

const listGuides = KnockTool({
  method: "list_guides",
  name: "List guides",
  description: `
  List all guides available for the given environment. Returns structural information about the guides, including the key, name, description, type, and status.

  Use this tool when you need to understand which guides are available in the environment.
  `,
  parameters: z.object({
    environment: z
      .string()
      .optional()
      .describe(
        "(string): The environment to list guides for. Defaults to `development`."
      ),
    page_size: z
      .number()
      .optional()
      .describe("(number): The number of guides to return per page."),
    after: z
      .string()
      .optional()
      .describe("(string): The cursor to use for pagination."),
  }),
  execute: (knockClient, config) => async (params) => {
    const allGuides: SerializedGuide[] = [];
    const listParams = {
      environment: params.environment ?? config.environment ?? "development",
      page_size: params.page_size,
      after: params.after,
    };
    for await (const guide of knockClient.guides.list(listParams)) {
      allGuides.push(serializeGuide(guide));
    }
    return allGuides;
  },
});

const getGuide = KnockTool({
  method: "get_guide",
  name: "Get guide",
  description: `
  Get a guide by its key. Returns structural information about the guide, including the key, name, description, type, and status.

  Use this tool when you need to retrieve information about a specific guide.
  `,
  parameters: z.object({
    environment: z
      .string()
      .optional()
      .describe(
        "(string): The environment to get the guide for. Defaults to `development`."
      ),
    guideKey: z.string().describe("(string): The key of the guide to get."),
    hide_uncommitted_changes: z
      .boolean()
      .optional()
      .describe(
        "(boolean): Whether to hide uncommitted changes and return only published version."
      ),
  }),
  execute: (knockClient, config) => async (params) => {
    const guide = await knockClient.guides.retrieve(params.guideKey, {
      environment: params.environment ?? config.environment ?? "development",
      hide_uncommitted_changes: params.hide_uncommitted_changes,
    });
    return serializeGuide(guide);
  },
});

const createOrUpdateGuide = KnockTool({
  method: "upsert_guide",
  name: "Upsert guide",
  description: `
  Create or update a guide. A guide defines an in-app guide that can be displayed to users based on priority and other conditions.

  Use this tool when you need to create a new guide or update an existing one. The guide will be created with the specified configuration.

  Note: This endpoint only operates on guides in the "development" environment.

  ## Guide step schema

  When working with guide steps, you must use a \`schemaKey\` and \`schemaVariantKey\` to reference the message type schema that the step's content conforms to. You can use the \`list_message_types\` tool to get a list of available message types and the available variants for that message type.

  You **must** supply a \`schemaContent\` that sets the content for each of the fields in the \`fields\` object inside of the message type schema variant you select.

  For example, if you have a message type schema with a \`fields\` object that looks like this:

  \`\`\`json
  {
    "fields": {
      "title": {
        "type": "string",
        "required": true
      }
    }
  }
  \`\`\`

  You would need to supply a \`schemaContent\` that looks like this:

  \`\`\`json
  {
    "title": "Hello, world!"
  }
  \`\`\`

  ### Guide targeting

  By default, a guide will target all users. If you want to target users with specific attributes, you can use \`targetPropertyConditions\` to describe the targeting conditions.

  When using targeting conditions, you can use the following properties:

  - \`recipient\`: Use a property on the recipient
  - \`data\`: Use data coming from the application
  - \`tenant\`: Use a property on the tenant

  For example, if you want to target users with the email \`john.doe@example.com\`, you would supply the following targeting conditions:

  \`\`\`json
  [
    { "operator": "equal_to", "argument": "john.doe@example.com", "variable": "recipient.email" }
  ]
  \`\`\`

  ### Activation URL patterns

  You can supply a list of activation URL patterns to describe where in your application the guide should be shown. Each activation pattern is a directive that describes whether the guide should be shown or hidden based on the pathname and/or search (query string) of the page. Each pattern must include at least one of \`pathname\` or \`search\` (both may be provided together).

  For example, if you want to show the guide on all pages except for the \`admin\` path, you would supply the following activation URL patterns:

  \`\`\`json
  [
    { "directive": "allow", "pathname": "*" },
    { "directive": "block", "pathname": "/admin" }
  ]
  \`\`\`

  You can also match on the query string using \`search\`. For example, to show the guide only when the URL has a \`tour=welcome\` query parameter:

  \`\`\`json
  [
    { "directive": "allow", "search": "*tour=welcome*" }
  ]
  \`\`\`

  You can combine \`pathname\` and \`search\` in a single rule to match both. For example, to show the guide only on \`/dashboard\` when \`tab=overview\` is present:

  \`\`\`json
  [
    { "directive": "allow", "pathname": "/dashboard", "search": "*tab=overview*" }
  ]
  \`\`\`
  `,
  parameters: z.object({
    environment: z
      .string()
      .optional()
      .describe(
        "(string): The environment to upsert the guide for. Defaults to `development`."
      ),
    guideKey: z
      .string()
      .min(3)
      .max(255)
      .regex(/^[a-zA-Z0-9_-]+$/)
      .transform((val) => val.toLowerCase())
      .describe(
        "(string): The key of the guide to upsert. Must be at minimum 3 characters and at maximum 255 characters in length. Must be in the format of ^[a-zA-Z0-9_-]+$. Uppercase characters will be normalized to lowercase."
      ),
    name: z
      .string()
      .min(1)
      .max(255)
      .describe(
        "(string): A name for the guide. Must be at maximum 255 characters in length."
      ),
    channelKey: z
      .string()
      .optional()
      .describe(
        "(string): The key of the channel in which the guide exists. Defaults to `knock-guide`."
      )
      .default("knock-guide"),
    description: z
      .string()
      .max(280)
      .optional()
      .describe(
        "(string): An arbitrary string attached to a guide object. Maximum of 280 characters allowed."
      ),
    step: z
      .object({
        name: z.string().describe("(string): The name of the step.").optional(),
        ref: z
          .string()
          .describe("(string): The unique identifier of the step.")
          .optional()
          .default("step_1"),
        schemaKey: z
          .string()
          .min(1)
          .describe(
            "(string): The key of the message type to use for the step's content. Note, Knock provides out-of-the-box message types: `banner`, `card`, and `modal` in addition to any user created ones."
          ),
        schemaVariantKey: z
          .string()
          .describe(
            "(string): The key of the schema variant that the step's content conforms to."
          )
          .optional()
          .default("default"),
        schemaContent: z
          .record(z.string(), z.any())
          .describe(
            "(object): A map of values that make up the step's content. Each value must conform to its respective template schema field settings."
          ),
      })
      .describe("(object): The guide step to upsert."),
    targetPropertyConditions: z
      .array(conditionSchema)
      .optional()
      .describe(
        "(array): A list of target conditions to be met for the guide to be shown to a user. Conditions are joined as AND operations."
      ),
    activationUrlPatterns: z
      .array(
        z
          .object({
            directive: z
              .enum(["allow", "block"])
              .describe(
                "(string): The directive to apply to the activation URL rule (allow or block)."
              ),
            pathname: z
              .string()
              .min(1)
              .optional()
              .describe(
                "(string): The URL pathname pattern to match against. Must be a valid URI path."
              ),
            search: z
              .string()
              .min(1)
              .optional()
              .describe(
                "(string): The URL query string pattern to match against (without the leading '?'). Supports URLPattern API syntax."
              ),
          })
          .refine(
            (data) => data.pathname !== undefined || data.search !== undefined,
            {
              message:
                "At least one of `pathname` or `search` must be provided.",
            }
          )
      )
      .optional()
      .describe(
        "(array): A list of activation URL rules that describe where in your application the guide should be shown."
      ),
  }),
  execute: (knockClient, config) => async (params) => {
    // Attempt to fetch the message type to ensure it exists
    const messageType = await knockClient.messageTypes.retrieve(
      params.step.schemaKey,
      {
        environment: params.environment ?? config.environment ?? "development",
      }
    );
    if (!messageType) {
      throw new Error(`Message type ${params.step.schemaKey} not found`);
    }

    // Ensure that the schema variant exists
    const schemaVariant = messageType.variants.find(
      (variant) => variant.key === params.step.schemaVariantKey
    );
    if (!schemaVariant) {
      throw new Error(
        `Schema variant ${params.step.schemaVariantKey} not found in message type ${messageType.key}`
      );
    }

    // Build the guide data based on the provided params.
    const guideData: KnockMgmt.GuideUpsertParams.Guide = {
      name: params.name,
      channel_key: params.channelKey,
      steps: [
        {
          ref: params.step.ref,
          schema_key: messageType.key,
          schema_semver: messageType.semver,
          schema_variant_key: schemaVariant.key,
          values: params.step.schemaContent,
        },
      ],
    };

    if (params.description) {
      guideData.description = params.description;
    }

    if (params.targetPropertyConditions) {
      guideData.target_property_conditions = {
        all: params.targetPropertyConditions,
      };
    }

    if (params.activationUrlPatterns) {
      guideData.activation_url_patterns = params.activationUrlPatterns;
    }

    const result = await knockClient.guides.upsert(params.guideKey, {
      environment: params.environment ?? config.environment ?? "development",
      guide: guideData,
    });

    return serializeGuide(result.guide);
  },
});

export const guides = {
  listGuides,
  getGuide,
  createOrUpdateGuide,
};

export const permissions = {
  read: ["listGuides", "getGuide"],
  manage: ["createOrUpdateGuide"],
};
