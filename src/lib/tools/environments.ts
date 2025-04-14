import { Environment } from "@knocklabs/mgmt/resources/environments.js";

import { KnockTool } from "../knock-tool.js";

/**
 * A slimmed down version of the Environment resource that is easier to work with in the LLM.
 */
type SerializedEnvironment = {
  slug: string;
  name: string;
};

function serializeEnvironmentResponse(
  environment: Environment
): SerializedEnvironment {
  return {
    slug: environment.slug,
    name: environment.name,
  };
}

const listEnvironments = KnockTool({
  method: "list_environments",
  name: "List environments",
  description: `
  Lists all environments available, returning the slug and name of each environment. Use this tool when you need to see what environments are available.
  `,
  execute: (knockClient) => async (_params) => {
    const allEnvironments: SerializedEnvironment[] = [];
    for await (const environment of knockClient.environments.list()) {
      allEnvironments.push(serializeEnvironmentResponse(environment));
    }
    return allEnvironments;
  },
});

export const environments = {
  listEnvironments,
};

export const permissions = {
  read: ["listEnvironments"],
};
