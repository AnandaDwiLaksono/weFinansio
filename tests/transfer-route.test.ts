import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  db: { transaction: vi.fn() },
  getSession: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: mocks.db }));
vi.mock("@/lib/auth", () => ({ getSession: mocks.getSession }));

import { POST } from "@/app/api/accounts/transfer/route";
import { accounts, goalContributions, goals, transactions } from "@/lib/db/schema";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const SOURCE_ID = "22222222-2222-4222-8222-222222222222";
const DESTINATION_ID = "33333333-3333-4333-8333-333333333333";
const CLIENT_ID = "dedicated-transfer-01";

type StoredTransfer = {
  id: string;
  userId: string;
  occurredAt: string;
  amount: string;
  type: "transfer";
  accountId: string;
  transferToAccountId: string | null;
  categoryId: null;
  note: string | null;
  transferGroupId: string;
  clientId: string | null;
};

type FakeState = {
  transactions: StoredTransfer[];
  contributions: Record<string, unknown>[];
  transactionCalls: number;
  accountLookups: number;
  updateAttempts: number;
  persistedBalanceUpdates: number;
  failOnBalanceUpdate: number | null;
  updateRanInsideTransaction: boolean;
};

type SelectRows = Record<string, unknown>[];
type SelectBuilder = {
  from(table: unknown): SelectBuilder;
  where(...conditions: unknown[]): SelectBuilder;
  limit(count: number): Promise<SelectRows>;
  then<TResult1 = SelectRows, TResult2 = never>(
    onfulfilled?: ((value: SelectRows) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2>;
};

let state: FakeState;
let nextTransactionId = 0;

function createFakeTransaction(current: FakeState) {
  let transactionIsActive = true;
  const rowsForTable = (table: unknown): SelectRows => {
    if (table === transactions) return current.transactions.filter((row) => row.clientId === CLIENT_ID);
    if (table === goals) return [];
    if (table === goalContributions) return current.contributions;
    if (table === accounts) return [{ id: SOURCE_ID }];
    return [];
  };

  const tx = {
    query: {
      accounts: {
        findFirst: async () => {
          current.accountLookups += 1;
          return current.accountLookups % 2 === 1
            ? { id: SOURCE_ID, name: "Source" }
            : { id: DESTINATION_ID, name: "Destination" };
        },
      },
    },
    select: () => {
      let table: unknown;
      const builder: SelectBuilder = {
        from(tableValue) {
          table = tableValue;
          return builder;
        },
        where() {
          return builder;
        },
        async limit(count) {
          return rowsForTable(table).slice(0, count);
        },
        then(onfulfilled, onrejected) {
          return Promise.resolve(rowsForTable(table)).then(onfulfilled, onrejected);
        },
      };
      return builder;
    },
    insert: (table: unknown) => ({
      values: (values: Record<string, unknown>) => ({
        onConflictDoNothing: () => ({
          returning: async () => {
            if (table !== transactions) return [];
            if (values.clientId && current.transactions.some((row) => row.clientId === values.clientId)) return [];
            nextTransactionId += 1;
            const row = { ...values, id: `dedicated-${nextTransactionId}` } as StoredTransfer;
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

  return { tx, close: () => { transactionIsActive = false; } };
}

function request() {
  return new Request("http://localhost/api/accounts/transfer", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      fromAccountId: SOURCE_ID,
      toAccountId: DESTINATION_ID,
      amount: 99000,
      occurredAt: "2026-10-29T12:00:00.000Z",
      note: "Test transfer",
      clientId: CLIENT_ID,
    }),
  });
}

beforeEach(() => {
  state = {
    transactions: [],
    contributions: [],
    transactionCalls: 0,
    accountLookups: 0,
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
      contributions: [...state.contributions],
      persistedBalanceUpdates: state.persistedBalanceUpdates,
    };
    const fake = createFakeTransaction(state);
    try {
      return await callback(fake.tx);
    } catch (error) {
      state.transactions = snapshot.transactions;
      state.contributions = snapshot.contributions;
      state.persistedBalanceUpdates = snapshot.persistedBalanceUpdates;
      throw error;
    } finally {
      fake.close();
    }
  });
});

describe("POST /api/accounts/transfer", () => {
  it("stores one canonical transfer and updates both accounts atomically", async () => {
    const response = await POST(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.transferGroupId).toBeTruthy();
    expect(state.transactions).toHaveLength(1);
    expect(state.persistedBalanceUpdates).toBe(2);
    expect(state.updateRanInsideTransaction).toBe(true);
  });

  it("does not repeat balance effects or create another transfer on retry", async () => {
    const firstResponse = await POST(request());
    const firstBody = await firstResponse.json();
    const retryResponse = await POST(request());
    const retryBody = await retryResponse.json();

    expect(retryResponse.status).toBe(200);
    expect(retryBody.data.transferGroupId).toBe(firstBody.data.transferGroupId);
    expect(state.transactions).toHaveLength(1);
    expect(state.persistedBalanceUpdates).toBe(2);
  });

  it("rolls back the transfer if updating the destination account fails", async () => {
    state.failOnBalanceUpdate = 2;

    const response = await POST(request());

    expect(response.status).toBe(500);
    expect(state.transactions).toHaveLength(0);
    expect(state.persistedBalanceUpdates).toBe(0);
  });
});
