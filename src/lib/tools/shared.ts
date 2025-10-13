import { z } from "zod";

const recipientSchema = z
  .union([
    z.string().describe("A user ID (string)."),
    z
      .object({ id: z.string(), collection: z.string() })
      .describe("A reference to an object in a collection."),
  ])
  .describe(
    "A recipient can be a user ID or a reference to an object in a collection."
  );

const conditionSchema = z
  .object({
    operator: z
      .enum([
        "equal_to",
        "not_equal_to",
        "greater_than",
        "less_than",
        "greater_than_or_equal_to",
        "less_than_or_equal_to",
        "contains",
        "not_contains",
        "contains_all",
        "empty",
        "not_empty",
      ])
      .describe("(string): The operator to apply to the argument."),
    variable: z
      .string()
      .describe(
        "(string): The variable to check against (e.g., 'recipient.email', 'data.property')."
      ),
    argument: z
      .string()
      .optional()
      .describe(
        "(string): The argument of the condition. Can be empty when using empty or not_empty operators."
      ),
  })
  .describe("(object): A condition.");

export { conditionSchema, recipientSchema };
