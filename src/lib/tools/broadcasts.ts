import { WorkflowStep } from "@knocklabs/mgmt/resources/index.js";
import { z } from "zod";

import { KnockTool } from "../knock-tool.js";

/**
 * A slimmed down version of the Broadcast resource that is easier to work with in the LLM.
 */
export type SerializedBroadcast = {
  key: string;
  name: string;
  status: string;
  description: string | undefined;
  categories: string[] | undefined;
};

export function serializeBroadcastResponse(
  broadcast: any
): SerializedBroadcast {
  return {
    key: broadcast.key,
    name: broadcast.name,
    status: broadcast.status,
    description: broadcast.description,
    categories: broadcast.categories,
  };
}

export function serializeFullBroadcastResponse(
  broadcast: any
): SerializedBroadcast & { steps: WorkflowStep[] } {
  return {
    key: broadcast.key,
    name: broadcast.name,
    status: broadcast.status,
    description: broadcast.description,
    categories: broadcast.categories,
    steps: broadcast.steps,
  };
}

const listBroadcasts = KnockTool({
  method: "list_broadcasts",
  name: "List broadcasts",
  description: `
  List all broadcasts available for the given environment. Returns structural information about the broadcasts, including the key, name, description, categories, and status.

  Use this tool when you need to understand which broadcasts are available to be managed.
  `,
  parameters: z.object({
    environment: z
      .string()
      .optional()
      .describe(
        "(string): The environment to list broadcasts for. Defaults to `development`."
      ),
  }),
  execute: (knockClient, config) => async (params) => {
    const allBroadcasts: SerializedBroadcast[] = [];
    const listParams = {
      environment: params.environment ?? config.environment ?? "development",
    };

    for await (const broadcast of knockClient.broadcasts.list(listParams)) {
      allBroadcasts.push(serializeBroadcastResponse(broadcast));
    }

    return allBroadcasts;
  },
});

const getBroadcast = KnockTool({
  method: "get_broadcast",
  name: "Get broadcast",
  description: `
  Get a broadcast by key. Returns complete information about the broadcast, including the key, name, description, categories, and status.
  `,
  parameters: z.object({
    environment: z
      .string()
      .optional()
      .describe(
        "(string): The environment to get the broadcast for. Defaults to `development`."
      ),
    broadcastKey: z
      .string()
      .describe("(string): The key of the broadcast to get."),
  }),
  execute: (knockClient, config) => async (params) => {
    const broadcast = await knockClient.broadcasts.retrieve(
      params.broadcastKey,
      {
        environment: params.environment ?? config.environment ?? "development",
      }
    );

    return serializeFullBroadcastResponse(broadcast);
  },
});

const upsertBroadcast = KnockTool({
  method: "upsert_broadcast",
  name: "Upsert broadcast",
  description: `
  Create or update a broadcast. Use this tool when you need to create a new broadcast or modify an existing one.
  
  Broadcasts are used to send one-time messages to a target audience. They support channel, branch, and delay steps.
  `,
  parameters: z.object({
    environment: z
      .string()
      .optional()
      .describe(
        "(string): The environment to create/update the broadcast in. Defaults to `development`."
      ),
    broadcastKey: z
      .string()
      .describe(
        "(string): The key of the broadcast to create/update. Only use a kebab-case string with no spaces or special characters."
      ),
    name: z.string().describe("(string): The name of the broadcast."),
    description: z
      .string()
      .optional()
      .describe("(string): The description of the broadcast."),
    categories: z
      .array(z.string())
      .optional()
      .describe("(array): The categories to add to the broadcast."),
    targetAudienceKey: z
      .string()
      .optional()
      .describe(
        "(string): The key of the audience to target for this broadcast."
      ),
    steps: z
      .array(z.record(z.any()))
      .describe(
        "(array): The steps in the broadcast. Broadcasts only support channel, branch, and delay steps."
      ),
    settings: z
      .object({
        overridePreferences: z.boolean().optional(),
        isCommercial: z.boolean().optional(),
      })
      .optional()
      .describe("(object): Broadcast settings."),
  }),
  execute: (knockClient, config) => async (params) => {
    const result = await knockClient.broadcasts.upsert(params.broadcastKey, {
      environment: params.environment ?? config.environment ?? "development",
      broadcast: {
        name: params.name,
        description: params.description,
        categories: params.categories ?? [],
        target_audience_key: params.targetAudienceKey,
        steps: params.steps ?? [],
        settings: params.settings,
      },
    });

    return serializeFullBroadcastResponse(result.broadcast);
  },
});

const sendBroadcast = KnockTool({
  method: "send_broadcast",
  name: "Send broadcast",
  description: `
  Send a broadcast immediately or schedule it to send at a future time. Use this tool when you need to send a broadcast to its target audience.
  
  If sendAt is provided, the broadcast will be scheduled to send at that time. If not provided, the broadcast will be sent immediately.
  `,
  parameters: z.object({
    environment: z
      .string()
      .optional()
      .describe(
        "(string): The environment to send the broadcast in. Defaults to `development`."
      ),
    broadcastKey: z
      .string()
      .describe("(string): The key of the broadcast to send."),
    sendAt: z
      .string()
      .optional()
      .describe(
        "(string): When to send the broadcast. Must be in ISO 8601 UTC format. If not provided, the broadcast will be sent immediately."
      ),
  }),
  execute: (knockClient, config) => async (params) => {
    const result = await knockClient.broadcasts.send(params.broadcastKey, {
      environment: params.environment ?? config.environment ?? "development",
      send_at: params.sendAt,
    });

    return serializeFullBroadcastResponse(result.broadcast);
  },
});

const cancelBroadcast = KnockTool({
  method: "cancel_broadcast",
  name: "Cancel broadcast",
  description: `
  Cancel a scheduled broadcast. The broadcast will return to draft status. Use this tool when you need to cancel a broadcast that has been scheduled but not yet sent.
  `,
  parameters: z.object({
    environment: z
      .string()
      .optional()
      .describe(
        "(string): The environment to cancel the broadcast in. Defaults to `development`."
      ),
    broadcastKey: z
      .string()
      .describe("(string): The key of the broadcast to cancel."),
  }),
  execute: (knockClient, config) => async (params) => {
    const result = await knockClient.broadcasts.cancel(params.broadcastKey, {
      environment: params.environment ?? config.environment ?? "development",
    });

    return serializeFullBroadcastResponse(result.broadcast);
  },
});

export const broadcasts = {
  listBroadcasts,
  getBroadcast,
  upsertBroadcast,
  sendBroadcast,
  cancelBroadcast,
};

export const permissions = {
  read: ["listBroadcasts", "getBroadcast"],
  manage: ["upsertBroadcast", "sendBroadcast", "cancelBroadcast"],
};
