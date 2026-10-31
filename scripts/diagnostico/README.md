# scripts/diagnostico

Scripts de diagnóstico pontuais, usados durante a investigação de drift entre
schema Drizzle e banco (2026-10-29 a 2026-10-31). Foram preservados como
evidência histórica.

**Atenção:** eles usam `DATABASE_URL` e, com o `.env.local` atual, apontam para
o banco de **produção (Neon)**. Não execute nenhum deles sem antes conferir o
alvo. Para experimentos, use o Postgres local:

```bash
$env:DATABASE_URL='postgresql://dev:dev@localhost:5432/diretorio_dev'
tsx scripts/diagnostico/<script>.ts
```

Eles não fazem parte do build, do runtime nem do CI (o `tsconfig.json` exclui
`scripts/`). A automação real vive em `src/infrastructure/db/migrations`.
