# 02 — Ambiente e setup

## Pré-requisitos

| Ferramenta | Versão           | Observação                                            |
| ---------- | ---------------- | ----------------------------------------------------- |
| Node.js    | 24.x             | o projeto usa APIs modernas de ESM                    |
| pnpm       | 12.x             | `packageManager` está fixado no `package.json`        |
| Docker     | qualquer recente | necessário para Postgres local e testes de integração |

## Instalação

```bash
pnpm install
cp .env.example .env.local   # preencha os valores
docker compose up -d         # Postgres local em localhost:5432
```

## Variáveis de ambiente

Validadas por `src/shared/env.ts` no boot: **faltando uma obrigatória, o app não
sobe** (é proposital — falha cedo em vez de erro estranho em runtime).

| Variável                                                                      | Obrigatória                   | Para que serve                                                                          |
| ----------------------------------------------------------------------------- | ----------------------------- | --------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                                                | sim                           | Postgres. Local: `postgresql://dev:dev@localhost:5432/diretorio_dev`                    |
| `JWT_SECRET`                                                                  | sim                           | assinatura do JWT, mínimo 32 caracteres (`openssl rand -base64 32`)                     |
| `RESEND_API_KEY`                                                              | sim                           | envio de e-mail transacional                                                            |
| `RESEND_FROM_EMAIL`                                                           | sim                           | **só o endereço**, ex.: `noreply@seudominio.com` (o schema valida `z.string().email()`) |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` | sim                           | uploads de imagem/anexo                                                                 |
| `R2_PUBLIC_URL`                                                               | opcional                      | CDN pública do bucket                                                                   |
| `UPSTASH_REDIS_URL`, `UPSTASH_REDIS_TOKEN`                                    | opcional                      | rate limit                                                                              |
| `SENTRY_DSN`                                                                  | opcional                      | observabilidade                                                                         |
| `ADMIN_EMAIL_INSTITUCIONAL`, `ADMIN_EMAIL_DPO`                                | opcional                      | endereços exibidos ao público / LGPD                                                    |
| `CRON_SECRET`                                                                 | opcional (necessário p/ cron) | segredo enviado pelo Vercel Cron no header `Authorization`                              |
| `R2_BACKUP_BUCKET`                                                            | opcional (produção)           | bucket **privado** dos backups; sem ele `/api/manutencao/backup` responde 503           |
| `ALERTA_WEBHOOK_URL`                                                          | opcional                      | canal 2 de 3 dos alertas (Slack/Discord/genérico)                                       |
| `BACKUP_DIRETORIO`                                                            | opcional (dev)                | destino em disco quando não há R2 (não use na Vercel: o disco é efêmero)                |
| `NEXT_PUBLIC_SITE_URL`                                                        | opcional                      | URL canônica usada em sitemap/Open Graph (padrão: `https://guiabg.com.br`)              |

> ⚠️ **Cuidado com o alvo do banco.** Neste repositório o `.env.local` de
> desenvolvimento aponta para o Neon de **produção**. Ao rodar scripts,
> confirme o host antes: `(Get-Content .env.local | Select-String DATABASE_URL)`.
> Para experimentar, sobrescreva com o Postgres local:
> `$env:DATABASE_URL='postgresql://dev:dev@localhost:5432/diretorio_dev'`

## Comandos do dia a dia

```bash
pnpm dev             # http://localhost:3000
pnpm typecheck       # tipos de rota + tsc
pnpm lint
pnpm test:unit       # domínio, sem banco
pnpm test:integration # cria/recria o banco diretorio_test e roda as migrations
pnpm build
pnpm db:backup       # backup agora, em ./backups (ou --dir/--r2)
pnpm db:restore      # drill de restauração contra banco LOCAL (ver 06)
```

## Seeds

| Comando                   | O que cria                                     |
| ------------------------- | ---------------------------------------------- |
| `pnpm db:seed:admin`      | primeiro administrador (senha temporária)      |
| `pnpm db:seed:categorias` | categorias oficiais                            |
| `pnpm db:seed:config`     | os 11 parâmetros operacionais (`configuracao`) |

Todos são idempotentes na medida do possível: rodar de novo não duplica dados.

## Problemas comuns

| Sintoma                                                     | Causa provável                                         | Solução                                                                     |
| ----------------------------------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------- |
| `/admin` responde 500 e o log mostra `ZodError: JWT_SECRET` | variável com nome errado (ex.: `JWT_TOKEN`) ou ausente | renomear/criar a variável; variáveis novas no Vercel exigem **novo deploy** |
| `/admin` redireciona em loop para `/login`                  | `token_version` do banco diferente do JWT              | `pnpm db:update:admin-token`                                                |
| Testes de integração falham com `ECONNREFUSED`              | Docker parado                                          | `docker compose up -d`                                                      |
| `sharp` não instala                                         | plataforma/sistema antigo                              | Node 24 e `pnpm install` limpo                                              |
| Migrations falham com "relation already exists"             | arquivo não idempotente                                | veja [06](./06-banco-e-migrations.md)                                       |
