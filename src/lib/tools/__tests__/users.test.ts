import { describe, it, expect, vi, beforeEach } from "vitest";

import type { KnockClient } from "../../knock-client.js";
import { users } from "../users.js";

describe("user preference tools", () => {
  const config = { serviceToken: "test", userId: "config_user" };

  let getPreferencesMock: ReturnType<typeof vi.fn>;
  let setPreferencesMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getPreferencesMock = vi.fn().mockResolvedValue({
      workflows: { existing: { channel_types: { email: true } } },
      categories: {},
      channel_types: {},
    });
    setPreferencesMock = vi.fn().mockResolvedValue({});
  });

  function makeClient(): KnockClient {
    return {
      publicApi: vi.fn().mockResolvedValue({
        users: {
          getPreferences: getPreferencesMock,
          setPreferences: setPreferencesMock,
        },
      }),
    } as unknown as KnockClient;
  }

  describe("get_user_preferences", () => {
    it("passes the preference set id as a positional string", async () => {
      const run = users.getUserPreferences.bindExecute(makeClient(), config);

      await run({ userId: "user_1", preferenceSetId: "my-tenant" });

      expect(getPreferencesMock).toHaveBeenCalledWith("user_1", "my-tenant");
    });

    it("defaults the preference set id to `default`", async () => {
      const run = users.getUserPreferences.bindExecute(makeClient(), config);

      await run({ userId: "user_1" });

      expect(getPreferencesMock).toHaveBeenCalledWith("user_1", "default");
    });
  });

  describe("set_user_preferences", () => {
    it("reads existing preferences with a positional preference set id", async () => {
      const run = users.setUserPreferences.bindExecute(makeClient(), config);

      await run({
        userId: "user_1",
        workflows: { welcome: { channel_types: { email: false } } },
      });

      expect(getPreferencesMock).toHaveBeenCalledWith("user_1", "default");
    });

    it("writes with the preference set id and the merged body as separate arguments", async () => {
      const run = users.setUserPreferences.bindExecute(makeClient(), config);

      await run({
        userId: "user_1",
        workflows: { welcome: { channel_types: { email: false } } },
      });

      expect(setPreferencesMock).toHaveBeenCalledWith(
        "user_1",
        "default",
        expect.objectContaining({
          workflows: expect.objectContaining({
            existing: { channel_types: { email: true } },
            welcome: { channel_types: { email: false } },
          }),
        })
      );
    });
  });
});
