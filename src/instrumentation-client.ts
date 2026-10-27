import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  dataCollection: {
    userInfo: false,
  },
  beforeSend(event) {
    // Scrub de campos sensíveis
    if (event.request?.data) {
      const data = event.request.data as Record<string, unknown>; // Tipagem explícita
      ["email", "telefone", "senha", "password"].forEach((key) => {
        if (data[key]) {
          data[key] = "[REDACTED]";
        }
      });
    }
    return event;
  },
  tracesSampleRate: 0.1, // 10% das transações
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
