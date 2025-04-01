import { z } from "zod";
import { KnockTool } from "../knock-tool.js";

const getTenant = KnockTool({
  method: "get_tenant",
  name: "Get tenant",
  description: `
  Retrieves a tenant by their ID. Tenants in Knock are used to model organizations, teams, and other groups of users. They are a special type of object.
  
  Use this tool when you need to lookup the information about a tenant, including name, and if there are any custom properties set.
  `,
  parameters: z.object({
    environment: z
      .string()
      .optional()
      .describe(
        "(string): The environment to retrieve the tenant from. Defaults to `development`."
      ),
    tenantId: z
      .string()
      .describe("(string): The ID of the tenant to retrieve."),
  }),
  execute: (knockClient) => async (params) => {
    const publicClient = await knockClient.publicApi(params.environment);
    return await publicClient.tenants.get(params.tenantId);
  },
});

const listTenants = KnockTool({
  method: "list_tenants",
  name: "List tenants",
  description: `
  Retrieves a list of tenants. Tenants in Knock are used to model organizations, teams, and other groups of users. They are a special type of object. 
  
  Use this tool when you need to list all tenants in an environment.
  `,
  parameters: z.object({
    environment: z
      .string()
      .optional()
      .describe(
        "(string): The environment to retrieve the tenants from. Defaults to `development`."
      ),
  }),
  execute: (knockClient) => async (params) => {
    const publicClient = await knockClient.publicApi(params.environment);
    return await publicClient.tenants.list();
  },
});

const setTenant = KnockTool({
  method: "set_tenant",
  name: "Set tenant",
  description: `
  Creates or updates a tenant using the properties provided. Tenants in Knock are used to model organizations, teams, and other groups of users. They are a special type of object.
  
  Use this tool when you need to create a new tenant, or update an existing tenant's properties.
  `,
  parameters: z.object({
    environment: z
      .string()
      .optional()
      .describe(
        "(string): The environment to set the tenant in. Defaults to `development`."
      ),
    tenantId: z.string().describe("(string): The ID of the tenant to update."),
    name: z.string().optional().describe("(string): The name of the tenant."),
    properties: z
      .record(z.string(), z.any())
      .optional()
      .describe("(object): The properties to set on the tenant."),
  }),
  execute: (knockClient) => async (params) => {
    const publicClient = await knockClient.publicApi(params.environment);
    return await publicClient.tenants.set(params.tenantId, {
      name: params.name,
      ...params.properties,
    });
  },
});

export const tenants = {
  getTenant,
  listTenants,
  setTenant,
};

export const permissions = {
  read: ["getTenant", "listTenants"],
  manage: ["setTenant"],
};
