import { Environment } from "@knocklabs/mgmt/resources/environments.js";
import { KnockTool } from "../knock-tool.js";

const listEnvironments = KnockTool({
  method: "list_environments",
  name: "List environments",
  description: `
  Lists all environments available, returning the slug, name, and the order of each environment. Use this tool when you need to see what environments are available to deploy to.
  `,
  execute: (knockClient) => async (params) => {
    const allEnvironments: Environment[] = [];
    for await (const environment of knockClient.environments.list()) {
      allEnvironments.push(environment);
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
