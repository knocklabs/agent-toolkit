import { describe, it, expect } from "vitest";

import { conditionSchema } from "../shared.js";

describe("conditionSchema", () => {
  it("accepts a condition with argument when operator requires it", () => {
    const result = conditionSchema.safeParse({
      operator: "equal_to",
      variable: "recipient.email",
      argument: "john@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a condition missing argument when operator requires it", () => {
    const result = conditionSchema.safeParse({
      operator: "equal_to",
      variable: "recipient.email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a condition with argument when operator forbids it", () => {
    const result = conditionSchema.safeParse({
      operator: "not_empty",
      variable: "recipient.id",
      argument: "should-not-be-here",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a no-argument operator without argument", () => {
    const result = conditionSchema.safeParse({
      operator: "not_empty",
      variable: "recipient.id",
    });
    expect(result.success).toBe(true);
  });
});
