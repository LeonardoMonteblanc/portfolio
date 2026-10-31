import { defineConfig } from "vitest/config";
import path from "path";

/**
 * Testes de integração rodam contra um PostgreSQL local real
 * (por padrão `diretorio_test`, recriado a partir das migrations).
 * Veja docs-dev/05-testes.md.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    globalSetup: ["./tests/integration/global-setup.ts"],
    setupFiles: [
      "./tests/integration/setup-env.ts",
      "./tests/integration/setup.ts",
    ],
    testTimeout: 30000,
    hookTimeout: 60000,
    // O banco é compartilhado: rodar arquivos em sequência evita interferência.
    fileParallelism: false,
    sequence: { concurrent: false },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
