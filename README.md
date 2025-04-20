# Knock Agent Toolkit (Beta)

## Table of contents

- [Getting started](#getting-started)
- [API reference](#api-reference)
- [Prerequisites](#prerequisites)
- [Available tools](#available-tools)
- [Context](#context)
- [Usage](#usage)
  - [Model Context Protocol (MCP)](#model-context-protocol-mcp)
  - [AI SDK](#ai-sdk)
  - [OpenAI](#openai)
  - [Langchain](#langchain)

## Getting started

The Knock Agent toolkit enables popular agent frameworks including [OpenAI](https://platform.openai.com/docs/guides/function-calling?api-mode=chat&lang=javascript) and [Vercel's AI SDK](https://sdk.vercel.ai/) to integrate with Knock's APIs using tools (otherwise known as function calling). It also allows you to integrate Knock into a Model Context Protocol (MCP) client such as Cursor, Windsurf, or Claude Code.

Using the Knock agent toolkit allows you to build powerful agent systems that are capable of sending cross-channel notifications to the humans who need to be in the loop. As a developer, it also helps you build Knock integrations and manage your Knock account.

## API reference

The Knock Agent Toolkit provides three main entry points:

- `@knocklabs/agent-toolkit/ai-sdk`: Helpers for integrating with Vercel's AI SDK.
- `@knocklabs/agent-tookkit/langchain`: Helpers for integrating with [Langchain's JS SDK](https://github.com/langchain-ai/langchainjs).
- `@knocklabs/agent-toolkit/openai`: Helpers for integrating with the OpenAI SDK.
- `@knocklabs/agent-toolkit/modelcontextprotocol`: Low level helpers for integrating with the Model Context Protocol (MCP).

## Prerequisites

- You must have a [Knock account](https://dashboard.knock.app/signup).
- You must have a [service token generated](https://docs.knock.app/developer-tools/service-tokens) on your Knock account. The Knock agent toolkit uses your service token to interact with your Knock account.

## Available tools

The agent toolkit exposes a large subset of the [Knock Management API](https://docs.knock.app/mapi) and [API](https://docs.knock.app/reference) that you might need to invoke via an agent. You can see the full list of tools in the source code.

## Context

It's possible to pass additional context to the configuration of each library to help scope the calls made by the agent toolkit to Knock. The available properties to configure are:

- `environment`: The slug of the Knock environment you wish to execute actions in by default, such as `development`.
- `userId`: The user ID of the current user. When set, this will be the default passed to user tools.
- `tenantId`: The ID of the current tenant. When set, will be the default passed to any tool that accepts the tenant.

## Usage

### Model Context Protocol (MCP)

To start using the Knock MCP as a local server, you must start it with a service token. You can run it using `npx`.

```
npx -y @knocklabs/agent-toolkit -p local-mcp --service-token kst_12345
```

By default, the MCP server will expose **all tools** to the LLM. To limit the tools available you can use the `--tools` (`-t`) flag:

```
// Pass all tools
npx -y @knocklabs/agent-toolkit -p local-mcp --tools="*"

// Specific category
npx -y @knocklabs/agent-toolkit -p local-mcp --tools "workflows.*"

// Specific tools
npx -y @knocklabs/agent-toolkit -p local-mcp --tools "workflows.triggerWorkflow"
```

It's also possible to pass `environment`, `userId`, and `tenant` to the local MCP server to set default values. Use the `--help` flag to view additional server options.

### AI SDK

The agent toolkit provides a `createKnockToolkit` under the `/ai-sdk` path for easily integrating into the AI SDK and returning tools ready for use.

1. Install the package:

```
npm install @knocklabs/agent-toolkit
```

2. Import the `createKnockToolkit` helper, configure it, and use it in your LLM calling:

```typescript
import { createKnockToolkit } from "@knocklabs/agent-toolkit/ai-sdk";
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { systemPrompt } from "@/lib/ai/prompts";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const toolkit = await createKnockToolkit({
    serviceToken: "kst_12345",
    permissions: {
      workflows: { read: true, run: true, manage: true },
    },
  });

  const result = streamText({
    model: openai("gpt-4o"),
    messages,
    tools: {
      // The tools given here are determined by the `permissions`
      // list above in the configuration. For instance, here we're only
      // allowing the workflows
      ...toolkit.getAllTools(),
    },
  });

  return result.toDataStreamResponse();
}
```

### OpenAI

The agent toolkit provides a `createKnockToolkit` under the `/openai` path for easily integrating into the Open AI SDK and returning tools ready for use.

1. Install the package:

```
npm install @knocklabs/agent-toolkit
```

2. Import the `createKnockToolkit` helper, configure it, and use it in your LLM calling:

```typescript
import { createKnockToolkit } from "@knocklabs/agent-toolkit/openai";
import OpenAI from "openai";

const openai = new OpenAI();

async function main() {
  const toolkit = await createKnockToolkit({
    serviceToken: "kst_12345",
    permissions: {
      // Set the permissions of the tools to expose
      workflows: { read: true, run: true, manage: true },
    },
  });

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages,
    // The tools given here are determined by the `permissions`
    // list above in the configuration. For instance, here we're only
    // allowing the workflows
    tools: toolkit.getAllTools(),
  });

  // Execute the tool calls
  const toolMessages = await Promise.all(
    message.tool_calls.map((tc) => toolkit.handleToolCall(tc))
  );
}

main();
```

### Langchain

The agent toolkit provides a `createKnockToolkit` under the `/langchain` path for easily integrating into the Lanchain JS SDK and returning tools ready for use.

1. Install the package:

```
npm install @knocklabs/agent-toolkit
```

2. Import the `createKnockToolkit` helper, configure it, and use it in your LLM calling:

```typescript
import { createKnockToolkit } from '@knocklabs/agent-toolkit/langchain';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { LangChainAdapter } from 'ai';

const systemPrompt = `You are a helpful assistant.`;

export const maxDuration = 30;

export async function POST(req: Request) {
  const { prompt } = await req.json();
  // Optional - get the auth context from the request
  const authContext = await auth.protect();

  // Instantiate a new Knock toolkit
  const toolkit = await createKnockToolkit({
    serviceToken: "kst_12345",
    permissions: {
      // (optional but recommended): Set the permissions of the tools to expose
      workflows: { read: true, run: true, manage: true },
    },
  });

  const model = new ChatOpenAI({ model: 'gpt-4o', temperature: 0 });

  const modelWithTools = model.bindTools(toolkit.getAllTools());

  const messages = [new SystemMessage(systemPrompt), new HumanMessage(prompt)];
  const aiMessage = await modelWithTools.invoke(messages);
  messages.push(aiMessage);

  for (const toolCall of aiMessage.tool_calls || []) {
    // Call the selected tool by its `name`
    const selectedTool = toolkit.getToolMap()[toolCall.name];
    const toolMessage = await selectedTool.invoke(toolCall);

    messages.push(toolMessage);
  }

  // To simplify the setup, this example uses the ai-sdk langchain adapter
  // to stream the results back to the /langchain page.
  // For more details, see: https://sdk.vercel.ai/providers/adapters/langchain
  const stream = await modelWithTools.stream(messages);
  return LangChainAdapter.toDataStreamResponse(stream);
}
```