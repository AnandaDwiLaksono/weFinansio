// lib/react-query.tsx
"use client";

import { QueryClient, QueryClientProvider, useMutation, UseMutationOptions, useQuery, UseQueryOptions } from "@tanstack/react-query";
import { ReactNode, useState } from "react";
import { api, apiFetch, ApiError } from "./api-client";
import { toast } from "sonner";

export function ReactQueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          if (error instanceof ApiError && error.status === 401) return false;
          return failureCount < 2;
        },
      },
      mutations: {
        retry: (failureCount, error) => {
          if (error instanceof ApiError && error.status < 500) return false;
          return failureCount < 1;
        },
      },
    },
  }));
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

/** Hook query yang otomatis handle ApiError + toast opsional */
export function useApiQuery<TData, TError = ApiError>(
  key: unknown[],
  fetcher: () => Promise<TData>,
  options?: UseQueryOptions<TData, TError>
) {
  return useQuery<TData, TError>({
    queryKey: key,
    queryFn: fetcher,
    ...options,
  });
}

/** Hook mutation yang otomatis toast error/sukses (bisa disable via options) */
export function useApiMutation<TData, TVariables = unknown, TError = ApiError>(
  mutationFn: (vars: TVariables) => Promise<TData>,
  options?: UseMutationOptions<TData, TError, TVariables> & { toastSuccess?: string | false; toastError?: string | false }
) {
  const { toastSuccess = "Berhasil", toastError = "Gagal", ...rest } = options || {};
  return useMutation<TData, TError, TVariables>({
    mutationFn,
    onSuccess: (data, vars, ctx, meta) => {
      if (toastSuccess) toast.success(toastSuccess);
      options?.onSuccess?.(data, vars, ctx, meta);
    },
    onError: (err: TError, vars, ctx, meta) => {
      if (toastError) {
        const msg = err instanceof ApiError ? err.message : toastError;
        toast.error(msg);
      }
      options?.onError?.(err, vars, ctx, meta);
    },
    ...rest,
  });
}

// Re-export api helper kalau mau import dari satu tempat
export { api, apiFetch, ApiError };
