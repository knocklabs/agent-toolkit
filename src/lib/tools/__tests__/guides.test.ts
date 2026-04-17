import { describe, it, expect, vi, beforeEach } from "vitest";

import type { KnockClient } from "../../knock-client.js";
import { guides } from "../guides.js";

const mockMessageType = {
  key: "banner",
  semver: "1.0.0",
  variants: [{ key: "default" }],
};

const mockGuide = {
  key: "welcome",
  name: "Welcome",
  description: null,
  type: "default",
  active: true,
  steps: [],
};

describe("upsert_guide parameters schema", () => {
  const schema = guides.createOrUpdateGuide.parameters!;

  const validInput = {
    guideKey: "welcome",
    name: "Welcome",
    step: {
      schemaKey: "banner",
      schemaContent: { title: "hi" },
    },
  };

  describe("guideKey", () => {
    it("rejects a key shorter than 3 characters", () => {
      const result = schema.safeParse({ ...validInput, guideKey: "ab" });
      expect(result.success).toBe(false);
    });

    it("rejects a key that violates the regex pattern", () => {
      const result = schema.safeParse({
        ...validInput,
        guideKey: "Welcome Guide!",
      });
      expect(result.success).toBe(false);
    });

    it("accepts keys containing hyphens and underscores", () => {
      const result = schema.safeParse({
        ...validInput,
        guideKey: "welcome-guide_1",
      });
      expect(result.success).toBe(true);
    });

    it("normalizes uppercase to lowercase", () => {
      const result = schema.safeParse({
        ...validInput,
        guideKey: "Welcome_Guide",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.guideKey).toBe("welcome_guide");
      }
    });
  });

  describe("name", () => {
    it("rejects an empty name", () => {
      const result = schema.safeParse({ ...validInput, name: "" });
      expect(result.success).toBe(false);
    });

    it("rejects a name longer than 255 characters", () => {
      const result = schema.safeParse({
        ...validInput,
        name: "a".repeat(256),
      });
      expect(result.success).toBe(false);
    });
  });

  describe("description", () => {
    it("rejects a description longer than 280 characters", () => {
      const result = schema.safeParse({
        ...validInput,
        description: "a".repeat(281),
      });
      expect(result.success).toBe(false);
    });

    it("accepts an omitted description", () => {
      const result = schema.safeParse(validInput);
      expect(result.success).toBe(true);
    });
  });

  describe("channelKey", () => {
    it("defaults to knock-guide when omitted", () => {
      const result = schema.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.channelKey).toBe("knock-guide");
      }
    });
  });

  describe("step", () => {
    it("rejects an empty schemaKey", () => {
      const result = schema.safeParse({
        ...validInput,
        step: { ...validInput.step, schemaKey: "" },
      });
      expect(result.success).toBe(false);
    });

    it("applies defaults for ref and schemaVariantKey", () => {
      const result = schema.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.step.ref).toBe("step_1");
        expect(result.data.step.schemaVariantKey).toBe("default");
      }
    });
  });

  describe("activationUrlPatterns", () => {
    it("rejects a rule with neither pathname nor search", () => {
      const result = schema.safeParse({
        ...validInput,
        activationUrlPatterns: [{ directive: "allow" }],
      });
      expect(result.success).toBe(false);
    });

    it("accepts a rule with only pathname", () => {
      const result = schema.safeParse({
        ...validInput,
        activationUrlPatterns: [{ directive: "allow", pathname: "/dashboard" }],
      });
      expect(result.success).toBe(true);
    });

    it("accepts a rule with only search", () => {
      const result = schema.safeParse({
        ...validInput,
        activationUrlPatterns: [
          { directive: "allow", search: "*tour=welcome*" },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("accepts a rule with both pathname and search", () => {
      const result = schema.safeParse({
        ...validInput,
        activationUrlPatterns: [
          {
            directive: "allow",
            pathname: "/dashboard",
            search: "*tab=overview*",
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("rejects an invalid directive value", () => {
      const result = schema.safeParse({
        ...validInput,
        activationUrlPatterns: [{ directive: "deny", pathname: "/admin" }],
      });
      expect(result.success).toBe(false);
    });
  });
});

describe("upsert_guide execute", () => {
  const config = { serviceToken: "test" };

  let upsertMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    upsertMock = vi.fn().mockResolvedValue({ guide: mockGuide });
  });

  function makeClient(): KnockClient {
    return {
      messageTypes: {
        retrieve: vi.fn().mockResolvedValue(mockMessageType),
      },
      guides: {
        upsert: upsertMock,
      },
    } as unknown as KnockClient;
  }

  function getUpsertedGuide() {
    const [, params] = upsertMock.mock.calls[0] as [
      string,
      { guide: Record<string, unknown> },
    ];
    return params.guide;
  }

  it("omits optional fields when not provided", async () => {
    const run = guides.createOrUpdateGuide.bindExecute(makeClient(), config);

    await run({
      guideKey: "welcome",
      name: "Welcome",
      channelKey: "knock-guide",
      step: {
        ref: "step_1",
        schemaKey: "banner",
        schemaVariantKey: "default",
        schemaContent: { title: "hi" },
      },
    });

    const guide = getUpsertedGuide();
    expect(guide).not.toHaveProperty("description");
    expect(guide).not.toHaveProperty("target_property_conditions");
    expect(guide).not.toHaveProperty("activation_url_patterns");
  });

  it("sends activation_url_patterns with the provided pattern", async () => {
    const run = guides.createOrUpdateGuide.bindExecute(makeClient(), config);

    const patterns = [{ directive: "allow", pathname: "/dashboard" }];
    await run({
      guideKey: "welcome",
      name: "Welcome",
      channelKey: "knock-guide",
      step: {
        ref: "step_1",
        schemaKey: "banner",
        schemaVariantKey: "default",
        schemaContent: { title: "hi" },
      },
      activationUrlPatterns: patterns,
    });

    const guide = getUpsertedGuide();
    expect(guide).toHaveProperty("activation_url_patterns", patterns);
  });
});
