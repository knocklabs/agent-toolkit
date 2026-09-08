import { beforeEach, describe, expect, it, vi } from "vitest";

import type { KnockClient } from "../../knock-client.js";
import { messageTypes } from "../message-types.js";
import { messages } from "../messages.js";
import { objects } from "../objects.js";
import { users } from "../users.js";
import { createWorkflowTools, workflowAsTool } from "../workflows-as-tools.js";
import { workflows } from "../workflows.js";

function emptyPage() {
  return {
    async *[Symbol.asyncIterator]() {
      // No entries.
    },
  };
}

describe("Management API environment precedence", () => {
  const list = vi.fn(() => emptyPage());
  const client = {
    workflows: { list },
  } as unknown as KnockClient;

  beforeEach(() => {
    list.mockClear();
  });

  it("omits an environment when neither override exists", async () => {
    await workflows.listWorkflows.bindExecute(client, {})({});

    expect(list).toHaveBeenCalledWith({ environment: undefined });
  });

  it("uses configuration unless the tool argument overrides it", async () => {
    await workflows.listWorkflows.bindExecute(client, {
      environment: "staging",
    })({});
    await workflows.listWorkflows.bindExecute(client, {
      environment: "staging",
    })({ environment: "production" });

    expect(list).toHaveBeenNthCalledWith(1, { environment: "staging" });
    expect(list).toHaveBeenNthCalledWith(2, { environment: "production" });
  });
});

describe("message type catalog context", () => {
  const list = vi.fn(() => emptyPage());
  const client = {
    messageTypes: { list },
  } as unknown as KnockClient;

  beforeEach(() => {
    list.mockClear();
  });

  it("uses account-default root context when environment is omitted", async () => {
    await messageTypes.listMessageTypes.bindExecute(client, {})({});

    expect(list).toHaveBeenCalledWith({
      environment: undefined,
      branch: undefined,
    });
  });

  it("retains explicit environment and branch context", async () => {
    await messageTypes.listMessageTypes.bindExecute(
      client,
      {}
    )({
      environment: "development",
      branch: "feature-branch",
    });

    expect(list).toHaveBeenCalledWith({
      environment: "development",
      branch: "feature-branch",
    });
  });
});

describe("dynamically generated workflow tools", () => {
  it("omits environment while discovering workflows", async () => {
    const list = vi.fn(() => emptyPage());
    const client = {
      workflows: { list },
    } as unknown as KnockClient;

    await createWorkflowTools(client, {});

    expect(list).toHaveBeenCalledWith({ environment: undefined });
  });

  it("passes omitted and explicit environments to API-key exchange", async () => {
    const trigger = vi.fn().mockResolvedValue({ workflow_run_id: "run_1" });
    const publicApi = vi.fn().mockResolvedValue({
      workflows: { trigger },
    });
    const client = { publicApi } as unknown as KnockClient;
    const tool = workflowAsTool({
      key: "welcome",
      name: "Welcome",
      description: "",
      trigger_data_json_schema: null,
    } as never);
    const run = tool.bindExecute(client, {});

    await run({ recipients: ["user_1"] });
    await run({ environment: "production", recipients: ["user_1"] });

    expect(publicApi).toHaveBeenNthCalledWith(1, undefined);
    expect(publicApi).toHaveBeenNthCalledWith(2, "production");
  });
});

describe("public API backed tools", () => {
  it.each([
    {
      name: "user",
      tool: users.getUser,
      input: { userId: "user_1" },
      publicClient: {
        users: { get: vi.fn().mockResolvedValue({ id: "user_1" }) },
      },
    },
    {
      name: "message",
      tool: messages.getMessage,
      input: { messageId: "msg_1" },
      publicClient: {
        messages: { get: vi.fn().mockResolvedValue({ id: "msg_1" }) },
      },
    },
    {
      name: "object",
      tool: objects.getObject,
      input: { collection: "projects", objectId: "project_1" },
      publicClient: {
        objects: { get: vi.fn().mockResolvedValue({ id: "project_1" }) },
      },
    },
  ])(
    "supports omitted and explicit environments for $name tools",
    async ({ tool, input, publicClient }) => {
      const publicApi = vi.fn().mockResolvedValue(publicClient);
      const client = { publicApi } as unknown as KnockClient;
      const run = tool.bindExecute(client, {});

      await run(input);
      await run({ ...input, environment: "production" });

      expect(publicApi).toHaveBeenNthCalledWith(1, undefined);
      expect(publicApi).toHaveBeenNthCalledWith(2, "production");
    }
  );
});
