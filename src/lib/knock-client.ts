import KnockMgmt from "@knocklabs/mgmt";
import { Knock } from "@knocklabs/node";

import pkg from "../../package.json";

import { Config } from "../types.js";

const serviceTokensToApiClients: Record<string, Record<string, Knock>> = {};

type KnockClient = ReturnType<typeof createKnockClient>;

// Include a custom header to identify all client requests in the API logs
const knockClientHeaders = {
  "X-Knock-Client": `knock/agent-toolkit@${pkg.version}`,
};

const createKnockClient = (config: Config) => {
  const serviceToken = config.serviceToken ?? process.env.KNOCK_SERVICE_TOKEN;

  if (!serviceToken) {
    throw new Error(
      "Service token is required. Please set the `serviceToken` property in the config or the `KNOCK_SERVICE_TOKEN` environment variable."
    );
  }

  const client = new KnockMgmt({
    serviceToken,
    defaultHeaders: knockClientHeaders,
  });

  return Object.assign(client, {
    publicApi: async (environmentSlug?: string): Promise<Knock> => {
      const environment =
        environmentSlug ?? config.environment ?? "development";

      // If the client already exists for this service token and environment, return it
      if (serviceTokensToApiClients?.[serviceToken]?.[environment]) {
        return serviceTokensToApiClients[serviceToken][environment];
      }

      // Otherwise, fetch a public API key for this service token and environment
      const { api_key } = await client.apiKeys.exchange({ environment });

      // Create a new Knock client with the public API key
      const knock = new Knock({
        apiKey: api_key,
        defaultHeaders: knockClientHeaders,
      });

      // Store the client in the cache
      if (!serviceTokensToApiClients[serviceToken]) {
        serviceTokensToApiClients[serviceToken] = {};
      }

      serviceTokensToApiClients[serviceToken][environment] = knock;

      return knock;
    },
  });
};

export { createKnockClient, type KnockClient };
