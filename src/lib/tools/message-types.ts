import { z } from "zod";
import { KnockTool } from "../knock-tool.js";
import { MessageType } from "@knocklabs/mgmt/resources/message-types.js";

const listMessageTypes = KnockTool({
  method: "list_message_types",
  name: "List message types",
  description:
    "List all message types available for the environment. Each message type returns the schema, which includes information about the variants and the fields available per-variant. Use this tool when you need to understand the different message types that are available for the environment for use in Guides.",
  parameters: z.object({
    environment: z
      .string()
      .optional()
      .describe(
        "(string): The environment to list message types for. Defaults to `development`."
      ),
  }),
  execute: (knockClient, config) => async (params) => {
    const allMessageTypes: MessageType[] = [];
    for await (const messageType of knockClient.messageTypes.list({
      environment: params.environment ?? config.environment ?? "development",
    })) {
      allMessageTypes.push(messageType);
    }
    return allMessageTypes;
  },
});

const createOrUpdateMessageType = KnockTool({
  method: "create_or_update_message_type",
  name: "Create or update message type",
  description: `
  Create or update a message type. A message type is a schema that defines fields available to an editor within Knock. Message types always have at least one variant, that MUST be named "default".
  
  Use this tool when you need to create a new message type, or update an existing message type. You must pass the FULL message type to this tool if you're going to update an existing message type.

  The preview is a string of HTML that will be rendered in the Knock UI as a representation of the message type. It is shared across all variants. It supports liquid, where the field name is available as a variable, so a field named "text" will be rendered as {{ text }}.

  <example>
   <description>
    Create a new message type for a banner component that has a text and an action URL.
   </description>
   <input>
    {
      "messageTypeKey": "banner",
      "name": "Banner",
      "description": "A banner component that has a text and an action URL.",
      "preview": "<div>{{ text }}</div>",
      "variants": [
        {
          "key": "default",
          "name": "Default",
          "fields": [
            {
              "key": "text",
              "type": "text",
              "label": "Text",
              "settings": {
                "max_length": 100,
              },
            },
            {
              "key": "action_url",
              "type": "text",
              "label": "Action URL",
              "settings": {
                "placeholder": "https://example.com",
              },
            }
          ]
        }
      ]
    }
   </input>
  </example>
  <example>
   <description>
    Create a message type for a card component that has an icon type, title, body, and a single action button.
   </description>
   <input>
    {
      "messageTypeKey": "card",
      "name": "Card",
      "description": "A single-action card component.",
      "preview": "
        <div>
          <h2>{{ title }}</h2>
          <p>{{ body }}</p>
          <button>Action</button>
        </div>
      ",
      "variants": [
        {
          "key": "default",
          "name": "Default",
          "fields": [
            {
              "key": "icon_type",
              "type": "select",
              "label": "Icon type",
              "settings": {
                "options": [
                  {
                    "value": "warning",
                    "label": "Warning",
                  },
                ]
              },
            },
            {
              "key": "description",
              "type": "markdown",
              "label": "Description",
            },
            {
              "key": "action_button",
              "type": "button",
              "label": "Action button",
            },
          ]
        }
      ]
    }
   </input>
  </example>
  `,
  parameters: z.object({
    environment: z
      .string()
      .optional()
      .describe(
        "(string): The environment to create or update the message type in. Defaults to `development`."
      ),
    messageTypeKey: z
      .string()
      .describe("(string): The key of the message type to create or update."),
    name: z.string().describe("(string): The name of the message type."),
    description: z
      .string()
      .optional()
      .describe("(string): The description of the message type."),
    preview: z
      .string()
      .optional()
      .describe(
        "(string): The preview of the variant. This is a string of HTML that will be rendered in the preview of the message type. There is a single preview shared by all variants."
      ),
    variants: z
      .array(
        z.object({
          key: z.string().describe("(string): The key of the variant."),
          name: z.string().describe("(string): The name of the variant."),
          description: z
            .string()
            .optional()
            .describe("(string): The description of the variant."),
          fields: z
            .array(
              z.object({
                key: z.string().describe("(string): The key of the field."),
                type: z
                  .string()
                  .describe(
                    "(string): The type of the field. One of `text`, `textarea`, `button`, `markdown`, `select`, `multi_select`, `image`."
                  ),
                label: z.string().describe("(string): The label of the field."),
                settings: z
                  .object({})
                  .optional()
                  .describe("(object): The settings of the field."),
              })
            )
            .describe("(array): The fields of the variant."),
        })
      )
      .describe("(array): The variants of the message type."),
  }),
  execute: (knockClient, config) => async (params) => {
    return await knockClient.messageTypes.upsert(params.messageTypeKey, {
      message_type: {
        name: params.name,
        variants: params.variants,
        description: params.description ?? "",
        preview: params.preview ?? "<div></div>",
      },
      environment: params.environment ?? config.environment ?? "development",
    });
  },
});

export const messageTypes = {
  listMessageTypes,
  createOrUpdateMessageType,
};

export const permissions = {
  read: ["listMessageTypes"],
  manage: ["createOrUpdateMessageType"],
};
