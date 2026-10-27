import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN, // Sem NEXT_PUBLIC_ no servidor
  dataCollection: {
    // Configure conforme sua necessidade de privacidade
  },
  tracesSampleRate: 0.1, // 10% das transações
});