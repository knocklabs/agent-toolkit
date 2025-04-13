import { z } from "zod";

import { KnockTool } from "../knock-tool.js";

const listCommits = KnockTool({
  method: "list_commits",
  name: "List commits",
  description: `
  Returns all commits available in the environment. Use this tool when you are asked to see what changes are available to be deployed.
  `,
  parameters: z.object({
    environment: z
      .string()
      .optional()
      .describe(
        "(string): The environment to list commits for. Defaults to `development`."
      ),
    promoted: z
      .boolean()
      .describe(
        "(boolean): Whether to only return promoted commits. Defaults to `false`."
      ),
  }),
  execute: (knockClient, config) => async (params) => {
    return await knockClient.commits.list({
      environment: params.environment ?? config.environment ?? "development",
      promoted: params.promoted ?? false,
    });
  },
});

const commitAllChanges = KnockTool({
  method: "commit_all_changes",
  name: "Commit all changes",
  description: `
  Commit all pending changes. This can only be used in the development environment.
  `,
  parameters: z.object({
    environment: z
      .string()
      .optional()
      .describe(
        "(string): The environment to commit all changes to. Defaults to `development`."
      ),
    message: z
      .string()
      .optional()
      .describe("(string): The message to include in the commit."),
  }),
  execute: (knockClient, config) => async (params) => {
    return await knockClient.commits.commitAll({
      environment: params.environment ?? config.environment ?? "development",
      commit_message: params.message,
    });
  },
});

const promoteAllCommits = KnockTool({
  method: "promote_all_commits",
  name: "Promote all commits",
  description: `
  Promote all commits to the next environment. Use this tool when you are asked to deploy all changes.
  `,
  parameters: z.object({
    toEnvironment: z
      .string()
      .describe("(string): The environment to promote all commits to."),
  }),
  execute: (knockClient, _config) => async (params) => {
    return await knockClient.put("/v1/commits/promote", {
      body: { to_environment: params.toEnvironment },
    });
  },
});

export const commits = {
  listCommits,
  commitAllChanges,
  promoteAllCommits,
};

export const permissions = {
  read: ["listCommits"],
  manage: ["commitAllChanges", "promoteAllCommits"],
};
