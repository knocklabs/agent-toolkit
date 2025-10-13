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

  The \`targetPropertyConditions\` object supports two logical operators:

  - **\`all\`**: Conditions are joined with AND logic - ALL conditions must be true
  - **\`any\`**: Conditions are joined with OR logic - ANY condition can be true

  You can use both \`all\` and \`any\` together for complex targeting logic.

  **Examples:**

  Target users with a specific email (AND logic):
  \`\`\`json
  {
    "all": [
      { "operator": "equal_to", "variable": "john.doe@example.com", "argument": "recipient.email" }
    ]
  }
  \`\`\`

  Target users who are either pro OR enterprise plan (OR logic):
  \`\`\`json
  {
    "any": [
      { "operator": "equal_to", "variable": "pro", "argument": "recipient.plan" },
      { "operator": "equal_to", "variable": "enterprise", "argument": "recipient.plan" }
    ]
  }
  \`\`\`

  Complex targeting: pro/enterprise users AND from specific tenant:
  \`\`\`json
  {
    "all": [
      { "operator": "equal_to", "variable": "tenant-123", "argument": "recipient.tenant_id" }
    ],
    "any": [
      { "operator": "equal_to", "variable": "pro", "argument": "recipient.plan" },
      { "operator": "equal_to", "variable": "enterprise", "argument": "recipient.plan" }
    ]
  }
  \`\`\`

  ### Activation location rules

  You can supply a list of activation location rules to describe where in your application the guide should be shown. Each activation rule is a directive that describes whether the guide should be shown or hidden based on the pathname of the page.

  For example, if you want to show the guide on all pages except for the \`admin\` path, you would supply the following activation location rules:

  \`\`\`json
  [
    { "directive": "allow", "pathname": "*" },
    { "directive": "block", "pathname": "/admin" }
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
      .describe(
        "(string): The key of the guide to upsert. Must be at minimum 3 characters and at maximum 255 characters in length. Must be in the format of ^[a-z0-9_-]+$."
      ),
    name: z
      .string()
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
      .optional()
      .describe(
        "(string): An arbitrary string attached to a guide object. Maximum of 280 characters allowed."
      ),
    step: z
      .object({
        name: z
          .string()
          .describe("(string): The name of the step.")
          .optional()
          .default("Default"),
        ref: z
          .string()
          .describe("(string): The unique identifier of the step.")
          .optional()
          .default("default"),
        schemaKey: z
          .string()
          .describe(
            "(string): The key of the schema that the step's content conforms to."
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
      .object({
        all: z
          .array(conditionSchema)
          .optional()
          .describe(
            "(array): Conditions that must ALL be true (AND logic). All conditions in this array must evaluate to true for the guide to be shown."
          ),
        any: z
          .array(conditionSchema)
          .optional()
          .describe(
            "(array): Conditions where ANY can be true (OR logic). At least one condition in this array must evaluate to true for the guide to be shown."
          ),
      })
      .optional()
      .describe(
        "(object): Property conditions that describe the target audience for the guide. You can use 'all' for AND logic, 'any' for OR logic, or both for complex targeting."
      ),
    activationLocationRules: z
      .array(
        z.object({
          directive: z
            .enum(["allow", "block"])
            .describe(
              "(string): The directive to apply to the activation location rule (allow or block)."
            ),
          pathname: z
            .string()
            .describe(
              "(string): The pathname to target. Should correspond to a URI in your application."
            ),
        })
      )
      .optional()
      .describe(
        "(array): A list of activation location rules that describe where in your application the guide should be shown."
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

    // Ensure that the schema variant exists
    const schemaVariant = messageType.variants.find(
      (variant) => variant.key === params.step.schemaVariantKey
    );

    if (!schemaVariant) {
      throw new Error(
        `Schema variant ${params.step.schemaVariantKey} not found in message type ${messageType.key}`
      );
    }

    const result = await knockClient.guides.upsert(params.guideKey, {
      environment: params.environment ?? config.environment ?? "development",
      guide: {
        name: params.name,
        description: params.description,
        channel_key: params.channelKey ?? "knock-guide",
        steps: [
          {
            ref: params.step.ref ?? "default",
            schema_key: messageType.key,
            schema_semver: messageType.semver,
            schema_variant_key: schemaVariant.key,
            values: params.step.schemaContent,
          },
        ],
        target_property_conditions: params.targetPropertyConditions,
        activation_location_rules: params.activationLocationRules,
      },
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
