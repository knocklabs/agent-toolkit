import { toolPermissions } from "./lib/tools/index.js";

export interface Config {
  /**
   * The token to use to authenticate with the service. If not provided, the `serviceToken`
   * will be resolved from `KNOCK_SERVICE_TOKEN` environment variable.
   */
  serviceToken?: string | undefined;

  /**
   * When set calls will be made as this user.
   */
  userId?: string | undefined;

  /**
   * When set calls will be made in this tenant context.
   */
  tenantId?: string | undefined;

  /**
   * An optional environment override for API calls. When omitted, requests do not
   * specify an environment and Knock uses the account default.
   */
  environment?: string | undefined;

  /**
   * Whether to hide user data from LLM responses. When true, the LLM will not have access to user
   * data and only the ID will be returned. Defaults to `false`.
   */
  hideUserData?: boolean | undefined;
}

export type TransformPermissions<T> = {
  [K in keyof T]?: {
    [P in keyof T[K]]?: boolean;
  };
};

export interface ToolkitConfig extends Config {
  /**
   * The permissions to use for the toolkit.
   */
  permissions: Omit<
    TransformPermissions<typeof toolPermissions>,
    "workflows"
  > & {
    workflows?: {
      /**
       * Whether to allow reading workflows.
       */
      read?: boolean | undefined;

      /**
       * Whether to allow managing workflows.
       */
      manage?: boolean | undefined;

      /**
       * Optionally specify a list of workflow keys to turn into workflow trigger tools
       *
       * If true, all workflows will be allowed.
       */
      trigger?: string[] | undefined;
    };
  };
}

export type ToolCategory = keyof typeof toolPermissions;
