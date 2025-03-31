import { toolPermissions } from "./lib/tools/index.js";

export interface Config {
  /**
   * The token to use to authenticate with the service.
   */
  serviceToken: string;

  /**
   * When set calls will be made as this user.
   */
  userId?: string | undefined;

  /**
   * When set calls will be made in this tenant context.
   */
  tenantId?: string | undefined;

  /**
   * The environment to use as the basis for the API calls. When not defined, will default to
   * the `development` environment.
   */
  environment?: string | undefined;
}

export type TransformPermissions<T> = {
  [K in keyof T]?: {
    [P in keyof T[K]]?: boolean;
  };
};

export interface ToolkitConfig extends Config {
  permissions: TransformPermissions<typeof toolPermissions>;
}

export type ToolCategory = keyof typeof toolPermissions;
