import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  db: { transaction: vi.fn() },
  getSession: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: mocks.db }));
vi.mock("@/lib/auth", () => ({ getSession: mocks.getSession }));

import { POST } from "@/app/api/transactions/route";
import { accounts, categories, transactions } from "@/lib/db/schema";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const SOURCE_ID = "22222222-2222-4222-8222-222222222222";
const DESTINATION_ID = "33333333-3333-4333-8333-333333333333";
const CLIENT_ID = "client-transfer-01";

type StoredTransaction = {
  id: string;
  userId: string;
  occurredAt: string;
  amount: string;
  type: "income" | "expense" | "transfer";
  accountId: string;
  transferToAccountId: string | null;
  categoryId: string | null;
  note: string | null;
  clientId: string | null;
};

type FakeState = {
  transactions: StoredTransaction[];
  transactionCalls: number;
  updateAttempts: number;
  persistedBalanceUpdates: number;
  failOnBalanceUpdate: number | null;
  updateRanInsideTransaction: boolean;
};

let state: FakeState;
let nextTransactionId = 0;

function createFakeTransaction(current: FakeState) {
  let transactionIsActive = true;

  const tx = {
    select: () => {
      let table: unknown;
      const builder = {
        from(tableValue: unknown) {
          table = tableValue;
          return builder;
        },
        where() {
          return builder;
        },
        async limit() {
          if (table === transactions) {
            const row = current.transactions.find((item) => item.clientId === CLIENT_ID);
            return row ? [row] : [];
          }
          if (table === accounts) return [{ id: SOURCE_ID }];
          if (table === categories) return [];
          return [];
        },
      };
      return builder;
    },
    insert: (table: unknown) => ({
      values: (values: Record<string, unknown>) => ({
        onConflictDoNothing: () => ({
          returning: async () => {
            if (table !== transactions) return [];
            if (values.clientId && current.transactions.some((item) => item.clientId === values.clientId)) return [];
            nextTransactionId += 1;
            const row = { ...values, id: `transaction-${nextTransactionId}` } as StoredTransaction;
            current.transactions.push(row);
            return [{ id: row.id }];
          },
        }),
      }),
    }),
    update: () => ({
      set: () => ({
        where: () => ({
          returning: async () => {
            current.updateAttempts += 1;
            current.updateRanInsideTransaction = transactionIsActive;
            if (current.failOnBalanceUpdate === current.updateAttempts) throw new Error("simulated saldo update failure");
            current.persistedBalanceUpdates += 1;
            return [{ id: `account-update-${current.updateAttempts}` }];
          },
        }),
      }),
    }),
  };

  return {
    tx,
    close: () => { transactionIsActive = false; },
  };
}

function request(overrides: Partial<{
  amount: number;
  clientId: string;
  accountId: string;
  transferToAccountId: string;
}> = {}) {
  return new Request("http://localhost/api/transactions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      occurredAt: "2026-10-29",
      amount: overrides.amount ?? 125000,
      type: "transfer",
      accountId: overrides.accountId ?? SOURCE_ID,
      transferToAccountId: overrides.transferToAccountId ?? DESTINATION_ID,
      clientId: overrides.clientId ?? CLIENT_ID,
    }),
  });
}

beforeEach(() => {
  state = {
    transactions: [],
    transactionCalls: 0,
    updateAttempts: 0,
    persistedBalanceUpdates: 0,
    failOnBalanceUpdate: null,
    updateRanInsideTransaction: false,
  };
  nextTransactionId = 0;
  mocks.getSession.mockResolvedValue({ user: { id: USER_ID } });
  mocks.db.transaction.mockReset();
  mocks.db.transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
    state.transactionCalls += 1;
    const snapshot = {
      transactions: [...state.transactions],
      persistedBalanceUpdates: state.persistedBalanceUpdates,
    };
    const fake = createFakeTransaction(state);
    try {
      return await callback(fake.tx);
    } catch (error) {
      state.transactions = snapshot.transactions;
      state.persistedBalanceUpdates = snapshot.persistedBalanceUpdates;
      throw error;
    } finally {
      fake.close();
    }
  });
});

describe("POST /api/transactions transfer safety", () => {
  it("writes a transfer and both balance changes inside one database transaction", async () => {
    const response = await POST(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.id).toBe("transaction-1");
    expect(state.transactionCalls).toBe(1);
    expect(state.transactions).toHaveLength(1);
    expect(state.persistedBalanceUpdates).toBe(2);
    expect(state.updateRanInsideTransaction).toBe(true);
  });

  it("rolls back the transaction and first balance update if the second account update fails", async () => {
    state.failOnBalanceUpdate = 2;

    const response = await POST(request());

    expect(response.status).toBe(500);
    expect(state.transactions).toHaveLength(0);
    expect(state.persistedBalanceUpdates).toBe(0);
  });

  it("returns the existing transaction on a retry with the same clientId without changing balances again", async () => {
    const firstResponse = await POST(request());
    const firstBody = await firstResponse.json();
    const retryResponse = await POST(request());
    const retryBody = await retryResponse.json();

    expect(retryResponse.status).toBe(200);
    expect(retryBody.data.id).toBe(firstBody.data.id);
    expect(state.transactions).toHaveLength(1);
    expect(state.persistedBalanceUpdates).toBe(2);
    expect(state.transactionCalls).toBe(2);
  });

  it("rejects reuse of a clientId for a different transfer payload", async () => {
    await POST(request());

    const response = await POST(request({ amount: 200000 }));

    expect(response.status).toBe(409);
    expect(state.transactions).toHaveLength(1);
    expect(state.persistedBalanceUpdates).toBe(2);
  });
});
