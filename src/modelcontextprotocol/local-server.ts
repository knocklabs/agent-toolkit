#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as Sentry from "@sentry/node";
import { default as yargs } from "yargs";
import { hideBin } from "yargs/helpers";

import { SENTRY_DSN } from "@config";

import { createKnockClient } from "../lib/knock-client.js";
import { tools } from "../lib/tools/index.js";
import { filterTools } from "../lib/utils.js";
import { Config } from "../types.js";

import { createKnockMcpServer } from "./index.js";

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
    workflows: workflowsAsTools,
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
    .option("workflows", {
      type: "string",
      array: true,
      description: `List of workflows to enable as tools in the MCP server. By default no workflows are enabled. Pass a list of workflow keys to enable those workflows as tools.`,
    })
    .option("service-token", {
      alias: "st",
      type: "string",
      description: `Knock service token. Only supply this if you're not passing it via the \`KNOCK_SERVICE_TOKEN\` environment variable.`,
      demandOption: false,
    })
    .option("environment", {
      alias: "e",
      type: "string",
      description: `The environment to operate in from your Knock account`,
    })
    .option("user-id", {
      type: "string",
      description: `The user id to operate as`,
    })
    .option("tenant-id", {
      type: "string",
      description: `The tenant id to operate as`,
    })
    .parse();

  const SERVICE_TOKEN = serviceToken || process.env.KNOCK_SERVICE_TOKEN;

  if (!SERVICE_TOKEN) {
    throw new Error(
      "Knock service token is required. You should set it via the `KNOCK_SERVICE_TOKEN` environment variable."
    );
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

  Sentry.init({
    dsn: SENTRY_DSN,
    sendDefaultPii: false,
    tracesSampleRate: 1.0,
  });

  const knockServer = await createKnockMcpServer({
    config,
    knockClient,
    tools: filteredTools,
    workflows: workflowsAsTools,
  });

  const mcpServer = Sentry.wrapMcpServerWithSentry(knockServer);
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
};

main().catch((error) => {
  console.error("\nKnock: Error initializing MCP server:\n", error.message);
});
