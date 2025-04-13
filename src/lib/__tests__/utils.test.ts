import { describe, it, expect, vi } from "vitest";

// Mock the tools and toolPermissions imports
vi.mock("../tools/index.js", () => ({
  tools: {
    users: {
      getUser: { name: "getUser" },
      createOrUpdateUser: { name: "createOrUpdateUser" },
    },
    messages: {
      getMessageContent: { name: "getMessageContent" },
    },
  },
  toolPermissions: {
    users: {
      read: ["getUser"],
      manage: ["createOrUpdateUser"],
    },
    messages: {
      read: ["getMessageContent"],
    },
  },
}));

import {
  filterTools,
  getToolsWithPermissions,
  getToolsByPermissionsInCategories,
  serializeMessageResponse,
} from "../utils.js";
import { KnockTool } from "../knock-tool.js";
import { ToolkitConfig } from "../../types.js";

// Mock tools data for direct use in tests
const mockTools = {
  users: {
    getUser: { name: "getUser" } as KnockTool,
    createOrUpdateUser: { name: "createOrUpdateUser" } as KnockTool,
  },
  messages: {
    getMessageContent: { name: "getMessageContent" } as KnockTool,
  },
};

describe("utils", () => {
  describe("filterTools", () => {
    it("should throw error when no pattern is provided", () => {
      expect(() => filterTools(mockTools, undefined)).toThrow(
        "No pattern provided"
      );
    });

    it('should return all tools when pattern is "*"', () => {
      const result = filterTools(mockTools, "*");
      expect(result).toHaveLength(3);
      expect(result.map((tool) => tool.name)).toEqual([
        "getUser",
        "createOrUpdateUser",
        "getMessageContent",
      ]);
    });

    it('should return all tools in a category when pattern is "users.*"', () => {
      const result = filterTools(mockTools, "users.*");
      expect(result).toHaveLength(2);
      expect(result.map((tool) => tool.name)).toEqual([
        "getUser",
        "createOrUpdateUser",
      ]);
    });

    it('should return specific tool when pattern is "users.getUser"', () => {
      const result = filterTools(mockTools, "users.getUser");
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("getUser");
    });

    it("should throw error when category does not exist", () => {
      expect(() => filterTools(mockTools, "nonexistent.*")).toThrow(
        "Tool category nonexistent not found"
      );
    });

    it("should throw error when tool does not exist", () => {
      expect(() => filterTools(mockTools, "users.nonexistent")).toThrow(
        "Tool users.nonexistent not found"
      );
    });
  });

  describe("getToolsWithPermissions", () => {
    it("should return tools with read permission", () => {
      const result = getToolsWithPermissions("users", { read: true });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("getUser");
    });

    it("should return tools with manage permission", () => {
      const result = getToolsWithPermissions("users", { manage: true });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("createOrUpdateUser");
    });

    it("should return empty array when no permissions are granted", () => {
      const result = getToolsWithPermissions("users", {
        read: false,
        manage: false,
      });
      expect(result).toHaveLength(0);
    });

    it("should return multiple tools when multiple permissions are granted", () => {
      const result = getToolsWithPermissions("users", {
        read: true,
        manage: true,
      });
      expect(result).toHaveLength(2);
      expect(result.map((tool) => tool.name)).toEqual([
        "getUser",
        "createOrUpdateUser",
      ]);
    });
  });

  describe("getToolsByPermissionsInCategories", () => {
    it("should return tools for each category based on permissions", () => {
      const config: ToolkitConfig = {
        serviceToken: "test",
        permissions: {
          users: { read: true, manage: false },
          messages: { read: true },
        },
      };

      const result = getToolsByPermissionsInCategories(config);

      expect(result.users).toHaveLength(1);
      expect(result.users[0].name).toBe("getUser");

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].name).toBe("getMessageContent");
    });

    it("should handle categories with no permissions", () => {
      const config: ToolkitConfig = {
        serviceToken: "test",
        permissions: {
          users: { read: false, manage: false },
        },
      };

      const result = getToolsByPermissionsInCategories(config);
      expect(result.users).toHaveLength(0);
    });
  });

  describe("serializeMessageResponse", () => {
    it("should serialize message response correctly", () => {
      const message = {
        id: "123",
        status: "delivered",
        engagement_statuses: { email: "sent" },
        data: { content: "Hello" },
        metadata: { source: "api" },
        extraField: "should be excluded",
      };

      const result = serializeMessageResponse(message);

      expect(result).toEqual({
        id: "123",
        status: "delivered",
        engagement_statuses: { email: "sent" },
        data: { content: "Hello" },
        metadata: { source: "api" },
      });
    });
  });
});
