import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

// React em desenvolvimento usa eval() para reconstruir stack de erro. Sem
// `unsafe-eval` a hidratação não roda (o console avisa "eval() is not
// supported") e os handlers de clique ficam mortos — foi o que quebrou o E2E
// de login. Produção nunca usa eval e mantém a CSP estrita (RNF-004).
const scriptSrc =
  process.env.NODE_ENV === "production"
    ? "'self' 'unsafe-inline'"
    : "'self' 'unsafe-inline' 'unsafe-eval'";

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
      "connect-src 'self' https://api.resend.com https://*.sentry.io https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://*.upstash.io",
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
