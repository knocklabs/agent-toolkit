import { tool as langchainTool } from "@langchain/core/tools";

import { KnockClient } from "@/lib/knock-client";
import { KnockTool } from "@/lib/knock-tool";
import { Config } from "@/types";

export const knockToolToLangchainTool = (
  knockClient: KnockClient,
  config: Config,
  knockTool: KnockTool
) => {
  return langchainTool(knockTool.bindExecute(knockClient, config), {
    name: knockTool.method,
    description: knockTool.description,
    schema: knockTool.parameters,
  });
};
