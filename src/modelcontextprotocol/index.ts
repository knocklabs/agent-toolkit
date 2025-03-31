import type { KnockTool } from "../lib/knock-tool.js";
import { allTools } from "../lib/tools/index.js";
import { KnockMcpServer } from "./adapter.js";
import { Config } from "../types.js";
import { KnockClient } from "../lib/knock-client.js";

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

  return Promise.resolve(
    new KnockMcpServer(knockClient, config, tools || Object.values(allTools))
  );
};
