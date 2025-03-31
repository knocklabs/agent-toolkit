#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { default as yargs } from "yargs";
import { hideBin } from "yargs/helpers";

import { createKnockClient } from "../lib/knock-client.js";
import { Config } from "../types.js";
import { createKnockMcpServer } from "./index.js";
import { tools } from "../lib/tools/index.js";
import { filterTools } from "../lib/utils.js";

/**
 * Main entry point for the Knock MCP server.
 * Runs as a standalone process, as defined in package.json#bin.
 * An entrypoint for this file exists in the tsup configuration of the package.
 */
const main = async () => {
  const {
    serviceToken,
    environment,
    userId,
    tenantId,
    tools: patterns,
  } = await yargs(hideBin(process.argv))
    .version("0.1.0")
    .option("tools", {
      alias: "t",
      type: "string",
      array: true,
      description: `List of tools to enable. Use "*" to enable all tools. Use "category" or "category.*" to enable all tools from a category. Use "category.toolName" to pick a single tool. Available categories: ${Object.keys(
        tools
      )}`,
    })
    .option("service-token", {
      alias: "st",
      type: "string",
      description: `Knock service token`,
    })
    .option("environment", {
      alias: "e",
      type: "string",
      description: `The environment to operate in from your Knock account`,
    })
    .option("user-id", {
      alias: "u",
      type: "string",
      description: `The user id to operate as`,
    })
    .option("tenant-id", {
      alias: "t",
      type: "string",
      description: `The tenant id to operate as`,
    })
    .parse();

  const SERVICE_TOKEN = serviceToken || process.env.KNOCK_SERVICE_TOKEN;

  if (!SERVICE_TOKEN) {
    throw new Error("Knock service token is required");
  }

  const config: Config = {
    serviceToken: SERVICE_TOKEN,
    userId,
    tenantId,
    environment,
  };

  const knockClient = createKnockClient(config);

  const filteredTools = patterns
    ? patterns.map((pattern) => filterTools(tools, pattern)).flat()
    : undefined;

  const mcpServer = await createKnockMcpServer({
    config,
    knockClient,
    tools: filteredTools,
  });

  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
};

main().catch((error) => {
  console.error("\nKnock: Error initializing MCP server:\n", error.message);
});
