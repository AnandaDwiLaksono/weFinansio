// lib/offline-queue.ts
import localforage from "localforage";

export type OfflineJob = {
  id: string;                // clientId (uuid)
  url: string;               // endpoint, mis: /api/transactions
  method: "POST"|"PUT"|"PATCH"|"DELETE";
  headers?: Record<string,string>;
  body?: Record<string, unknown>;                // payload JSON
  queuedAt: number;          // Date.now()
  tryCount: number;
};

const STORE = "wefinansio-queue";
localforage.config({ name: "wefinansio", storeName: STORE });

export async function enqueueRequest(job: Omit<OfflineJob, "queuedAt"|"tryCount">) {
  const key = job.id || crypto.randomUUID();
  const item: OfflineJob = { ...job, id: key, queuedAt: Date.now(), tryCount: 0 };
  await localforage.setItem(`job_${key}`, item);
  return item.id;
}

export async function listJobsKeys() {
  const keys = await localforage.keys();
  return keys.filter(k => k.startsWith("job_"));
}

export async function flushQueueOnce(maxBatch = 25) {
  const keys = await listJobsKeys();
  const slice = keys.slice(0, maxBatch);
  for (const k of slice) {
    const job = await localforage.getItem<OfflineJob>(k);
    if (!job) { await localforage.removeItem(k); continue; }
    try {
      const res = await fetch(job.url, {
        method: job.method,
        headers: { "content-type": "application/json", ...(job.headers||{}) },
        body: job.body ? JSON.stringify(job.body) : undefined,
        cache: "no-store",
      });
      if (res.ok) {
        await localforage.removeItem(k);
      } else {
        // 4xx jangan di-loop; buang agar tidak macet selamanya
        if (res.status >= 400 && res.status < 500) {
          await localforage.removeItem(k);
        } else {
          // 5xx: simpan kembali, naikkan tryCount
          await localforage.setItem(k, { ...job, tryCount: job.tryCount + 1 });
        }
      }
    } catch {
      // tetap antre; network gagal
      await localforage.setItem(k, { ...job, tryCount: job.tryCount + 1 });
    }
  }
}

export function initOnlineAutoFlush() {
  if (typeof window === "undefined") return;

  let flushing = false;

  const run = async () => {
    if (flushing) return;

    flushing = true;

    try { await flushQueueOnce(50); } finally { flushing = false; }
  };

  window.addEventListener("online", run);
  
  // opsional: auto-flush saat load
  run();
}
