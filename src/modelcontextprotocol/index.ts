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
};

/**
 * Creates a Knock MCP Server with the given parameters.
 */
export const createKnockMcpServer = async (
  params: CreateKnockMcpServerParams
): Promise<KnockMcpServer> => {
  const { tools, knockClient, config } = params;

  let baseTools = tools || Object.values(allTools);

  if (baseTools.some((tool) => tool.method === "list_workflows")) {
    // If the user has requested the list workflows tool then we can assume that they will
    // also want to use the workflow-as-tools tools.
    const workflowTools = await createWorkflowTools(knockClient, config);
    baseTools = [...baseTools, ...workflowTools];
  }

  return Promise.resolve(new KnockMcpServer(knockClient, config, baseTools));
};
