import type { Tool } from "ai";
import { tool } from "ai";
import { z } from "zod";

import { KnockClient } from "../lib/knock-client.js";
import { KnockTool } from "../lib/knock-tool.js";
import { Config } from "../types.js";

/**
 * Convert a KnockTool to an AI Tool, ready to pass to the AI SDK.
 */
const knockToolToAiTool = (
  knockClient: KnockClient,
  config: Config,
  knockTool: KnockTool
): Tool => {
  return tool({
    description: knockTool.description,
    parameters: knockTool.parameters ?? z.object({}),
    execute: knockTool.bindExecute(knockClient, config),
  });
};

export { knockToolToAiTool };
