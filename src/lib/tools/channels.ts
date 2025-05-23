import { Channel } from "@knocklabs/mgmt/resources/channels.js";

import { KnockTool } from "../knock-tool.js";

/**
 * A slimmed down version of the Channel resource that is easier to work with in the LLM.
 */
type SerializedChannel = {
  key: string;
  name: string;
  type: string;
  provider: string;
};

function serializeChannelResponse(channel: Channel): SerializedChannel {
  return {
    key: channel.key,
    name: channel.name,
    type: channel.type,
    provider: channel.provider,
  };
}

const listChannels = KnockTool({
  method: "list_channels",
  name: "List channels",
  description: `
  Returns a list of all of the channels configured in the account. Each channel returns information about the type of channel it is (email, sms, push, etc), and the provider that's used to power the channel. Channels can be used across all environments.

  Use this tool when you need to know about the channels configured in the Knock account, like when configuring a workflow.
  `,
  execute: (knockClient) => async (_params) => {
    const allChannels: SerializedChannel[] = [];
    for await (const channel of knockClient.channels.list()) {
      allChannels.push(serializeChannelResponse(channel));
    }
    return allChannels;
  },
});

export const channels = {
  listChannels,
};

export const permissions = {
  read: ["listChannels"],
};
