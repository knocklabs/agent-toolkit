import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { KnockTool } from "../lib/knock-tool.js";
import { Config } from "../types.js";
import { KnockClient } from "../lib/knock-client.js";

export class KnockMcpServer extends McpServer {
  constructor(knockClient: KnockClient, config: Config, tools: KnockTool[]) {
    super({ name: "Knock", version: "0.1.0" });

    tools.forEach((tool) => {
      const toolParams = tool.parameters ?? z.object({});

      this.tool(
        tool.name,
        tool.description,
        toolParams.shape,
        async (arg: unknown) => {
          const res = await tool.bindExecute(knockClient, config)(arg);

          return {
            content: [{ type: "text" as const, text: JSON.stringify(res) }],
          };
        }
      );
    });
  }
}
