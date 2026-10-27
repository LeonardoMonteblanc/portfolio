import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    tsconfigPaths: true,
  },
  test: {
    globals: true,
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "src/**/*.spec.ts"],
    includeSource: ["src/domain/**/*.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/domain/**"],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    deps: {
      inline: ["@/domain/**"],
    },
  },
});
