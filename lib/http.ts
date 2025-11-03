import { NextResponse } from "next/server";
import { AppError, toAppError } from "./errors";

export type OkBody<T> = { ok: true; data: T; meta: { requestId: string; ts: string } };
export type ErrBody = { ok: false; error: { code: string; message: string; details?: unknown }; meta: { requestId: string; ts: string } };

function meta() {
  return { requestId: crypto.randomUUID(), ts: new Date().toISOString() };
}

export function jsonOk<T>(data: T, init?: number | ResponseInit) {
  const initObj = typeof init === "number" ? { status: init } : init;
  return NextResponse.json<OkBody<T>>({ ok: true, data, meta: meta() }, initObj);
}

export function jsonError(e: AppError | unknown, init?: ResponseInit) {
  const appErr = toAppError(e);
  const body: ErrBody = {
    ok: false,
    error: { code: appErr.code, message: appErr.message, details: appErr.details },
    meta: meta(),
  };
  return NextResponse.json(body, { status: appErr.status, ...init });
}

// Higher-order handler untuk route.ts: tangkap error otomatis
export function handleApi<TReq = Request, TRes = unknown>(
  fn: (req: TReq) => Promise<TRes> | TRes
) {
  return async (req: TReq) => {
    try {
      const data = await fn(req);
      return jsonOk(data as TRes);
    } catch (err) {
      return jsonError(err);
    }
  };
}
