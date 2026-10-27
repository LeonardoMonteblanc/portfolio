#!/usr/bin/env node
/**
 * Domain Layer Test Runner
 * Uses tsx with tsconfig-paths/register for proper @/ alias resolution
 */

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, "../..");

// Test files to run
const testFiles = [
  "tests/unit/state-machines/sugestao.test.ts",
  "tests/unit/state-machines/sessao.test.ts",
  "tests/unit/state-machines/imagem.test.ts",
  "tests/unit/state-machines/anexo.test.ts",
  "tests/unit/state-machines/correcao.test.ts",
  "tests/unit/state-machines/votacao.test.ts",
  "tests/unit/state-machines/publicacao.test.ts",
  "tests/unit/state-machines/solicitacao.test.ts",
  "tests/unit/rules/solicitacoes.test.ts",
  "tests/unit/rules/decisoes.test.ts",
  "tests/unit/rules/publicacao.test.ts",
  "tests/unit/rules/categorias.test.ts",
];

console.log("Running domain layer tests with tsx + tsconfig-paths...\n");

// Register tsconfig-paths to enable @/ alias resolution
require("tsconfig-paths/register");

let allPassed = true;

for (const testFile of testFiles) {
  const fullPath = resolve(projectRoot, testFile);
  console.log(`Running: ${testFile}`);

  const result = spawnSync("pnpm", ["tsx", "--test", fullPath], {
    cwd: projectRoot,
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_OPTIONS: "--experimental-vm-modules -r tsconfig-paths/register",
    },
  });

  if (result.status !== 0) {
    console.error(`\n❌ FAILED: ${testFile}`);
    allPassed = false;
  } else {
    console.log(`✅ PASSED: ${testFile}\n`);
  }
}

if (!allPassed) {
  console.error("\n❌ Some tests failed");
  process.exit(1);
} else {
  console.log("\n✅ All domain tests passed!");
  process.exit(0);
}
