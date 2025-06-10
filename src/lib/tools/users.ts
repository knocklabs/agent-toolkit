import { User } from "@knocklabs/node";
import { z } from "zod";

import { KnockTool } from "../knock-tool.js";
import { serializeMessageResponse } from "../utils.js";
function maybeHideUserData(user: User, hideUserData: boolean = false) {
  if (hideUserData) {
    return { id: user.id };
  }
  return user;
}

const getUser = KnockTool({
  method: "get_user",
  name: "Get user",
  description: `
   Retrieves the complete user object for the given userId, including email, name, phone number, and any custom properties. Use this tool when you need to retrieve a user's complete profile.

   If the userId is not provided, it will use the userId from the config.
   `,
  parameters: z.object({
    environment: z
      .string()
      .optional()
      .describe(
        "(string): The environment to retrieve the user from. Defaults to `development`."
      ),
    userId: z
      .string()
      .optional()
      .describe("(string): The userId of the User to retrieve."),
  }),
  execute: (knockClient, config) => async (params) => {
    const publicClient = await knockClient.publicApi(params.environment);

    const user = await publicClient.users.get(params.userId ?? config.userId);

    return maybeHideUserData(user, config.hideUserData);
  },
});

const createOrUpdateUser = KnockTool({
  method: "upsert_user",
  name: "Create or update user",
  description: `
  Creates a new user if they don't exist, or updates the user object for the given userId, including email, name, phone number, and any custom properties.
  
  Use this tool when you need to update a user's profile.

  If the userId is not provided, it will use the userId from the config.
  `,
  parameters: z.object({
    environment: z
      .string()
      .optional()
      .describe(
        "(string): The environment to create or update the user in. Defaults to `development`."
      ),
    userId: z
      .string()
      .optional()
      .describe("(string): The userId of the User to update."),
    email: z
      .string()
      .optional()
      .describe("(string): The email of the User to update."),
    name: z
      .string()
      .optional()
      .describe("(string): The name of the User to update."),
    phoneNumber: z
      .string()
      .optional()
      .describe("(string): The phone number of the User to update."),
    customProperties: z
      .record(z.string(), z.any())
      .optional()
      .describe(
        "(object): A dictionary of custom properties to update for the User."
      ),
  }),
  execute: (knockClient, config) => async (params) => {
    const publicClient = await knockClient.publicApi(params.environment);

    const user = await publicClient.users.identify(
      params.userId ?? config.userId,
      {
        email: params.email,
        name: params.name,
        phone_number: params.phoneNumber,
        ...(params.customProperties ?? {}),
      }
    );

    return maybeHideUserData(user, config.hideUserData);
  },
});

const getUserPreferences = KnockTool({
  method: "get_user_preferences",
  name: "Get user preferences",
  description: `
  Retrieves the user's notification preferences for the given userId.

  If the userId is not provided, it will use the userId from the config. 
  `,
  parameters: z.object({
    environment: z
      .string()
      .optional()
      .describe(
        "(string): The environment to retrieve the user preferences from. Defaults to `development`."
      ),
    userId: z
      .string()
      .optional()
      .describe(
        "(string): The userId of the User to retrieve Preferences for."
      ),
    preferenceSetId: z
      .string()
      .optional()
      .describe(
        "(string): The preferenceSetId of the User to retrieve preferences for. Defaults to `default`."
      ),
  }),
  execute: (knockClient, config) => async (params) => {
    const publicClient = await knockClient.publicApi(params.environment);

    return await publicClient.users.getPreferences(
      params.userId ?? config.userId,
      {
        preferenceSet: params.preferenceSetId ?? "default",
      }
    );
  },
});

const setUserPreferences = KnockTool({
  method: "set_user_preferences",
  name: "Set user preferences",
  description: `
  Overwrites the user's notification preferences for the given userId. Allows setting per-workflow, per-category, or per-channel notification preferences. Use this tool when you are asked to update a user's notification preferences.

  If the userId is not provided, it will use the userId from the config.

  Instructions:

  - You must ALWAYS provide a full preference set to this tool.
  - When setting per-workflow preferences, the key in the object should be the workflow key.
  - Workflow and category preferences should always have channel types underneath.
  - The channel types available to you are: email, sms, push, chat, and in_app_feed.
  - To turn OFF a preference, you must set it to false.
  - To turn ON a preference, you must set it to true.

  <examples>
    <example>
      <description>
        Update the user's preferences to turn off email notifications for the "welcome" workflow.
      </description>
      <input>
        {
          "workflows": {
            "welcome": {
              "channel_types": {
                "email": false
              }
            }
          }
        }
    </example>
  </examples>
  `,
  parameters: z.object({
    environment: z
      .string()
      .optional()
      .describe(
        "(string): The environment to set the user preferences in. Defaults to `development`."
      ),
    userId: z
      .string()
      .optional()
      .describe("(string): The userId of the User to update preferences for."),
    workflows: z
      .record(z.string(), z.any())
      .optional()
      .describe(
        "(object): The workflows to update where the key is the workflow key, and the value of the object is an object that contains a `channel_types` key with a boolean value for each channel type."
      ),
    categories: z
      .record(z.string(), z.any())
      .optional()
      .describe(
        "(object): The categories to update where the key is the category key, and the value of the object is an object that contains a `channel_types` key with a boolean value for each channel type."
      ),
    channel_types: z
      .record(z.string(), z.boolean())
      .optional()
      .describe(
        "(object): The channel types to update where the key is the channel type, and the value of the object is a boolean value."
      ),
  }),
  execute: (knockClient, config) => async (params) => {
    const publicClient = await knockClient.publicApi(params.environment);

    const existingPreferences = await publicClient.users.getPreferences(
      params.userId ?? config.userId,
      {
        preferenceSet: "default",
      }
    );

    const updatedPreferences = {
      ...existingPreferences,
      workflows: {
        ...existingPreferences.workflows,
        ...params.workflows,
      },
      categories: {
        ...existingPreferences.categories,
        ...params.categories,
      },
      channel_types: {
        ...existingPreferences.channel_types,
        ...params.channel_types,
      },
    };

    return await publicClient.users.setPreferences(
      params.userId ?? config.userId,
      updatedPreferences
    );
  },
});

const getUserMessages = KnockTool({
  method: "get_user_messages",
  name: "Get user messages",
  description: `
  Retrieves the messages that this user has received from the service. Use this tool when you need information about the notifications that the user has received, including if the message has been read, seen, or interacted with. This will return a list of messages across all of the channels.

  If the userId is not provided, it will use the userId from the config.
  `,
  parameters: z.object({
    environment: z
      .string()
      .optional()
      .describe(
        "(string): The environment to retrieve the user messages from. Defaults to `development`."
      ),
    userId: z
      .string()
      .optional()
      .describe("(string): The userId of the User to retrieve messages for."),
    workflowRunId: z
      .string()
      .optional()
      .describe(
        "(string): The workflowRunId of the User to retrieve. Use this when you want to retrieve messages sent from a workflow trigger."
      ),
  }),
  execute: (knockClient, config) => async (params) => {
    const publicClient = await knockClient.publicApi(params.environment);

    const messages = await publicClient.users.getMessages(
      params.userId ?? config.userId,
      {
        workflow_run_id: params.workflowRunId,
      }
    );

    return messages.items.map(serializeMessageResponse);
  },
});

export const users = {
  getUser,
  createOrUpdateUser,
  getUserPreferences,
  setUserPreferences,
  getUserMessages,
};

export const permissions = {
  read: ["getUser", "getUserMessages", "getUserPreferences"],
  manage: ["createOrUpdateUser", "setUserPreferences"],
};
