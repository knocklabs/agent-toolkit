import { openai } from "@ai-sdk/openai";
import { generateText, tool } from "ai";
import { createKnockToolkit } from "@knocklabs/agent-toolkit/ai-sdk";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

(async () => {
  const toolkit = await createKnockToolkit({
    serviceToken: process.env.KNOCK_SERVICE_TOKEN!,
    permissions: {},
  });

  const addTool = tool({
    description: "Add two numbers together. ALWAYS use this tool when you are asked to do addition DO NOT assume the result.",
    parameters: z.object({
      a: z.number(),
      b: z.number(),
    }),
    // This will never be called because we're deferring the tool call to the human in the loop workflow
    execute: async ({ a, b }) => {
      console.log("Executing add tool");
      return a + b;
    },
  });

  // This will defer the tool call and trigger a human in the loop workflow
  const toolset = toolkit.requireHumanInput({ add: addTool }, {
    workflow: "approve-tool-call",
    recipients: ["admin_user_1"],
  });

  const result = await generateText({
    model: openai("gpt-4o"),
    tools: { ...toolset },
    maxSteps: 5,
    prompt: "Add 1 and 2 together.",
  });

  console.log(result);
})();
