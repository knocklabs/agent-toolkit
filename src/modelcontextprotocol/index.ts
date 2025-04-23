import { KnockClient } from "../lib/knock-client.js";
import type { KnockTool } from "../lib/knock-tool.js";
import { allTools } from "../lib/tools/index.js";
import { createWorkflowTools } from "../lib/tools/workflows-as-tools.js";
import { Config } from "../types.js";

import { KnockMcpServer } from "./adapter.js";

type CreateKnockMcpServerParams = {
  /**
   * Array of Knock tools to enable in the server.
   */
  tools?: KnockTool[];

  /**
   * A Knock client to use for the server.
   */
  knockClient: KnockClient;

  /**
   * The config to use for the server.
   */
  config: Config;

  /**
   * The workflows to enable as tools in the MCP server.
   */
  workflows?: string[];
};

/**
 * Creates a Knock MCP Server with the given parameters.
 */
export const createKnockMcpServer = async (
  params: CreateKnockMcpServerParams
): Promise<KnockMcpServer> => {
  const { tools, knockClient, config, workflows } = params;

  let baseTools = tools || Object.values(allTools);

  if (workflows && Array.isArray(workflows) && workflows.length > 0) {
    const workflowTools = await createWorkflowTools(
      knockClient,
      config,
      workflows
    );

    baseTools = [...baseTools, ...workflowTools];
  }

  return Promise.resolve(new KnockMcpServer(knockClient, config, baseTools));
};
