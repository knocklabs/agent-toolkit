import { describe, expect, it, vi } from "vitest";

import { createKnockClient } from "../knock-client.js";

describe("createKnockClient public API exchange", () => {
  it("omits environment when no tool or config override exists", async () => {
    const client = createKnockClient({ serviceToken: "omitted-environment" });
    const exchange = vi
      .spyOn(client.apiKeys, "exchange")
      .mockResolvedValue({ api_key: "pk_test" } as never);

    await client.publicApi();

    expect(exchange).toHaveBeenCalledWith();
  });

  it("uses the configured environment override", async () => {
    const client = createKnockClient({
      serviceToken: "configured-environment",
      environment: "staging",
    });
    const exchange = vi
      .spyOn(client.apiKeys, "exchange")
      .mockResolvedValue({ api_key: "pk_test" } as never);

    await client.publicApi();

    expect(exchange).toHaveBeenCalledWith({ environment: "staging" });
  });

  it("gives the tool environment precedence over configuration", async () => {
    const client = createKnockClient({
      serviceToken: "tool-environment",
      environment: "staging",
    });
    const exchange = vi
      .spyOn(client.apiKeys, "exchange")
      .mockResolvedValue({ api_key: "pk_test" } as never);

    await client.publicApi("production");

    expect(exchange).toHaveBeenCalledWith({ environment: "production" });
  });
});
