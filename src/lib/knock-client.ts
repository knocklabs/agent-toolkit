import KnockMgmt from "@knocklabs/mgmt";
import { Knock } from "@knocklabs/node";

import { Config } from "../types.js";

const serviceTokensToApiClients: Record<string, Record<string, Knock>> = {};

type KnockClient = ReturnType<typeof createKnockClient>;

const createKnockClient = (config: Config) => {
  const client = new KnockMgmt({
    serviceToken: config.serviceToken,
  });

  return Object.assign(client, {
    publicApi: async (environmentSlug?: string): Promise<Knock> => {
      const environment = environmentSlug ?? config.environment ?? "development";

      // If the client already exists for this service token and environment, return it
      if (serviceTokensToApiClients?.[config.serviceToken]?.[environment]) {
        return serviceTokensToApiClients[config.serviceToken][environment];
      }

      // Otherwise, fetch a public API key for this service token and environment
      const { api_key } = await client.apiKeys.exchange({ environment });

      // Create a new Knock client with the public API key
      const knock = new Knock(api_key);

      // Store the client in the cache
      if (!serviceTokensToApiClients[config.serviceToken]) {
        serviceTokensToApiClients[config.serviceToken] = {};
      }

      serviceTokensToApiClients[config.serviceToken][environment] = knock;

      return knock;
    },
  });
};

export { createKnockClient, type KnockClient };
