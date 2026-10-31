# 05 — Replicar em outra cidade

O projeto foi desenhado para ser **forkável**: o domínio (solicitação,
moderação, publicação, governança) é genérico; cidade, marca, categorias e
contatos são dados.

## Checklist

### 1. Identidade e domínio

- [ ] Nome do projeto e da marca (`GuiaBG` → `GuiaSuaCidade`) nos metadados
      (`src/app/layout.tsx`), cabeçalho/rodapé e e-mails (`src/infrastructure/email/templates.ts`).
- [ ] `NEXT_PUBLIC_SITE_URL` com a URL nova (usada no sitemap e Open Graph).
- [ ] Favicon e imagens em `public/`.

### 2. Banco

- [ ] Criar um projeto Neon novo (não reaproveite o banco de outra cidade).
- [ ] Rodar as migrations: `pnpm db:migrate`.
- [ ] `pnpm db:seed:admin` → troque a senha no primeiro login.
- [ ] `pnpm db:seed:config` → ajuste depois os e-mails institucional/DPO.

### 3. Categorias

As categorias oficiais são **dados**, não código. O seed fica em
`src/scripts/seed-categorias.ts`; revise a lista para a sua cidade e rode
`pnpm db:seed:categorias`. Categorias podem ser criadas/desativadas/mescladas
pelo painel depois.

### 4. Serviços externos

| Serviço       | O que configurar                                                           |
| ------------- | -------------------------------------------------------------------------- |
| Neon          | `DATABASE_URL` (pooled)                                                    |
| Resend        | verificar o domínio (SPF/DKIM) e usar um `RESEND_FROM_EMAIL` desse domínio |
| Cloudflare R2 | bucket + credenciais + `R2_PUBLIC_URL`                                     |
| Upstash Redis | rate limit (opcional, mas recomendado em produção)                         |
| Sentry        | DSN (opcional)                                                             |
| Vercel        | `CRON_SECRET` e as demais variáveis                                        |

> O plano **Hobby** da Vercel só permite 1 execução por dia por cron (máx. 2).
> O `vercel.json` já está ajustado para esse limite: expurgo LGPD diário e fila
> de mídia diária (a fila também roda sob demanda em
> `POST /api/media/processar-fila`).

### 5. Ajustes de operação

- [ ] `configuracao`: prazos (`prazo_correcao_dias`), limites de upload,
      formatos aceitos, e-mails institucional e do DPO.
- [ ] Documentos legais (`documento_termo`): termos de uso, política de
      privacidade e tratamento de dados precisam ser **revistos juridicamente**
      para a sua jurisdição. Não reaproveite os textos sem revisão.

### 6. O que NÃO muda

- Modelo de domínio, máquinas de estado, regras de negócio e o fluxo de
  moderação (são o valor do produto).
- Migrations: mantenha a sequência; não edite migrations já aplicadas.

## O que ainda não é parametrizável (dívida conhecida)

- Textos institucionais da home (hero, chamada comunitária) vivem no JSX de
  `src/app/(public)/page.tsx`.
- Cores/tokens visuais ficam em `src/app/globals.css` (há trabalho de identidade
  visual em andamento).
- Lista de categorias do seed é estática.
