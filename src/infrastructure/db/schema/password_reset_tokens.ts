import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";

export const passwordResetToken = pgTable("password_reset_token", {
  id: uuid("id").primaryKey().defaultRandom(),
  adminId: uuid("admin_id").notNull(),
  hash: varchar("hash", { length: 64 }).notNull(), // SHA‑256 hex string
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type PasswordResetToken = typeof passwordResetToken.$inferSelect;
export type NewPasswordResetToken = typeof passwordResetToken.$inferInsert;
