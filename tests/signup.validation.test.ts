import { describe, it, expect } from "vitest";
import { z } from "zod";

const FormSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Konfirmasi tidak sama" });

describe("SignUp validation", () => {
  it("valid payload passes", () => {
    const r = FormSchema.safeParse({ name: "Ananda", email: "a@a.com", password: "password123", confirm: "password123" });
    expect(r.success).toBe(true);
  });

  it("rejects short password", () => {
    const r = FormSchema.safeParse({ name: "A", email: "a@a.com", password: "123", confirm: "123" });
    expect(r.success).toBe(false);
  });

  it("rejects confirm mismatch", () => {
    const r = FormSchema.safeParse({ name: "Ananda", email: "a@a.com", password: "password123", confirm: "xxx" });
    expect(r.success).toBe(false);
  });
});
