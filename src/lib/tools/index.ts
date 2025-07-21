import {
  broadcasts,
  permissions as broadcastsPermissions,
} from "./broadcasts.js";
import { channels, permissions as channelsPermissions } from "./channels.js";
import { commits, permissions as commitsPermissions } from "./commits.js";
import {
  documentation,
  permissions as documentationPermissions,
} from "./documentation.js";
import {
  emailLayouts,
  permissions as emailLayoutsPermissions,
} from "./email-layouts.js";
import {
  environments,
  permissions as environmentsPermissions,
} from "./environments.js";
import { guides, permissions as guidesPermissions } from "./guides.js";
import {
  messageTypes,
  permissions as messageTypesPermissions,
} from "./message-types.js";
import { messages, permissions as messagesPermissions } from "./messages.js";
import { objects, permissions as objectsPermissions } from "./objects.js";
import { partials, permissions as partialsPermissions } from "./partials.js";
import { tenants, permissions as tenantsPermissions } from "./tenants.js";
import { users, permissions as usersPermissions } from "./users.js";
import { workflows, permissions as workflowsPermissions } from "./workflows.js";

export const tools = {
  broadcasts,
  channels,
  commits,
  documentation,
  emailLayouts,
  environments,
  guides,
  messages,
  messageTypes,
  objects,
  partials,
  tenants,
  users,
  workflows,
};

export const allTools = {
  ...broadcasts,
  ...channels,
  ...commits,
  ...documentation,
  ...emailLayouts,
  ...environments,
  ...guides,
  ...messageTypes,
  ...messages,
  ...objects,
  ...partials,
  ...tenants,
  ...users,
  ...workflows,
};

export const toolPermissions = {
  broadcasts: broadcastsPermissions,
  channels: channelsPermissions,
  commits: commitsPermissions,
  documentation: documentationPermissions,
  emailLayouts: emailLayoutsPermissions,
  environments: environmentsPermissions,
  guides: guidesPermissions,
  messages: messagesPermissions,
  messageTypes: messageTypesPermissions,
  objects: objectsPermissions,
  partials: partialsPermissions,
  tenants: tenantsPermissions,
  users: usersPermissions,
  workflows: workflowsPermissions,
};
