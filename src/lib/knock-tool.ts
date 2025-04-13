import type { ZodObject } from "zod";
import { z } from "zod";

import { Config } from "../types.js";

import { KnockClient } from "./knock-client.js";

export interface KnockToolDefinition {
  /**
   * The method name of the tool. This is a machine-readable string.
   */
  method: string;
  /**
   * The name of the tool. This can be used to reference the tool in the code.
   * A descriptive LLM-readable string.
   */
  name: string;

  /**
   * A descriptive prompt explaining the tool's purpose, including examples where useful.
   */
  description: string;

  /**
   * A descriptive prompt explaining the tool's purpose, usage and input parameters.
   * Ths is intended to be used by the underlying LLM.
   */
  fullDescription: string;

  /**
   * The Zod schema for the input parameters of the tool
   */
  parameters?: ZodObject<any>;
  /**
   * The actual implementation of the tool.
   */
  execute: (
    knockClient: KnockClient,
    config: Config
  ) => (input: any) => Promise<unknown>;
}

export interface KnockTool extends Omit<KnockToolDefinition, "execute"> {
  bindExecute: (
    knockClient: KnockClient,
    config: Config
  ) => (input: any) => Promise<unknown>;
}

const trimLines = (text: string) =>
  text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n");

export const KnockTool = (
  args: Omit<KnockToolDefinition, "fullDescription">
): KnockTool => {
  const { execute, ...restOfArgs } = args;
  const parameters = restOfArgs.parameters
    ? restOfArgs.parameters
    : z.object({});

  const schemaEntries = Object.entries(parameters.shape);

  const argsStr =
    schemaEntries.length === 0
      ? "Takes no arguments"
      : schemaEntries
          .map(([key, value]) => {
            return `- ${key}: ${(value as any).description || ""}`;
          })
          .join("\n");

  const fullDescription = trimLines(`
  Tool name:
  ${args.name}
  Description:
  ${args.description}.
  Arguments:
  ${argsStr}
  `);

  return {
    ...restOfArgs,
    parameters,
    fullDescription,
    bindExecute: (knockClient: KnockClient, config: Config) =>
      execute(knockClient, config),
  };
};
