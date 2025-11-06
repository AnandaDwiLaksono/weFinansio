// lib/api-client.ts
export type ApiOk<T> = { ok: true; data: T; meta: { requestId: string; ts: string } };
export type ApiErr = { ok: false; error: { code: string; message: string; details?: unknown }; meta: { requestId: string; ts: string } };

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;
  requestId?: string;

  constructor(message: string, code = "API_ERROR", status = 500, details?: unknown, requestId?: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
    this.requestId = requestId;
  }
}

type ApiFetchOptions = {
  method?: "GET"|"POST"|"PUT"|"PATCH"|"DELETE";
  headers?: Record<string, string>;
  body?: Record<string, unknown> | unknown[] | string | number | boolean | null;
  // timeout ms (default 15s)
  timeout?: number;
  // cache: default "no-store" untuk data dinamis
  cache?: RequestCache;
  // next: { revalidate?: number } // kalau mau SSG/ISR
};

/**
 * apiFetch memastikan format respons {ok,data,error,meta}
 * - otomatis throw ApiError saat ok=false atau status >=400
 * - ada timeout via AbortController
 * - default no-store (hindari cache yang bikin bingung)
 */
export async function apiFetch<T>(url: string, opts: ApiFetchOptions = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts?.timeout ?? 15000);

  try {
    const res = await fetch(url, {
      method: opts.method ?? "GET",
      headers: {
        "content-type": "application/json",
        ...(opts.headers ?? {}),
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      cache: opts.cache ?? "no-store",
      signal: controller.signal,
      credentials: "include", // kirim cookie untuk session
    });

    const isJson = (res.headers.get("content-type") || "").includes("application/json");
    const payload = isJson ? await res.json() : null;

    if (!res.ok) {
      // Jika server pakai format seragam, tangkap error-nya
      if (payload && payload.ok === false && payload.error) {
        const err = payload as ApiErr;
        throw new ApiError(
          err.error.message,
          err.error.code,
          res.status,
          err.error.details,
          err.meta?.requestId
        );
      }
      // fallback unknown
      throw new ApiError(res.statusText || "HTTP Error", "HTTP_ERROR", res.status);
    }

    // Pastikan format ok:true
    if (payload && payload.ok === true) {
      return (payload as ApiOk<T>).data;
    }

    // Jika endpoint belum standar (misal dari pihak ke-3)
    return payload as T;
  } catch (e: unknown) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new ApiError("Request timeout", "TIMEOUT", 408);
    }
    if (e instanceof ApiError) throw e;
    const message = e instanceof Error ? e.message : "Unknown error";
    throw new ApiError(message);
  } finally {
    clearTimeout(timeout);
  }
}

/** Helper HTTP pendek */
export const api = {
  get: <T>(url: string, opts?: Omit<ApiFetchOptions,"method"|"body">) => apiFetch<T>(url, { ...opts, method: "GET" }),
  post: <T>(url: string, body?: Record<string, unknown> | unknown[] | string | number | boolean | null, opts?: Omit<ApiFetchOptions,"method">) => apiFetch<T>(url, { ...opts, method: "POST", body }),
  put : <T>(url: string, body?: Record<string, unknown> | unknown[] | string | number | boolean | null, opts?: Omit<ApiFetchOptions,"method">) => apiFetch<T>(url, { ...opts, method: "PUT", body }),
  patch:<T>(url: string, body?: Record<string, unknown> | unknown[] | string | number | boolean | null, opts?: Omit<ApiFetchOptions,"method">) => apiFetch<T>(url, { ...opts, method: "PATCH", body }),
  del : <T>(url: string, opts?: Omit<ApiFetchOptions,"method"|"body">) => apiFetch<T>(url, { ...opts, method: "DELETE" }),
};
