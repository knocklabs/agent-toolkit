import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { createKnockToolkit } from "@knocklabs/agent-toolkit/ai-sdk";
import dotenv from "dotenv";

dotenv.config();

const toolkit = createKnockToolkit({
  serviceToken: process.env.KNOCK_SERVICE_TOKEN!,
  permissions: {
    users: { manage: true },
  },
  userId: "alan-grant",
});

(async () => {
  const result = await generateText({
    model: openai("gpt-4o"),
    tools: {
      ...toolkit.getTools("users"),
    },
    maxSteps: 5,
    prompt:
      "Update the current user's profile with information about them, knowing that they are Alan Grant from Jurassic Park. Include custom properties about their favorite dinosaur.",
  });

  console.log(result);
})();
