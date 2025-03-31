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
});

(async () => {
  const result = await generateText({
    model: openai("gpt-4o"),
    tools: {
      ...toolkit.getAllTools(),
    },
    maxSteps: 5,
    prompt:
      "Create a new user that's a character from Jurassic Park. Fill out the user's profile with relevant information about the character.",
  });

  console.log(result.text);
})();
