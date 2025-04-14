import { Workflow } from "@knocklabs/mgmt/resources/index.mjs";
import { describe, it, expect, vi } from "vitest";

import { ToolkitConfig } from "../../types.js";
import { createKnockClient } from "../knock-client.js";
import { KnockTool } from "../knock-tool.js";
import {
  filterTools,
  getToolsWithPermissions,
  getToolsByPermissionsInCategories,
  serializeMessageResponse,
} from "../utils.js";

// Mock the tools and toolPermissions imports
vi.mock("../tools/index.js", () => ({
  tools: {
    users: {
      getUser: { name: "Get user", method: "getUser" } as KnockTool,
      createOrUpdateUser: {
        name: "Create or update user",
        method: "createOrUpdateUser",
      } as KnockTool,
    },
    messages: {
      getMessageContent: {
        name: "Get message content",
        method: "getMessageContent",
      } as KnockTool,
    },
    workflows: {
      listWorkflows: {
        name: "List workflows",
        method: "listWorkflows",
      } as KnockTool,
      triggerWorkflow: {
        name: "Trigger workflow",
        method: "trigger_workflow",
      } as KnockTool,
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
    workflows: {
      read: ["listWorkflows"],
      run: ["triggerWorkflow"],
    },
  },
}));

const knockClient = createKnockClient({
  serviceToken: "test",
});

const mockWorkflow = {
  name: "test",
  key: "test",
  description: "test",
  active: true,
  created_at: "2021-01-01",
};

const mockTools = {
  users: {
    getUser: { name: "Get user", method: "getUser" } as KnockTool,
    createOrUpdateUser: {
      name: "Create or update user",
      method: "createOrUpdateUser",
    } as KnockTool,
  },
  messages: {
    getMessageContent: {
      name: "Get message content",
      method: "getMessageContent",
    } as KnockTool,
  },
};

// Mock the workflows.list method to return our mock workflow
vi.spyOn(knockClient.workflows, "list").mockImplementation(() => {
  return {
    async *[Symbol.asyncIterator]() {
      yield mockWorkflow as Workflow;
    },
  } as any;
});

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
        "Get user",
        "Create or update user",
        "Get message content",
      ]);
    });

    it('should return all tools in a category when pattern is "users.*"', () => {
      const result = filterTools(mockTools, "users.*");
      expect(result).toHaveLength(2);
      expect(result.map((tool) => tool.name)).toEqual([
        "Get user",
        "Create or update user",
      ]);
    });

    it('should return specific tool when pattern is "users.getUser"', () => {
      const result = filterTools(mockTools, "users.getUser");
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Get user");
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
      expect(result[0].name).toBe("Get user");
    });

    it("should return tools with manage permission", () => {
      const result = getToolsWithPermissions("users", { manage: true });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Create or update user");
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
        "Get user",
        "Create or update user",
      ]);
    });
  });

  describe("getToolsByPermissionsInCategories", () => {
    it("should return tools for each category based on permissions", async () => {
      const config: ToolkitConfig = {
        serviceToken: "test",
        permissions: {
          users: { read: true, manage: false },
          messages: { read: true },
        },
      };

      const result = await getToolsByPermissionsInCategories(
        knockClient,
        config
      );

      expect(result.users).toHaveLength(1);
      expect(result.users[0].name).toBe("Get user");

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].name).toBe("Get message content");
    });

    it("should handle categories with no permissions", async () => {
      const config: ToolkitConfig = {
        serviceToken: "test",
        permissions: {
          users: { read: false, manage: false },
        },
      };

      const result = await getToolsByPermissionsInCategories(
        knockClient,
        config
      );
      expect(result.users).toHaveLength(0);
    });

    it("should return workflow tools when run permission is granted", async () => {
      const config: ToolkitConfig = {
        serviceToken: "test",
        permissions: { workflows: { run: true } },
      };

      const result = await getToolsByPermissionsInCategories(
        knockClient,
        config
      );

      expect(result.workflows).toHaveLength(2);

      expect(result.workflows[0].method).toBe("trigger_workflow");
      expect(result.workflows[1].method).toBe("trigger_test_workflow");
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
