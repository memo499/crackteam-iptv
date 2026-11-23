import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const telegramIptvImports = mysqlTable("telegramIptvImports", {
  id: int("id").autoincrement().primaryKey(),
  sourceKey: varchar("sourceKey", { length: 160 }).notNull().unique(),
  channelUsername: varchar("channelUsername", { length: 128 }).notNull(),
  channelTitle: varchar("channelTitle", { length: 255 }),
  telegramMessageId: int("telegramMessageId"),
  category: mysqlEnum("category", ["iptv", "steam", "mail", "film", "spor", "haber"]).default("iptv").notNull(),
  requiredPlan: mysqlEnum("requiredPlan", ["free", "pro", "ultra"]).default("free").notNull(),
  rawMessage: text("rawMessage").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TelegramIptvImport = typeof telegramIptvImports.$inferSelect;
export type InsertTelegramIptvImport = typeof telegramIptvImports.$inferInsert;

export const telegramUsers = mysqlTable("telegramUsers", {
  id: int("id").autoincrement().primaryKey(),
  telegramUserId: varchar("telegramUserId", { length: 64 }).notNull().unique(),
  username: varchar("username", { length: 128 }),
  firstName: varchar("firstName", { length: 128 }),
  plan: mysqlEnum("plan", ["free", "pro", "ultra_trial"]).default("free").notNull(),
  trialExpiresAt: timestamp("trialExpiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TelegramUser = typeof telegramUsers.$inferSelect;
export type InsertTelegramUser = typeof telegramUsers.$inferInsert;
