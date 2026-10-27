// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: env.SENTRY_DSN,
  sendDefaultPii: false,
  beforeSend(event) {
    // Scrub de campos sensíveis
    if (event.request?.data) {
      ['email', 'telefone', 'senha', 'password'].forEach((key) => {
        if (event.request!.data![key]) {
          event.request!.data![key] = '[REDACTED]';
        }
      });
    }
    return event;
  },
  tracesSampleRate: 0.1, // 10% das transações
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
