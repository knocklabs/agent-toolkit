import { Workflow } from "@knocklabs/mgmt/resources/index.mjs";
import { describe, it, expect, vi } from "vitest";

import { createKnockClient } from "../../knock-client.js";
import { createWorkflowTools, workflowAsTool } from "../workflows-as-tools.js";

const knockClient = createKnockClient({
  serviceToken: "test",
});

// Mock the workflows.list method to return our mock workflow
vi.spyOn(knockClient.workflows, "list").mockImplementation(() => {
  return {
    async *[Symbol.asyncIterator]() {
      yield mockWorkflow as Workflow;
    },
  } as any;
});

const mockWorkflow = {
  name: "test",
  key: "test",
  description: "test",
  active: true,
  created_at: "2021-01-01",
};

describe("workflowAsTool", () => {
  it("should create a tool for a workflow", () => {
    const tool = workflowAsTool(mockWorkflow as Workflow);

    expect(tool).toBeDefined();
    expect(tool.name).toBe(`Trigger ${mockWorkflow.name} workflow`);
    expect(tool.description).toContain(mockWorkflow.name);
    expect(tool.description).toContain(mockWorkflow.key);
    expect(tool.parameters).toBeDefined();
  });
});

describe("createWorkflowTools", () => {
  it("should create a tool for each workflow returned", async () => {
    const tools = await createWorkflowTools(knockClient, {
      serviceToken: "test",
    });

    expect(tools.length).toBe(1);
    expect(tools[0].name).toBe(`Trigger ${mockWorkflow.name} workflow`);
  });

  it("should filter workflows by key and not return a tool for the workflow", async () => {
    const tools = await createWorkflowTools(
      knockClient,
      {
        serviceToken: "test",
      },
      ["test-other"]
    );

    expect(tools.length).toBe(0);
  });
});
