import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),
  NEXTAUTH_URL: z.string().url("NEXTAUTH_URL must be a valid URL").optional(),
  NEXTAUTH_SECRET: z.string().min(32, "NEXTAUTH_SECRET must be at least 32 characters").optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export function validateEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("\n");
      throw new Error(`Environment variable validation failed:\n${issues}`);
    }
    throw error;
  }
}

// Validate on import (server-side only)
// Skip validation during build time or when DATABASE_URL is not needed
if (typeof window === "undefined" && process.env.DATABASE_URL && process.env.NODE_ENV !== "production") {
  // Only validate in development/test environments where we can safely fail early
  try {
    validateEnv();
  } catch (error) {
    // Log warning but don't crash during build
    console.warn("Environment validation warning:", error instanceof Error ? error.message : error);
  }
}
