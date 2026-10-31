# GuiaBG — diretório comunitário

Diretório de negócios, serviços e iniciativas de Bento Gonçalves/RS. Qualquer
pessoa pode pedir a inclusão ou atualização de um negócio **sem criar conta**; a
administração analisa, decide e publica. O projeto é pensado para ser replicado
por outras cidades.

- Catálogo público com busca (sem acento), filtros por categoria/bairro e paginação
- Solicitação pública com aceite de termos e detecção de duplicata
- Painel administrativo: análise, decisão, correção, publicação, mídia, fórum e votação
- Auditoria append-only e LGPD (anonimização + expurgo por retenção)

## Stack

Next.js 16 (App Router, RSC) · TypeScript estrito · Drizzle ORM · PostgreSQL (Neon) ·
Cloudflare R2 · Resend · Upstash Redis · Sentry · Vitest

## Rodando localmente

```bash
pnpm install
cp .env.example .env.local     # preencha DATABASE_URL, JWT_SECRET, RESEND_FROM_EMAIL, R2_*
docker compose up -d           # Postgres local
pnpm db:migrate
pnpm db:seed:admin             # cria o primeiro administrador
pnpm db:seed:categorias        # categorias oficiais
pnpm db:seed:config            # parâmetros operacionais
pnpm dev                       # http://localhost:3000
```

## Documentação

| Documento                                              | Conteúdo                                                         |
| ------------------------------------------------------ | ---------------------------------------------------------------- |
| [docs-dev/](docs-dev/README.md)                        | documentação de engenharia (arquitetura, módulos, testes, banco) |
| [docs-dev/05](docs-dev/05-replicar-em-outra-cidade.md) | como replicar o projeto na sua cidade                            |
| [docs-dev/06](docs-dev/06-banco-e-migrations.md)       | regras de migration e diagnóstico de drift                       |

A documentação de **produto** (requisitos, regras de negócio, máquinas de estado,
backlog) fica em um repositório separado e é a fonte da verdade — o código não a
sobrescreve.

## Scripts

| Comando                                                        | Descrição                                     |
| -------------------------------------------------------------- | --------------------------------------------- |
| `pnpm dev`                                                     | servidor de desenvolvimento                   |
| `pnpm build` / `pnpm start`                                    | build e execução em produção                  |
| `pnpm typecheck` / `pnpm lint`                                 | gates de qualidade                            |
| `pnpm test:unit`                                               | testes de domínio (sem banco)                 |
| `pnpm test:integration`                                        | testes de integração contra um Postgres local |
| `pnpm db:generate` / `pnpm db:migrate`                         | gerar/aplicar migrations                      |
| `pnpm db:seed:admin` / `db:seed:categorias` / `db:seed:config` | seeds                                         |
| `pnpm db:studio`                                               | Drizzle Studio                                |

## Deploy

Produção roda na Vercel com Neon. Variáveis obrigatórias em
[02 — Ambiente e setup](docs-dev/02-ambiente-e-setup.md). O `vercel.json` define
dois crons **diários** (limite do plano Hobby): expurgo LGPD e processamento da
fila de mídia (que também pode ser disparado sob demanda).

## Contribuindo

1. `pnpm typecheck && pnpm lint && pnpm test:unit && pnpm test:integration`
2. Mudança de schema → `pnpm db:generate`, deixe o SQL idempotente e rode os
   testes de integração (eles recriam o banco a partir das migrations).
3. Nunca apague rota, campo, teste ou dado para "fazer o erro sumir": corrija a
   causa (ver [06](docs-dev/06-banco-e-migrations.md)).
