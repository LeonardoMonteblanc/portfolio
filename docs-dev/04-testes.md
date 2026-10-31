# 04 — Testes

## Duas camadas, dois objetivos

| Camada     | Onde                                | Banco         | Velocidade        | O que prova                                                    |
| ---------- | ----------------------------------- | ------------- | ----------------- | -------------------------------------------------------------- |
| Unitário   | `tests/unit/**`, `src/**/*.spec.ts` | não           | ~3 s (201 testes) | regras RN01–RN38, máquinas de estado ME-01..ME-08, utilitários |
| Integração | `tests/integration/**`              | Postgres real | ~25 s (28 testes) | SQL, transações, constraints, idempotência                     |

E2E (Playwright) ainda **não** está configurado — é o próximo passo de qualidade.

## Unitários

```bash
pnpm test:unit
```

Rodam só sobre `src/domain`. Não importam Next, Drizzle nem rede — por isso são
rápidos e determinísticos. Cobertura mínima configurada: 70% em `src/domain/**`.

## Integração (banco real)

```bash
docker compose up -d
pnpm test:integration
```

Como funciona:

1. `tests/integration/global-setup.ts` **recria** o banco `diretorio_test`,
   aplicando todas as migrations de `src/infrastructure/db/migrations`.
   Isso também valida que as migrations funcionam do zero.
2. `tests/integration/setup-env.ts` aponta `DATABASE_URL` para o banco de teste
   e preenche variáveis fictícias (JWT, Resend, R2) antes de qualquer import.
3. `tests/integration/setup.ts` expõe `limparBanco()` (TRUNCATE ... CASCADE) e
   factories: `criarAdmin`, `criarCategoria`, `criarNegocio`,
   `criarSolicitacaoComPii`.
4. Cada arquivo roda em sequência (`fileParallelism: false`) porque compartilham
   o mesmo banco.

**Trava de segurança:** o setup recusa qualquer host que não seja local
(`localhost`, `127.0.0.1`, `::1`, `postgres`). É proibido apontar
`TEST_DATABASE_URL` para o Neon — o banco é apagado a cada execução.

Para usar outro banco local:

```bash
$env:TEST_DATABASE_URL='postgresql://dev:dev@localhost:5432/meu_teste'
pnpm test:integration
```

## O que já está coberto

| Arquivo                | Cobre                                                                                                                                                                                                                               |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `catalogo.test.ts`     | só publicados; busca sem acento/caixa (nome, descrição, categoria); filtro de categoria, de bairro e combinado; **total da paginação respeitando filtros**; vazio; agregação de bairros; categorias ativas                          |
| `lgpd.test.ts`         | máscara de nome/email/telefone; PII dentro do jsonb (e preservação de descrição/bairro/horários); `log_anonimizacao`; idempotência; solicitante inexistente; expurgo só de estado terminal com +2 anos; solicitante sem solicitação |
| `fila.test.ts`         | reivindicação com SKIP LOCKED; concorrência (dois workers, jobs distintos); agendamento futuro; conclusão; backoff e limite de tentativas; estatísticas; limpeza de jobs antigos                                                    |
| `configuracao.test.ts` | padrões quando vazio; seed idempotente; validação por chave (e-mail, número, lista); persistência; `log_configuracao` + `log_auditoria` na mesma transação; no-op quando o valor não muda                                           |

## Como escrever um teste de integração

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { limparBanco, criarNegocio } from "./setup";

describe("minha regra", () => {
  beforeEach(async () => {
    await limparBanco();
  });

  it("faz o que promete", async () => {
    await criarNegocio({
      slug: "teste",
      nome: "Teste",
      categorias: ["padaria"],
    });
    // ... exercite o caso de uso
    expect(true).toBe(true);
  });
});
```

Boas práticas que os testes existentes seguem:

- Um arquivo por caso de uso; nomes de `it` descrevem o comportamento, não a função.
- Seeds mínimos e explícitos (sem "banco cheio" compartilhado).
- Asserções no banco quando o contrato é persistência (ex.: coluna, log, timestamp).
- Teste de regressão referencia o bug que o originou (ex.: total da paginação).

## CI

`.github/workflows/ci.yml` roda `typecheck`, `lint` e `build` em PR/push. Os testes
de integração ainda **não** estão no CI porque precisam de serviço Postgres;
para incluí-los, adicione um `services: postgres` no job e rode
`pnpm test:integration` com `TEST_DATABASE_URL`.

## Suíte de auditoria (adicionada em 2026-10-31)

`tests/integration/auditoria.test.ts` cobre RF-062/RF-063:

- a view materializada é `relkind = 'm'` e tem índice único (pré-requisito de
  `REFRESH ... CONCURRENTLY`);
- eventos de tabelas diferentes aparecem no mesmo formato (`origem`, `acao`,
  `entidade_tipo`, `entidade_id`, `detalhes`);
- filtros por origem, entidade e ator;
- `appendLog` alimenta a view;
- uma alteração de configuração gera **duas** linhas (evento + índice de auditoria);
- paginação por `limite`/`deslocamento`, do mais recente para o mais antigo.

Total atual: **201 unitários + 34 de integração**.
