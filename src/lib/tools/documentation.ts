import { z } from "zod";

import { KnockTool } from "../knock-tool.js";

const searchDocumentation = KnockTool({
  method: "search_documentation",
  name: "Search documentation",
  description: "Search the Knock documentation for a given query",
  parameters: z.object({
    query: z.string().describe("The query to search the documentation for"),
  }),
  execute: () => async (params) => {
    const response = await fetch(`https://docs.knock.app/api/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: params.query }),
    });

    const data = await response.json();
    return data;
  },
});

export const documentation = {
  searchDocumentation,
};

export const permissions = {
  read: ["searchDocumentation"],
};
