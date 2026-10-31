import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

// React em desenvolvimento usa eval() para reconstruir stack de erro. Sem
// `unsafe-eval` a hidratação não roda (o console avisa "eval() is not
// supported") e os handlers de clique ficam mortos — foi o que quebrou o E2E
// de login. Produção nunca usa eval e mantém a CSP estrita (RNF-004).
const emProducao = process.env.NODE_ENV === "production";

const scriptSrc = emProducao
  ? "'self' 'unsafe-inline'"
  : "'self' 'unsafe-inline' 'unsafe-eval'";

// O cliente de desenvolvimento do Next abre um WebSocket em `/_next/hmr`. A
// diretiva `connect-src 'self'` NÃO cobre `ws://` no Chrome, e o handshake
// falha com ERR_INVALID_HTTP_RESPONSE — o runtime de dev fica sem HMR.
// Liberado apenas fora de produção; em produção não existe HMR.
const connectSrc = emProducao
  ? "'self' https://api.resend.com https://*.sentry.io https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://*.upstash.io"
  : "'self' ws://localhost:* ws://127.0.0.1:* http://localhost:* http://127.0.0.1:* https://api.resend.com https://*.sentry.io https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://*.upstash.io";

const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "img-src 'self' data: https://*.r2.cloudflarestorage.com https://assets.seudominio.com.br",
      `script-src ${scriptSrc}`,
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self'",
      `connect-src ${connectSrc}`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; "),
  },
  {
    key: "Vary",
    value: "RSC, Next-Router-State, Next-Router-Prefetch, Accept-Encoding",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },

  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withSentryConfig(nextConfig, {
  org: "bitsmarxsistas",
  project: "portfolio",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  webpack: {
    automaticVercelMonitors: true,
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
