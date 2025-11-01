// lib/db/schema.ts
import {
  pgTable,
  uuid,
  text,
  varchar,
  boolean,
  timestamp,
  date,
  numeric,
  pgEnum,
  primaryKey,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

/* =========================
   Enums (sesuai ERD)
========================= */

export const accountType = pgEnum("account_type", [
  "bank",
  "ewallet",
  "cash",
  "credit_card",
  "investment",
]);

export const categoryKind = pgEnum("category_kind", ["expense", "income"]);

export const txType = pgEnum("tx_type", ["expense", "income", "transfer"]);

export const txStatus = pgEnum("tx_status", ["pending", "cleared"]);

export const syncStatus = pgEnum("sync_status", ["pending", "synced", "failed"]);

export const assetType = pgEnum("asset_type", [
  "stock",
  "mutual_fund",
  "bond",
  "crypto",
  "cash",
]);

export const portfolioTxType = pgEnum("portfolio_tx_type", [
  "BUY",
  "SELL",
  "DIVIDEND",
  "INTEREST",
  "FEE",
  "ADJUST",
]);

/* =========================
   Core
========================= */

export const users = pgTable("users", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  currencyCode: varchar("currency_code", { length: 3 })
    .default("IDR")
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    name: varchar("name", { length: 120 }).notNull(),
    type: accountType("type").notNull(),

    institution: varchar("institution", { length: 120 }),
    currencyCode: varchar("currency_code", { length: 3 }).notNull().default("IDR"),

    archived: boolean("archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uqUserName: uniqueIndex("accounts_user_name_uq").on(t.userId, t.name),
    idxUser: index("accounts_user_idx").on(t.userId),
  }),
);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    name: varchar("name", { length: 120 }).notNull(),
    kind: categoryKind("kind").notNull(), // expense / income
    color: varchar("color", { length: 16 }),
    icon: varchar("icon", { length: 64 }),

    archived: boolean("archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uqPerUserNameKind: uniqueIndex("categories_user_name_kind_uq").on(
      t.userId,
      t.name,
      t.kind,
    ),
    idxUser: index("categories_user_idx").on(t.userId),
  }),
);

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),

    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),

    type: txType("type").notNull(), // expense/income/transfer
    amount: numeric("amount", { precision: 18, scale: 2 }).notNull(), // selalu positif
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    note: text("note"),

    status: txStatus("status").notNull().default("cleared"),

    transferToAccountId: uuid("transfer_to_account_id").references(
      () => accounts.id,
      { onDelete: "set null" },
    ),
    transferGroupId: uuid("transfer_group_id"),

    clientId: varchar("client_id", { length: 40 }),
    syncStatus: syncStatus("sync_status").notNull().default("synced"),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    idxUserOccurred: index("transactions_user_occurred_idx").on(
      t.userId,
      t.occurredAt,
    ),
    idxUserAccOccurred: index("transactions_user_acc_occurred_idx").on(
      t.userId,
      t.accountId,
      t.occurredAt,
    ),
    uqClientId: uniqueIndex("transactions_client_id_uq").on(t.clientId),
  }),
);

export const tags = pgTable(
  "tags",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 64 }).notNull(),
  },
  (t) => ({
    uqPerUserName: uniqueIndex("tags_user_name_uq").on(t.userId, t.name),
  }),
);

export const transactionTags = pgTable(
  "transaction_tags",
  {
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => transactions.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.transactionId, t.tagId], name: "transaction_tags_pk" }),
  }),
);

/* =========================
   Budgeting
========================= */

export const budgets = pgTable(
  "budgets",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),

    periodMonth: date("period_month").notNull(), // gunakan tanggal 1 (YYYY-MM-01)
    amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uqUserCatPeriod: uniqueIndex("budgets_user_cat_period_uq").on(
      t.userId,
      t.categoryId,
      t.periodMonth,
    ),
    idxUserPeriod: index("budgets_user_period_idx").on(t.userId, t.periodMonth),
  }),
);

/* =========================
   Goals (tabungan/target)
========================= */

export const goals = pgTable(
  "goals",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    name: varchar("name", { length: 160 }).notNull(),
    targetAmount: numeric("target_amount", { precision: 18, scale: 2 }).notNull(),
    targetDate: date("target_date"),
    note: text("note"),

    archived: boolean("archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    idxUser: index("goals_user_idx").on(t.userId),
  }),
);

export const goalContributions = pgTable(
  "goal_contributions",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    goalId: uuid("goal_id")
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    transactionId: uuid("transaction_id").references(() => transactions.id, {
      onDelete: "set null",
    }),

    amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    idxGoalDate: index("goal_contrib_goal_date_idx").on(t.goalId, t.occurredAt),
  }),
);

/* =========================
   Investasi / Portofolio
========================= */

export const assetsMaster = pgTable("assets_master", {
  symbol: varchar("symbol", { length: 16 }).primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  type: assetType("type").notNull(),
  currencyCode: varchar("currency_code", { length: 3 }).notNull().default("IDR"),
});

export const holdings = pgTable(
  "holdings",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    symbol: varchar("symbol", { length: 16 })
      .notNull()
      .references(() => assetsMaster.symbol, { onDelete: "cascade" }),

    qty: numeric("qty", { precision: 28, scale: 8 }).notNull().default("0"),
    avgPrice: numeric("avg_price", { precision: 18, scale: 4 }).notNull().default("0"),

    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uqUserSymbol: uniqueIndex("holdings_user_symbol_uq").on(t.userId, t.symbol),
    idxUser: index("holdings_user_idx").on(t.userId),
  }),
);

