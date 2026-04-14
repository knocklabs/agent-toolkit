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

const noArgumentOperators = [
  "empty",
  "not_empty",
  "exists",
  "not_exists",
  "is_timestamp",
] as const;

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
        "not_contains_all",
        ...noArgumentOperators,
      ])
      .describe("(string): The operator to apply to the argument."),
    variable: z.string().describe("(string): The variable of the condition."),
    argument: z
      .string()
      .optional()
      .describe(
        `(string): The argument of the condition. Required unless operator is ${noArgumentOperators.join(", ")}.`
      ),
  })
  .superRefine((data, ctx) => {
    const operatorRequiresNoArgument = (
      noArgumentOperators as readonly string[]
    ).includes(data.operator);

    if (operatorRequiresNoArgument && data.argument) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["argument"],
        message: `argument must be empty when operator is ${data.operator}`,
      });
    } else if (!operatorRequiresNoArgument && !data.argument) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["argument"],
        message: `argument is required when operator is ${data.operator}`,
      });
    }
  })
  .describe("(object): A condition.");

export { conditionSchema, recipientSchema };
