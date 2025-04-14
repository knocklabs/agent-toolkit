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

export { recipientSchema };