export const portfolioTx = pgTable(
  "portfolio_tx",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    accountId: uuid("account_id").references(() => accounts.id, {
      onDelete: "set null",
    }),

    symbol: varchar("symbol", { length: 16 })
      .notNull()
      .references(() => assetsMaster.symbol, { onDelete: "cascade" }),

    type: portfolioTxType("type").notNull(), // BUY/SELL/DIVIDEND/INTEREST/FEE/ADJUST

    qty: numeric("qty", { precision: 28, scale: 8 }).notNull().default("0"),
    price: numeric("price", { precision: 18, scale: 4 }).notNull().default("0"),
    fees: numeric("fees", { precision: 18, scale: 4 }).notNull().default("0"),

    amountCash: numeric("amount_cash", { precision: 18, scale: 2 }),

    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    note: text("note"),

    clientId: varchar("client_id", { length: 40 }),
    syncStatus: syncStatus("sync_status").notNull().default("synced"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    idxUserSymbolDate: index("portfolio_tx_user_symbol_date_idx").on(
      t.userId,
      t.symbol,
      t.occurredAt,
    ),
    uqClientId: uniqueIndex("portfolio_tx_client_id_uq").on(t.clientId),
  }),
);

export const assetPrices = pgTable(
  "asset_prices",
  {
    symbol: varchar("symbol", { length: 16 })
      .notNull()
      .references(() => assetsMaster.symbol, { onDelete: "cascade" }),
    day: date("date").notNull(),
    close: numeric("close", { precision: 18, scale: 4 }).notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.symbol, t.day], name: "asset_prices_pk" }),
  }),
);

/* =========================
   Recurring rules
========================= */

export const recurringRules = pgTable("recurring_rules", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),

  categoryId: uuid("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),

  type: txType("type").notNull(), // expense / income
  amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),

  frequency: varchar("frequency", { length: 32 }).notNull(), // cron-like / monthly / weekly
  nextRunAt: timestamp("next_run_at", { withTimezone: true }).notNull(),

  description: text("description"),
  active: boolean("active").notNull().default(true),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/* =========================
   Relations (opsional, untuk typed joins)
========================= */

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  categories: many(categories),
  transactions: many(transactions),
  tags: many(tags),
  budgets: many(budgets),
  goals: many(goals),
  goalContributions: many(goalContributions),
  holdings: many(holdings),
  portfolioTx: many(portfolioTx),
  recurringRules: many(recurringRules),
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
  transactions: many(transactions),
  portfolioTx: many(portfolioTx),
  recurringRules: many(recurringRules),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  user: one(users, { fields: [categories.userId], references: [users.id] }),
  transactions: many(transactions),
  budgets: many(budgets),
  recurringRules: many(recurringRules),
}));

export const transactionsRelations = relations(transactions, ({ one, many }) => ({
  user: one(users, { fields: [transactions.userId], references: [users.id] }),
  account: one(accounts, { fields: [transactions.accountId], references: [accounts.id] }),
  category: one(categories, { fields: [transactions.categoryId], references: [categories.id] }),
  transferTo: one(accounts, {
    fields: [transactions.transferToAccountId],
    references: [accounts.id],
  }),
  tags: many(transactionTags),
  goalContributions: many(goalContributions),
}));

export const tagsRelations = relations(tags, ({ one, many }) => ({
  user: one(users, { fields: [tags.userId], references: [users.id] }),
  transactionTags: many(transactionTags),
}));

export const transactionTagsRelations = relations(transactionTags, ({ one }) => ({
  transaction: one(transactions, {
    fields: [transactionTags.transactionId],
    references: [transactions.id],
  }),
  tag: one(tags, { fields: [transactionTags.tagId], references: [tags.id] }),
}));

export const budgetsRelations = relations(budgets, ({ one }) => ({
  user: one(users, { fields: [budgets.userId], references: [users.id] }),
  category: one(categories, {
    fields: [budgets.categoryId],
    references: [categories.id],
  }),
}));

export const goalsRelations = relations(goals, ({ one, many }) => ({
  user: one(users, { fields: [goals.userId], references: [users.id] }),
  contributions: many(goalContributions),
}));

export const goalContributionsRelations = relations(goalContributions, ({ one }) => ({
  goal: one(goals, { fields: [goalContributions.goalId], references: [goals.id] }),
  user: one(users, { fields: [goalContributions.userId], references: [users.id] }),
  transaction: one(transactions, {
    fields: [goalContributions.transactionId],
    references: [transactions.id],
  }),
}));

export const assetsMasterRelations = relations(assetsMaster, ({ many }) => ({
  holdings: many(holdings),
  portfolioTx: many(portfolioTx),
  prices: many(assetPrices),
}));

export const holdingsRelations = relations(holdings, ({ one }) => ({
  user: one(users, { fields: [holdings.userId], references: [users.id] }),
  asset: one(assetsMaster, { fields: [holdings.symbol], references: [assetsMaster.symbol] }),
}));

export const portfolioTxRelations = relations(portfolioTx, ({ one }) => ({
  user: one(users, { fields: [portfolioTx.userId], references: [users.id] }),
  account: one(accounts, { fields: [portfolioTx.accountId], references: [accounts.id] }),
  asset: one(assetsMaster, { fields: [portfolioTx.symbol], references: [assetsMaster.symbol] }),
}));

export const assetPricesRelations = relations(assetPrices, ({ one }) => ({
  asset: one(assetsMaster, { fields: [assetPrices.symbol], references: [assetsMaster.symbol] }),
}));

export const recurringRulesRelations = relations(recurringRules, ({ one }) => ({
  user: one(users, { fields: [recurringRules.userId], references: [users.id] }),
  account: one(accounts, { fields: [recurringRules.accountId], references: [accounts.id] }),
  category: one(categories, { fields: [recurringRules.categoryId], references: [categories.id] }),
}));
