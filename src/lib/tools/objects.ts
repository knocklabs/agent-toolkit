import { z } from "zod";

import { KnockTool } from "../knock-tool.js";

const listObjects = KnockTool({
  method: "list_objects",
  name: "List objects",
  description:
    "List all objects in a single collection. Objects are used to model custom collections in Knock that are NOT users or tenants. Use this tool when you need to return a paginated list of objects in a single collection.",
  parameters: z.object({
    environment: z
      .string()
      .optional()
      .describe(
        "(string): The environment to list objects from. Defaults to `development`."
      ),
    collection: z
      .string()
      .describe("(string): The collection to list objects from."),
  }),
  execute: (knockClient, _config) => async (params) => {
    const publicClient = await knockClient.publicApi(params.environment);
    return await publicClient.objects.list(params.collection);
  },
});

const getObject = KnockTool({
  method: "get_object",
  name: "Get object",
  description:
    "Get an object wihin a collection. Returns information about the object including any custom properties. Use this tool when you need to retrieve an object to understand it's properties.",
  parameters: z.object({
    environment: z
      .string()
      .optional()
      .describe(
        "(string): The environment to get the object from. Defaults to `development`."
      ),
    collection: z
      .string()
      .describe("(string): The collection to get the object from."),
    objectId: z.string().describe("(string): The ID of the object to get."),
  }),
  execute: (knockClient, _config) => async (params) => {
    const publicClient = await knockClient.publicApi(params.environment);
    return await publicClient.objects.get(params.collection, params.objectId);
  },
});

const createOrUpdateObject = KnockTool({
  method: "upsert_object",
  name: "Create or update object",
  description: `Create or update an object in a specific collection. Objects are used to model custom collections in Knock that are NOT users or tenants. If the object does not exist, it will be created. If the object exists, it will be updated with the provided properties. The update will always perform an upsert operation, so you do not need to provide the full properties each time.
  
  Use this tool when you need to create a new object, or update an existing custom-object. Custom objects can be used to subscribe users' to as lists, and also send non-user facing notifications to.`,
  parameters: z.object({
    environment: z
      .string()
      .optional()
      .describe(
        "(string): The environment to create or update the object in. Defaults to `development`."
      ),
    collection: z
      .string()
      .describe("(string): The collection to create or update the object in."),
    objectId: z
      .string()
      .describe("(string): The ID of the object to create or update."),
    properties: z
      .record(z.string(), z.any())
      .optional()
      .describe("(object): The properties to set on the object."),
  }),
  execute: (knockClient, _config) => async (params) => {
    const publicClient = await knockClient.publicApi(params.environment);
    return await publicClient.objects.set(
      params.collection,
      params.objectId,
      params.properties
    );
  },
});

const subscribeUsersToObject = KnockTool({
  method: "subscribe_users_to_object",
  name: "Subscribe users to object",
  description: `
  Subscribe a list of users to an object in a specific collection. We use this to model lists of users, for pub-sub use cases.
  
  Use this tool when you need to subscribe one or more users to an object where you will then trigger workflows for those lists of users to send notifications to.

  Before using this tool, you should create the object in the collection using the createOrUpdateObject tool.
  `,
  parameters: z.object({
    environment: z
      .string()
      .optional()
      .describe(
        "(string): The environment to subscribe the user to. Defaults to `development`."
      ),
    collection: z
      .string()
      .describe("(string): The collection to subscribe the user to."),
    objectId: z
      .string()
      .describe("(string): The ID of the object to subscribe the user to."),
    userIds: z
      .array(z.string())
      .describe(
        "(array): The IDs of the users to subscribe to the object. If not provided, the current user will be subscribed."
      ),
  }),
  execute: (knockClient, config) => async (params) => {
    const publicClient = await knockClient.publicApi(params.environment);
    return await publicClient.objects.addSubscriptions(
      params.collection,
      params.objectId,
      {
        recipients: params.userIds ?? [config.userId],
      }
    );
  },
});

const unsubscribeUsersFromObject = KnockTool({
  method: "unsubscribe_users_from_object",
  name: "Unsubscribe users from object",
  description: `Unsubscribe a list of users from an object in a specific collection. We use this to model lists of users, for pub-sub use cases.
  
  Use this tool when you need to unsubscribe one or more users from an object where you will then trigger workflows for those lists of users to send notifications to.`,
  parameters: z.object({
    environment: z
      .string()
      .optional()
      .describe(
        "(string): The environment to unsubscribe the user from. Defaults to `development`."
      ),
    collection: z
      .string()
      .describe("(string): The collection to unsubscribe the user from."),
    objectId: z
      .string()
      .describe("(string): The ID of the object to unsubscribe the user from."),
    userIds: z
      .array(z.string())
      .describe(
        "(array): The IDs of the users to unsubscribe from the object."
      ),
  }),
  execute: (knockClient, config) => async (params) => {
    const publicClient = await knockClient.publicApi(params.environment);
    return await publicClient.objects.deleteSubscriptions(
      params.collection,
      params.objectId,
      {
        recipients: params.userIds ?? [config.userId],
      }
    );
  },
});

export const objects = {
  listObjects,
  getObject,
  createOrUpdateObject,
  subscribeUsersToObject,
  unsubscribeUsersFromObject,
};

export const permissions = {
  read: ["listObjects", "getObject"],
  manage: [
    "createOrUpdateObject",
    "subscribeUsersToObject",
    "unsubscribeUsersFromObject",
  ],
};
