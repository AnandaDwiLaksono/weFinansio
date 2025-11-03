export type ErrorJSON = {
  code: string;
  message: string;
  details?: unknown;
  status: number;
};

export class AppError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(message: string, code = "APP_ERROR", status = 500, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
  toJSON(): ErrorJSON {
    return { code: this.code, message: this.message, details: this.details, status: this.status };
  }
}

// 4xx family
export class BadRequestError extends AppError {
  constructor(message = "Bad Request", details?: unknown) { super(message, "BAD_REQUEST", 400, details); }
}
export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized", details?: unknown) { super(message, "UNAUTHORIZED", 401, details); }
}
export class ForbiddenError extends AppError {
  constructor(message = "Forbidden", details?: unknown) { super(message, "FORBIDDEN", 403, details); }
}
export class NotFoundError extends AppError {
  constructor(message = "Not Found", details?: unknown) { super(message, "NOT_FOUND", 404, details); }
}
export class ConflictError extends AppError {
  constructor(message = "Conflict", details?: unknown) { super(message, "CONFLICT", 409, details); }
}
export class RateLimitError extends AppError {
  constructor(message = "Too Many Requests", details?: unknown) { super(message, "RATE_LIMITED", 429, details); }
}

// 5xx family
export class InternalServerError extends AppError {
  constructor(message = "Internal Server Error", details?: unknown) { super(message, "INTERNAL_SERVER_ERROR", 500, details); }
}

// Zod-friendly
export class ValidationError extends BadRequestError {
  constructor(issues: unknown) { super("Validasi gagal", issues); this.code = "VALIDATION_ERROR"; }
}

// Fallback converter (termasuk Zod)
export function toAppError(err: unknown): AppError {
  // zod
  if (typeof err === "object" && err !== null && "issues" in err) {
    const e = err as { issues: unknown };
    return new ValidationError(e.issues);
  }
  if (err instanceof AppError) return err;
  if (err instanceof Error) return new AppError(err.message);
  return new AppError("Unknown error");
}
