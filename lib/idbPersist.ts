import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { queryClient } from "./queryClient";

export function enableQueryPersistence() {
  if (typeof window === "undefined") return;
  const persister = createSyncStoragePersister({ storage: window.localStorage });
  persistQueryClient({ queryClient, persister, maxAge: 1000 * 60 * 60 * 24 });
}
