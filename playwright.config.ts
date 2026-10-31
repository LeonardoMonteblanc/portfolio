import { defineConfig, devices } from "@playwright/test";

/**
 * E2E contra um banco LOCAL e o **build de produção**.
 *
 * Por que build e não `next dev`: em modo dev o Turbopack deste projeto não
 * hidrata a página (clique em componente cliente não dispara handler; o
 * servidor de produção hidrata normalmente). Testar o artefato que o usuário
 * recebe é melhor de qualquer forma, e evita falso negativo.
 *
 * Segurança: o `globalSetup` recusa DATABASE_URL que não aponte para host
 * local — sem essa trava, `pnpm test:e2e` subiria o Next com o .env.local
 * (Neon de produção) e os testes escreveriam na base real.
 */
const PORTA = Number(process.env.E2E_PORT ?? 3100);
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${PORTA}`;

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    locale: "pt-BR",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Sem E2E_BASE_URL, sobe build de produção na porta escolhida. Se já houver
  // algo respondendo ali (ex.: `pnpm build && pnpm start --port 3100` aberto),
  // reutiliza.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `pnpm build && pnpm start --port ${PORTA}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 300_000,
      },
});
