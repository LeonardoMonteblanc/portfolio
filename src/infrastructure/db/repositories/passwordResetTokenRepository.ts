import crypto from "crypto";
import { db } from "../client";
import { sql } from "drizzle-orm";

/**
 * Insert a new password‑reset token row.
 * Returns the generated `id` and `expiresAt` for the caller.
 */
export async function storePasswordResetToken({
  adminId,
  token,
  expiresAt,
}: {
  adminId: string;
  token: string; // raw token (will be hashed inside)
  expiresAt: Date;
}) {
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const [row] = await db
    .insert(passwordResetToken)
    .values({ adminId, hash, expiresAt })
    .returning({
      id: passwordResetToken.id,
      expiresAt: passwordResetToken.expiresAt,
    });
  return row;
}

/**
 * Validate a token against the stored hash and expiry.
 * Returns the matching row if valid, otherwise `null`.
 */
export async function verifyPasswordResetToken({
  adminId,
  token,
}: {
  adminId: string;
  token: string;
}) {
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const now = new Date();
  const row = await db.query.passwordResetToken.findFirst({
    where: (t, { eq, and }) =>
      and(
        eq(t.adminId, adminId),
        eq(t.hash, hash),
        sql`${t.expiresAt} > ${now}`,
      ),
  });
  return row ?? null;
}

/**
 * Clean up expired tokens – can be called periodically.
 */
export async function deleteExpiredTokens() {
  const now = new Date();
  await db
    .delete(passwordResetToken)
    .where(sql`${passwordResetToken.expiresAt} <= ${now}`);
}
