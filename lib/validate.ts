import { z } from "zod";
import { ValidationError } from "./errors";

export async function parseJson<T extends z.ZodTypeAny>(req: Request, schema: T): Promise<z.infer<T>> {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.issues);
  return parsed.data;
}
