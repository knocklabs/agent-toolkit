import { z } from "zod";

import { KnockTool } from "../knock-tool.js";

/**
 * A slimmed down version of the Guide resource that is easier to work with in the LLM.
 */
type SerializedGuide = {
  key: string;
  name: string;
  description?: string;
  type: string;
  active: boolean;
};

function serializeGuide(guide: any): SerializedGuide {
  return {
    key: guide.key,
    name: guide.name,
    description: guide.description,
    type: guide.type,
    active: guide.active,
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
  execute: (_knockClient, _config) => async (_params) => {
    // TODO: Replace with actual guides API when published
    // const allGuides: SerializedGuide[] = [];
    // const listParams = {
    //   environment: params.environment ?? config.environment ?? "development",
    //   page_size: params.page_size,
    //   after: params.after,
    // };
    // for await (const guide of knockClient.guides.list(listParams)) {
    //   allGuides.push(serializeGuide(guide));
    // }
    // return allGuides;

    // Placeholder implementation until guides API is published
    throw new Error(
      "Guides API is not yet available in the Knock management SDK"
    );
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
  execute: (_knockClient, _config) => async (_params) => {
    // TODO: Replace with actual guides API when published
    // const guide = await knockClient.guides.retrieve(params.guideKey, {
    //   environment: params.environment ?? config.environment ?? "development",
    //   hide_uncommitted_changes: params.hide_uncommitted_changes,
    // });
    // return serializeGuide(guide);

    // Placeholder implementation until guides API is published
    throw new Error(
      "Guides API is not yet available in the Knock management SDK"
    );
  },
});

const createOrUpdateGuide = KnockTool({
  method: "upsert_guide",
  name: "Upsert guide",
  description: `
  Create or update a guide. A guide defines an in-app guide that can be displayed to users based on priority and other conditions.

  Use this tool when you need to create a new guide or update an existing one. The guide will be created with the specified configuration.

  Note: This endpoint only operates on guides in the "development" environment.
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
    guide: z
      .object({
        name: z
          .string()
          .describe(
            "(string): A name for the guide. Must be at maximum 255 characters in length."
          ),
        description: z
          .string()
          .optional()
          .describe(
            "(string): An arbitrary string attached to a guide object. Maximum of 280 characters allowed."
          ),
        priority: z
          .number()
          .min(1)
          .max(9999)
          .describe(
            "(number): The priority of the guide. Must be between 1 and 9999."
          ),
        channel_key: z
          .string()
          .describe(
            "(string): The key of the channel in which the guide exists."
          ),
        type: z.string().describe("(string): The type of the guide."),
        semver: z.string().describe("(string): The semver of the guide."),
        steps: z
          .array(z.any())
          .describe("(array): A list of guide step objects in the guide."),
        target_audience_id: z
          .string()
          .optional()
          .describe("(string): The ID of the target audience for the guide."),
        target_property_conditions: z
          .any()
          .optional()
          .describe(
            "(object): A conditions object that describes one or more conditions to be met for the guide to be shown to an audience member."
          ),
        activation_location_rules: z
          .array(z.any())
          .describe(
            "(array): A list of activation location rules that describe when the guide should be shown."
          ),
      })
      .describe("(object): The guide configuration to upsert."),
    commit: z
      .boolean()
      .optional()
      .describe("(boolean): Whether to commit the changes immediately."),
    commit_message: z
      .string()
      .optional()
      .describe("(string): The commit message when committing changes."),
    annotate: z
      .boolean()
      .optional()
      .describe("(boolean): Whether to annotate the changes."),
  }),
  execute: (_knockClient, _config) => async (_params) => {
    // TODO: Replace with actual guides API when published
    // const result = await knockClient.guides.upsert(params.guideKey, {
    //   environment: params.environment ?? config.environment ?? "development",
    //   guide: params.guide,
    //   commit: params.commit,
    //   commit_message: params.commit_message,
    //   annotate: params.annotate,
    // });
    // return serializeGuide(result.guide);

    // Placeholder implementation until guides API is published
    throw new Error(
      "Guides API is not yet available in the Knock management SDK"
    );
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
