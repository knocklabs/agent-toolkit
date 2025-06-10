import { MessageType } from "@knocklabs/mgmt/resources/message-types.js";
import { z } from "zod";

import { KnockTool } from "../knock-tool.js";

/**
 * A slimmed down version of the MessageType resource that is easier to work with in the LLM.
 */
type SerializedMessageType = {
  key: string;
  name: string;
  description?: string | null;
  variants: string[];
};

function serializeMessageTypeResponse(
  messageType: MessageType
): SerializedMessageType {
  return {
    key: messageType.key,
    name: messageType.name,
    description: messageType.description,
    variants: messageType.variants.map((variant) => variant.key),
  };
}
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
    const allMessageTypes: SerializedMessageType[] = [];
    for await (const messageType of knockClient.messageTypes.list({
      environment: params.environment ?? config.environment ?? "development",
    })) {
      allMessageTypes.push(serializeMessageTypeResponse(messageType));
    }
    return allMessageTypes;
  },
});

const createOrUpdateMessageType = KnockTool({
  method: "upsert_message_type",
  name: "Create or update message type",
  description: `
  Create or update a message type. A message type is a schema that defines fields available to an editor within Knock. Message types always have at least one variant, that MUST be named "default". Use this tool when you need to create a new message type, or update an existing message type.

  ## Schema and fields

  The schema defines the fields available to an editor within Knock. A variant should have at least one field. Fields can be of different types, including: text, markdown, select, multi-select, image, and button.

  Each field must have a key, label, and type. Some fields like \`select\` and \`multi_select\` have additional settings that can be used to configure the field.

  <example>
  {
    "key": "text",
    "label": "Text",
    "type": "text",
  </example>

  <example>
  {
    "key": "select",
    "label": "Select",
    "type": "select",
    "settings": {
      "options": [
        {
          "value": "option1",
          "label": "Option 1",
        },
      ],
    },
  }
  </example>

  ## Preview templates

  The preview is a string of HTML that will be rendered in the Knock UI as a representation of the message type. It is shared across all variants. It supports liquid, where the field name is available as a variable, so a field named "text" will be rendered as {{ text }}. All fields should be included in the preview.

  You can make an educated guess as to what the preview template should look like based on the name of the message type and the fields. You can use plain CSS to style the preview by supplying a style tag in the preview. Use simple selectors like .class-name to style elements.

  <example>
  {
    "preview": "<style>div { color: red; }</style>\n<div>Hello there, {{ text }}</div>"
  }
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
