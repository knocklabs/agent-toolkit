import { createTool, Tool as MastraTool } from "@mastra/core/tools";
import { z } from "zod";

import { KnockClient } from "../lib/knock-client.js";
import { KnockTool } from "../lib/knock-tool.js";
import { Config } from "../types.js";

/**
 * Convert a KnockTool to a ChatCompletionTool, ready to be used with the OpenAI API.
 *
 * @param knockTool - The KnockTool to convert
 * @returns The converted ChatCompletionTool
 */
export function knockToolToMastraTool(
  knockClient: KnockClient,
  config: Config,
  knockTool: KnockTool
): MastraTool<z.ZodObject<any, any>> {
  return createTool({
    id: knockTool.method,
    inputSchema: knockTool.parameters ?? z.object({}),
    description: knockTool.description,
    execute: knockTool.bindExecute(knockClient, config),
  });
}
