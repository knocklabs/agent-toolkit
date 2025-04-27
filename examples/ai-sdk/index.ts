import { openai } from "@ai-sdk/openai";
import { generateText, tool } from "ai";
import { createKnockToolkit } from "@knocklabs/agent-toolkit/ai-sdk";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const mockCard = {
  last4: "1234",
  brand: "Visa",
  expiration: "01/2028",
  holder_name: "Alan Grant",
  card_url: "https://fintech.com/cards/1234",
};

const mockIssueCardTool = tool({
  description: "Issue a card to a user",
  parameters: z.object({ userId: z.string() }),
  execute: async (_params) => ({ card: mockCard }),
});

(async () => {
  const toolkit = await createKnockToolkit({
    permissions: {
      // Expose the card-issued workflow as a tool
      workflows: { trigger: ["card-issued"] },
    },
  });

  const result = await generateText({
    model: openai("gpt-4o"),
    tools: {
      ...toolkit.getAllTools(),
      issueCard: mockIssueCardTool,
    },
    system:
      "You are a friendly assistant that helps with card issuing. When a user is issued a card you should trigger the card-issued workflow with the recipient as the user who the card is issued to.",
    prompt: "I'd like to issue a card to Alan Grant (id: alan-grant).",
    maxSteps: 5,
  });

  console.log(result);

  for (const message of result.response.messages) {
    console.log(message.content);
  }
})();
