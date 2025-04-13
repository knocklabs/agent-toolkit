import { ChatCompletionTool } from "openai/resources.mjs";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

import { KnockTool } from "../lib/knock-tool.js";

/**
 * Convert a KnockTool to a ChatCompletionTool, ready to be used with the OpenAI API.
 *
 * @param knockTool - The KnockTool to convert
 * @returns The converted ChatCompletionTool
 */
export function knockToolToChatCompletionTool(knockTool: KnockTool): ChatCompletionTool {
  return {
    type: "function",
    function: {
      // NOTE: We use the method here as the function name as it's machine readable.
      name: knockTool.method,
      description: knockTool.description,
      parameters: zodToJsonSchema(knockTool.parameters ?? z.object({})),
    },
  };
}
