"use client";

import { toast } from "sonner";

import { useApiMutation, api, ApiError } from "@/lib/react-query";
import { enqueueRequest } from "@/lib/offline-queue";

type Opts<TData, TVariables> = {
  url: string;
  method?: "POST"|"PUT"|"PATCH"|"DELETE";
  serialize?: (vars: TVariables) => unknown;     // default: vars apa adanya
  injectClientId?: (vars: unknown ) => unknown;       // untuk idempotensi (clientId)
  toastQueued?: string | false;              // pesan saat di-queue
  toastSuccess?: string | false;             // override bawaan useApiMutation
  toastError?: string | false;               // override bawaan useApiMutation
  onSuccess?: (data: TData, vars: TVariables) => void;
  onQueued?: (vars: TVariables, clientId: string) => void;
};

export function useOfflineMutation<TData = unknown, TVariables = unknown>(opts: Opts<TData, TVariables>) {
  const {
    url,
    method = "POST",
    serialize = (v) => v,
    injectClientId,
    toastQueued = "Disimpan offline. Akan tersinkron saat online.",
    toastSuccess,
    toastError,
    onSuccess,
    onQueued,
  } = opts;

  const m = useApiMutation<TData, TVariables>(
    async (vars) => {
      const payload0 = serialize(vars);
      const payload = typeof injectClientId === "function" ? injectClientId(payload0) : payload0;

      // kalau offline → langsung queue
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        const id = (payload && typeof payload === "object" && "clientId" in payload && typeof payload.clientId === "string") 
          ? payload.clientId 
          : crypto.randomUUID();
        await enqueueRequest({ id, url, method, body: payload as Record<string, unknown> });
        onQueued?.(vars, id);
        if (toastQueued) toast.info(toastQueued);
        // kembalikan dummy agar UI lanjut; tidak error
        return { queued: true, clientId: id } as unknown as TData;
      }

      // online → coba call API
      try {
        const apiPayload = payload as string | number | boolean | Record<string, unknown> | unknown[] | null | undefined;
        if (method === "POST")   return await api.post<TData>(url, apiPayload);
        if (method === "PUT")    return await api.put<TData>(url, apiPayload);
        if (method === "PATCH")  return await api.patch<TData>(url, apiPayload);
        if (method === "DELETE") return await api.del<TData>(url);
        throw new Error("Unsupported method");
      } catch (e: unknown) {
        // error jaringan/5xx → queue
        const isRetryable =
          (e as Error)?.name === "TypeError" || // fetch failed
          (e instanceof ApiError && (e.status >= 500 || e.code === "TIMEOUT"));
        if (isRetryable) {
          const id = (payload && typeof payload === "object" && "clientId" in payload && typeof payload.clientId === "string") 
            ? payload.clientId 
            : crypto.randomUUID();
          await enqueueRequest({ id, url, method, body: payload as Record<string, unknown> });
          onQueued?.(vars, id);
          if (toastQueued) toast.info(toastQueued);
          return { queued: true, clientId: id } as unknown as TData;
        }
        // 4xx tetap lempar error
        throw e;
      }
    },
    {
      toastSuccess: toastSuccess ?? "Berhasil",
      toastError: toastError ?? "Gagal",
      onSuccess: (data, vars) => onSuccess?.(data, vars as TVariables),
    }
  );

  return m;
}
