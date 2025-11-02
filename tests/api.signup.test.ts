import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock db & schema minimal
vi.mock("@/lib/db", () => {
  return {
    db: {
      select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }) }) }),
      insert: vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: "u1", email: "a@a.com", name: "A" }]) }) })
    }
  };
});
vi.mock("@/lib/db/schema", () => ({ users: {} }));

import { POST } from "@/app/api/auth/signup/route";

interface SignupBody {
  name: string;
  email: string;
  password: string;
}

function req(body: SignupBody) {
  return new Request("http://localhost/api/auth/signup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/signup", () => {
  it("creates new user", async () => {
    const res = await POST(req({ name: "A", email: "a@a.com", password: "password123" }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.user.email).toBe("a@a.com");
  });

  it("rejects invalid email", async () => {
    const res = await POST(req({ name: "A", email: "invalid", password: "password123" }));
    expect(res.status).toBe(400);
  });
});
