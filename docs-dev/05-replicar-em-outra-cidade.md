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

| Serviço       | O que configurar                                                               |
| ------------- | ------------------------------------------------------------------------------ |
| Neon          | `DATABASE_URL` (pooled)                                                        |
| Resend        | verificar o domínio (SPF/DKIM) e usar um `RESEND_FROM_EMAIL` desse domínio     |
| Cloudflare R2 | bucket + credenciais + `R2_PUBLIC_URL`                                         |
| Upstash Redis | rate limit (opcional, mas recomendado em produção)                             |
| Sentry        | DSN (opcional)                                                                 |
| Vercel        | `CRON_SECRET` e as demais variáveis                                            |
| Cloudflare R2 | **bucket privado** extra para backup (`R2_BACKUP_BUCKET`), separado do público |
| Webhook       | `ALERTA_WEBHOOK_URL` (Slack/Discord) para receber alerta de falha              |

> O plano **Hobby** da Vercel só permite 1 execução por dia por cron (máx. 2).
> O `vercel.json` usa exatamente as duas: `0 3 * * *`
> (`/api/manutencao/diaria`: expurgo LGPD, refresh da view, fila de mídia,
> limpeza de jobs) e `30 3 * * *` (`/api/manutencao/backup`).
>
> ⚠️ **O bucket de backup não pode ser o mesmo das imagens.** O bucket de imagem
> é público e os nomes dos arquivos de backup são previsíveis
> (`backups/AAAA-MM-DD/...`): um dump ali dentro publicaria a base inteira.
> Crie um bucket privado, defina `R2_BACKUP_BUCKET` e confirme que
> `GET /api/manutencao/backup` responde 200 — sem isso ele responde 503 de
> propósito (falha fechada).

### 5. Ajustes de operação

- [ ] `configuracao`: prazos (`prazo_correcao_dias`), limites de upload,
      formatos aceitos, e-mails institucional e do DPO.
- [ ] Documentos legais (`documento_termo`): termos de uso, política de
      privacidade e tratamento de dados precisam ser **revistos juridicamente**
      para a sua jurisdição. Não reaproveite os textos sem revisão.

### 5.1 Backup e alertas (não pule)

1. crie o bucket privado no R2 e defina `R2_BACKUP_BUCKET`;
2. defina `ALERTA_WEBHOOK_URL` e `SENTRY_DSN` (e-mail já sai pelo Resend para
   `ADMIN_EMAIL_INSTITUCIONAL`) — são os 3 canais do RNF-031;
3. rode um backup manual e **confira o destino**:
   `pnpm db:backup --r2` (ou `--dir D:\backups` se ainda não houver R2);
4. faça o drill de restauração uma vez, antes de precisar dele:
   `pnpm db:restore --db postgresql://dev:dev@localhost:5432/drill --limpar --confirmar`
   (o script recusa host remoto de propósito);
5. ajuste `backup_retencao_dias` em `configuracao` (padrão 30 dias).

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
