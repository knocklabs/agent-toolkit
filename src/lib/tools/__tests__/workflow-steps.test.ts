import { describe, it, expect, vi, beforeEach } from "vitest";

import type { KnockClient } from "../../knock-client.js";
import { workflowStepTools } from "../workflow-steps.js";

const mockWorkflow = {
  key: "wf-1",
  name: "WF",
  steps: [] as unknown[],
  description: "",
  active: true,
  created_at: "",
};

describe("createOrUpdateEmailStepInWorkflow", () => {
  const config = { serviceToken: "test" };

  let upsertMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    upsertMock = vi.fn().mockResolvedValue({
      workflow: mockWorkflow,
    });
  });

  function makeClient(): KnockClient {
    return {
      workflows: {
        retrieve: vi.fn().mockResolvedValue(mockWorkflow),
        upsert: upsertMock,
      },
      channels: {
        list: vi.fn().mockResolvedValue({
          entries: [{ key: "email-1", type: "email" }],
        }),
      },
    } as unknown as KnockClient;
  }

  function getUpsertedEmailTemplate() {
    const [, params] = upsertMock.mock.calls[0] as [
      string,
      { workflow: { steps: { template: Record<string, unknown> }[] } },
    ];
    const steps = params.workflow.steps;
    return steps[steps.length - 1].template;
  }

  it("includes only html_content when htmlContent is set with blocks: []", async () => {
    const run =
      workflowStepTools.createOrUpdateEmailStepInWorkflow.bindExecute(
        makeClient(),
        config
      );

    await run({
      workflowKey: "wf-1",
      layoutKey: "default",
      subject: "Hi",
      htmlContent: "<p>x</p>",
      blocks: [],
    });

    const template = getUpsertedEmailTemplate();
    expect(template).toHaveProperty("html_content", "<p>x</p>");
    expect(template).not.toHaveProperty("visual_blocks");
  });

  it("includes only visual_blocks when using blocks without htmlContent", async () => {
    const run =
      workflowStepTools.createOrUpdateEmailStepInWorkflow.bindExecute(
        makeClient(),
        config
      );

    await run({
      workflowKey: "wf-1",
      layoutKey: "default",
      subject: "Hi",
      blocks: [{ type: "markdown", content: "Hello" }],
    });

    const template = getUpsertedEmailTemplate();
    expect(template).toHaveProperty("visual_blocks");
    expect(template).not.toHaveProperty("html_content");
  });

  it("rejects non-empty htmlContent and blocks together", async () => {
    const run =
      workflowStepTools.createOrUpdateEmailStepInWorkflow.bindExecute(
        makeClient(),
        config
      );

    const res = await run({
      workflowKey: "wf-1",
      layoutKey: "default",
      subject: "Hi",
      htmlContent: "<p>x</p>",
      blocks: [{ type: "markdown", content: "y" }],
    });
    expect(res).toMatchObject({
      message: expect.stringMatching(/not both/i),
    });
  });

  it("rejects when neither htmlContent nor blocks are provided", async () => {
    const run =
      workflowStepTools.createOrUpdateEmailStepInWorkflow.bindExecute(
        makeClient(),
        config
      );

    const res = await run({
      workflowKey: "wf-1",
      layoutKey: "default",
      subject: "Hi",
    });
    expect(res).toMatchObject({
      message: expect.stringMatching(/either htmlContent/i),
    });
  });

});
