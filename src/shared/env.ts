import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  RESEND_API_KEY: z.string().min(1),
  RESEND_FROM_EMAIL: z.string().email(),
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET_NAME: z.string().min(1),
  R2_PUBLIC_URL: z.preprocess(
    (val) => (val === "" || val === "undefined" ? undefined : val),
    z.string().url().optional(),
  ),
  UPSTASH_REDIS_URL: z.string().url().optional().or(z.literal("")),
  UPSTASH_REDIS_TOKEN: z.string().min(1).optional().or(z.literal("")),
  SENTRY_DSN: z.string().url().optional().or(z.literal("")),
  // Backup (F9-11). `R2_BACKUP_BUCKET` precisa ser um bucket PRIVADO: o bucket
  // de imagens é público, e um dump ali dentro exporia a base inteira.
  R2_BACKUP_BUCKET: z.string().min(1).optional(),
  BACKUP_DIRETORIO: z.string().min(1).optional(),
  // Webhook de alerta (Slack/Discord/genérico). Canal 2 de 3 do RNF-031.
  ALERTA_WEBHOOK_URL: z.string().url().optional().or(z.literal("")),
  ADMIN_EMAIL_INSTITUCIONAL: z.string().email().optional(),
  ADMIN_EMAIL_DPO: z.string().email().optional(),
});

// During build (next build), we may not have all env vars set.
// Use safeParse with fallback for build-time, but enforce at runtime.
function validateEnv() {
  // Skip strict validation during Next.js build phase
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return envSchema.parse({
      NODE_ENV: "production",
      DATABASE_URL:
        process.env.DATABASE_URL ||
        "postgresql://build:build@localhost:5432/build",
      JWT_SECRET:
        process.env.JWT_SECRET ||
        "build-secret-min-32-chars-long-for-build-only",
      RESEND_API_KEY: process.env.RESEND_API_KEY || "build-key",
      RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL || "build@test.local",
      R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID || "build",
      R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID || "build",
      R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY || "build",
      R2_BUCKET_NAME: process.env.R2_BUCKET_NAME || "build",
      R2_PUBLIC_URL: process.env.R2_PUBLIC_URL,
      UPSTASH_REDIS_URL: process.env.UPSTASH_REDIS_URL,
      UPSTASH_REDIS_TOKEN: process.env.UPSTASH_REDIS_TOKEN,
      SENTRY_DSN: process.env.SENTRY_DSN,
      R2_BACKUP_BUCKET: process.env.R2_BACKUP_BUCKET,
      BACKUP_DIRETORIO: process.env.BACKUP_DIRETORIO,
      ALERTA_WEBHOOK_URL: process.env.ALERTA_WEBHOOK_URL,
      ADMIN_EMAIL_INSTITUCIONAL: process.env.ADMIN_EMAIL_INSTITUCIONAL,
      ADMIN_EMAIL_DPO: process.env.ADMIN_EMAIL_DPO,
    });
  }

  // Runtime: strict validation
  return envSchema.parse(process.env);
}

export const env = validateEnv();
