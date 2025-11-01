import localforage from "localforage";

const STORE = "tx-queue-local";
localforage.config({ name: "wefinansio", storeName: STORE });

export type TxPayload = {
  accountId: string;
  categoryId?: string | null;
  type: "expense" | "income" | "transfer";
  amount: string;
  occurredAt: string;
  note?: string;
  clientId?: string;
  userId?: string;
};

export async function enqueueTx(payload: TxPayload) {
  const key = `tx_${payload.clientId ?? Date.now()}`;
  await localforage.setItem(key, payload);
}

export async function flushTxQueue() {
  const keys = await localforage.keys();
  for (const k of keys) {
    if (!k.startsWith("tx_")) continue;
    const payload = await localforage.getItem<TxPayload>(k);
    if (!payload) continue;
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) await localforage.removeItem(k);
    } catch (_) {
      // tetap antre kalau gagal
    }
  }
}

// Auto-flush saat online kembali
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    flushTxQueue();
  });
}

export async function submitTransaction(payload: TxPayload) {
  if (navigator.onLine) {
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) return true;
    } catch {}
  }
  await enqueueTx(payload);
  return false;
}

