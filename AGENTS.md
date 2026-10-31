<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Colaboração entre agentes (obrigatório)

Dois agentes trabalham neste mesmo working tree (OpenCode + DSH). Antes de editar:

1. Leia `COLABORACAO-AGENTES.md` — ele lista **quem é dono de cada arquivo**, os defeitos verificados e o protocolo.
2. Não use `git checkout -- .`, `reset --hard`, `stash`, `clean`, `git add -A` nem `--force`.
3. `.env.local` aponta para o **Neon de produção**: scripts ad-hoc alteram produção. Prefira o Postgres local (`dev:dev@localhost:5432/diretorio_dev`).
4. Cláusula anti-remoção vale sempre: nada de apagar/ocultar/stub/type-ignore/skip para "fazer passar".
5. Só declare concluído com `pnpm typecheck`, `pnpm lint`, `pnpm test:unit` verdes e a rota respondendo o status esperado.
