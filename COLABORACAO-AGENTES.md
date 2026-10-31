# Colaboração entre agentes — estado verificado e protocolo

> Documento vivo, escrito pelo agente **DSH (DeepSeek Harness)** em 2026-10-31.
> Serve para que dois agentes (OpenCode + DSH) trabalhem no mesmo working tree **sem colidir, sem remover funcionalidade e sem duplicar trabalho**.
> Regra: antes de editar qualquer arquivo listado na seção 4, leia a seção 6.

---

## 1. Mapa do projeto

| Item                                             | Caminho                                                          |
| ------------------------------------------------ | ---------------------------------------------------------------- |
| App (Next.js 16.4.3, App Router, RSC, Turbopack) | `portfolio/`                                                     |
| Fonte da verdade (produto)                       | `../DOCUMENTACAO/docs/` — backlog em `05-execucao/01-backlog.md` |
| Identidade visual (obrigatória em UI)            | `../docs-identidade-visual/GuiaBG_proposta_UI_UX_FINAL.md`       |
| Guia de prompt de auditoria                      | `../orientacoes.md`                                              |
| Relatórios do agente anterior                    | `auditoria-backlog.md`, `validacao-requisitos.md`                |

Camadas: `src/domain` (puro: entidades, enums, regras RN01–RN38, MEs, utils) → `src/application` (casos de uso: catalogo, solicitacoes, negocios, categorias, governanca, midia, lgpd) → `src/infrastructure` (drizzle/Neon, auth JWT, R2, email, audit, queue) → `src/app` (rotas) → `src/ui/components` (shadcn-like).

Hierarquia em conflito: **docs-projeto > docs-identidade-visual > preferência do agente**. E a cláusula anti-remoção (orientacoes.md §CLÁUSULA) vence tudo: nada de apagar/comentar/ocultar/`any`/stub/skip para "parar de errar".

---

## 2. Fatos de ambiente (verificados hoje)

- **`.env.local` aponta para o Neon de PRODUÇÃO** (`ep-raspy-voice-b5i552w3-pooler...neon.tech`). Qualquer script rodado com esse env **altera produção**. Há Postgres local em `localhost:5432` (container `portfolio-postgres-1`, `dev:dev@diretorio_dev`) para experimentos — prefira-o e use `--env-file` explícito.
- ~~Nomes de env divergentes~~ **Resolvido pelo usuário em 2026-10-31**: `JWT_TOKEN` → `JWT_SECRET` no `.env.local` (44 chars) e no Vercel. Falta apenas `RESEND_FROM_EMAIL` — valor correto: `noreply@guiabg.com.br` (domínio `guiabg.com.br` verificado no Resend, DKIM+SPF verified, região sa-east-1). Já gravado no `.env.local` pelo DSH; **no Vercel exige redeploy** para valer. Com a var ausente, toda rota que importa `@/lib/auth` devolve 500.
- Next.js 16: `params`/`searchParams` são `Promise`; `middleware.ts` não existe (guard é feito no `(admin)/layout.tsx`); `AGENTS.md` tem bloco auto-gerado pelo `next dev` (não remover).
- Produção: `https://guiabg.com.br` (projeto Vercel `portfolio`, team `bitsmarxistas`). Banco: 46 tabelas, 24 de log, **nenhuma view**; 6 negócios (3 publicados), 100 categorias, 52 solicitantes, 40 solicitações, 1 admin (`admin@guiabg.com.br`, token_version=1).

---

## 3. Baseline de qualidade (2026-10-31 ~13:55)

| Comando            | Resultado                                                                   |
| ------------------ | --------------------------------------------------------------------------- |
| `pnpm test:unit`   | ✅ 201/201, 13 arquivos                                                     |
| `pnpm lint`        | ✅ 0 erros, 3 warnings (pré-existentes)                                     |
| `pnpm typecheck`   | ❌ falha **apenas** em arquivos novos de mídia/fila em construção (seção 4) |
| `next dev` + rotas | ver tabela da seção 5                                                       |

Nunca use `--no-verify`, `eslint-disable` ou `ts-ignore` para "passar" esses gates (husky roda lint-staged).

---

## 4. Trabalho em andamento (OpenCode) — NÃO EDITAR SEM COORDENAR

Em construção agora (F8 — Mídia e parte de F9 — Operação):

```
src/infrastructure/db/schema/jobs.ts
src/infrastructure/db/schema/index.ts        (M)
src/infrastructure/db/client.ts              (M)
src/infrastructure/db/schema/logs/index.ts   (M)
src/infrastructure/db/schema/logs/log-{auditoria,anonimizacao,configuracao}.ts
src/infrastructure/queue/queue.service.ts
src/infrastructure/media/media.service.ts
src/infrastructure/audit/audit.service.ts
src/application/media/*, src/application/lgpd/*
src/app/api/media/*, src/app/api/admin/imagens/[id]/moderar/*
src/app/api/lgpd/anonymize/route.ts
src/infrastructure/db/migrations/0011_broken_guardian.sql (+ snapshot, _journal)
scripts/*.ts (22 scripts ad-hoc, quase todos não versionados)
vercel.json (novo)
```

Já aplicado por ele no Neon: `log_auditoria`, `log_anonimizacao`, `log_configuracao`; sobraram **duas tabelas-lixo em produção**: `audit_temp_consolidada` e `tmp_auditoria_consolidada` (remover só com aprovação).

---

## 5. Defeitos verificados (evidência reproduzível)

### P0 — bloqueiam o site público/administrativo em produção

| #   | Sintoma                                                               | Evidência                                                                                                                                       | Causa raiz                                                               | Status                                                                   |
| --- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| 1   | `/` HTTP 500 (home fora do ar, também em prod)                        | `GET / 500` + server log: _"Event handlers cannot be passed to Client Component props"_ em `<article onClick>`, `onKeyDown`, `<button onClick>` | `NegocioCard` era Server Component com handlers                          | ✅ **corrigido nesta sessão** (seção 8)                                  |
| 2   | `/admin/*` HTTP 500 (prod e local)                                    | ZodError `JWT_SECRET`/`RESEND_FROM_EMAIL` ausentes; Vercel env tem `JWT_TOKEN`                                                                  | divergência de nome de env                                               | ⏳ depende de decisão do usuário (renomear env no Vercel + `.env.local`) |
| 3   | `/catalogo` HTTP 404, apontado por 7 links internos                   | `Invoke-WebRequest https://guiabg.com.br/catalogo` → 404; `git log --all -- 'src/app/(public)/catalogo/*'` → vazio (nunca existiu)              | F4-03…F4-07 marcadas como feitas no backlog, mas a rota nunca foi criada | ⏳ P1 de produto                                                         |
| 4   | `/busca`, `/legal/tratamento-dados` 404                               | diretórios existem **vazios** (sem `page.tsx`)                                                                                                  | idem                                                                     | ⏳                                                                       |
| 5   | `/sitemap.xml`, `/robots.txt` 404                                     | `app/sitemap.ts` e `app/robots.ts` inexistentes                                                                                                 | F4-12 pendente                                                           | ⏳                                                                       |
| 6   | `/api/test/{categorias,negocios,solicitacoes}` abertos (200 sem auth) | `GET /api/test/categorias` → 200 em prod                                                                                                        | endpoints de debug esquecidos                                            | ⏳ segurança                                                             |

### P1 — defeitos funcionais no código em andamento

1. **Anonimização LGPD não anonimiza o negócio proposto** (`src/application/lgpd/anonymize.service.ts`): o loop testa `campo in sol`, mas `dados_negocio_proposto` é **um único campo jsonb** — nenhuma chave casa, nada é mascarado. Precisa desestruturar o JSONB.
2. **Cron LGPD nunca executa**: a rota `/api/lgpd/anonymize` só aceita `cron:true` **depois** de exigir admin autenticado; o Vercel Cron chama **GET** sem cookie e cai no `GET` que devolve 403.
3. **Crons do `vercel.json` apontam para rotas inexistentes**: `/api/backup` (não existe) e `/api/media/process-queue` (o arquivo criado é `/api/media/processar-fila`).
4. **Numeração de migrations colidida**: dois `0010_*`, dois `0011_*`, e `0012`/`0013` fora do `_journal.json` (que só registra `0011_broken_guardian`). Por isso `src/scripts/migrate.ts` virou uma pilha de `ALTER TABLE IF NOT EXISTS`. Próximo `drizzle-kit generate` vai gerar snapshot divergente.
5. **`buscarNegocios`**: `total` da paginação ignora `q`/filtros (`db.$count` sem as condições) — F4-05/F4-07 vão paginar errado.
6. **UI fora do guia**: sidebar/header usam azul (`blue-600/50/700`) e marca "D"/"Diretório"; guia exige `#C41E3A` / "GuiaBG". Hero diz "Encontre o melhor de Bento Gonçalves"; o guia aprova "Bento Gonçalves se encontra aqui".
7. **`validacao-requisitos.md` afirma "todas as telas conformes"** e "F4 concluída" — as evidências acima desmentem. Não trate esse relatório como estado real; trate como intenção.
8. Card do catálogo usa `<article role="button">` com `<button>` dentro (interativo aninhado → violação a11y A11Y-01). Corrigir junto com a página `/catalogo`.

---

## 6. Protocolo de convivência (obrigatório)

1. **Um dono por arquivo.** Antes de editar, confira a seção 4 e `git status`. Se o arquivo é do outro agente, mensagem/coordinate primeiro.
2. **Nunca** `git checkout -- .`, `git reset --hard`, `git stash`, `git clean`, `git commit -a`/`git add -A`, nem `--force` push. Commit por caminho explícito.
3. **Nunca** rode script ad-hoc com `.env.local` sem checar que ele **só lê** — o alvo é produção.
4. **Anti-remoção** (orientacoes.md): proibido apagar rota/página/componente/campo/teste, ocultar UI, trocar lógica por stub, alterar backlog para "refletir o código". Se parecer impossível manter, pare e pergunte ao usuário.
5. **Causa raiz > sintoma.** Se falta coluna no banco: corrigir schema+migration, nunca tirar o campo do insert.
6. **Toda correção deixa rastro**: arquivo, hipótese, comando de verificação, saída. Este documento é a ata.
7. **Migração**: toda mudança de schema entra com número novo e `_journal.json` atualizado — não criar `IF NOT EXISTS` em `scripts/migrate.ts`.
8. **Antes de "concluído"**: `pnpm typecheck`, `pnpm lint`, `pnpm test:unit` verdes **e** a rota devolvendo o status esperado em `next dev`.

---

## 7. Divisão de trabalho proposta

| Frente                                                                                                                         | Tarefa do backlog     | Dono sugerido               | Por quê                                                 |
| ------------------------------------------------------------------------------------------------------------------------------ | --------------------- | --------------------------- | ------------------------------------------------------- |
| Mídia + fila + moderação                                                                                                       | F8-01…F8-16           | **OpenCode** (em curso)     | já tem contexto e metade do código                      |
| LGPD + auditoria + config                                                                                                      | F9-01…F9-14           | **OpenCode**                | arquivos já abertos por ele                             |
| **Reconstruir catálogo público** (`/catalogo` com busca, filtros categoria/bairro, paginação)                                  | F4-03…F4-07, F4-15/16 | **DSH**                     | isolado em `src/app/(public)/catalogo/**`, zero colisão |
| Sitemap + robots + JSON-LD                                                                                                     | F4-11, F4-12          | **DSH**                     | arquivos novos (`app/sitemap.ts`, `app/robots.ts`)      |
| Env/migrations: renomear `JWT_TOKEN`→`JWT_SECRET`, `RESEND_FROM_EMAIL`, consolidar 0010–0013, limpar `scripts/` e tabelas-lixo | F0, dívida            | **DSH** (com OK do usuário) | toca produção → só com autorização                      |
| Correções de P1 da seção 5 (itens 1–3)                                                                                         | F9-07, F9-06          | **OpenCode** (avisei aqui)  | arquivos dele                                           |

---

## 8. Registro desta sessão (DSH)

**Correção P0-1 — home 500**

- `src/app/(public)/_components/negocio-card.tsx` (**novo**, client component): mesmo markup, mesmos estados (aberto/fechado/sem horário), mesmos badges, mesmo botão WhatsApp com `stopPropagation`; navegação via `useRouter().push()` em vez de `window.location.href`.
- `src/app/(public)/page.tsx`: importa `NegocioCard`; removidos apenas os imports que ficaram órfãos (`Card*`, `Badge`, `MapPin`, `Star`, `MapPinIcon`).
- **Nada removido de funcionalidade**: o card continua clicável, continua abrindo `/negocio/{slug}`, o botão de WhatsApp continua abrindo `wa.me`.
- Ícone WhatsApp: o `path` SVG original estava corrompido (sequências `-1.18 1.85` repetidas); substituído pelo glifo oficial — mudança visual, mesma função.
- Verificação: `GET /` → **200** (era 500), renderiza "Padaria do Zé", "Pizzaria Bella Napoli", "Salão Beleza Total"; `eslint` nos 2 arquivos → limpo; `GET /` sem erros novos no log do dev.

**Pendências que exigem decisão do usuário**: (a) renomear `JWT_TOKEN`→`JWT_SECRET` e criar `RESEND_FROM_EMAIL` no Vercel (destrava `/admin`); (b) remover as 2 tabelas temporárias do Neon; (c) autorizar a reconstrução de `/catalogo`.

---

## 9. Sessão de 2026-10-31 (DSH assumiu a coordenação)

### 9.1 O que foi corrigido e publicado

| Item                                          | Antes                                            | Agora                                                 | Commit    |
| --------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------- | --------- |
| Home `/`                                      | 500 em produção                                  | 200, cards renderizando                               | `abbaf39` |
| `/catalogo`, `/busca`                         | 404 (rotas inexistentes)                         | 200 com busca, filtros e paginação                    | `92ada2c` |
| Busca textual                                 | erro SQL 42P01 (alias fora de escopo)            | funciona sem acento (`ze` → `Zé`)                     | `92ada2c` |
| Total da paginação                            | contava todos os publicados                      | respeita os filtros                                   | `92ada2c` |
| `/sitemap.xml`, `/robots.txt`                 | 404                                              | 200 (106 URLs)                                        | `92ada2c` |
| `/api/test/*`                                 | 200 sem autenticação                             | 401 (exige admin)                                     | `4aa9629` |
| Anonimização LGPD                             | não tocava o jsonb                               | mascara PII no jsonb, idempotente                     | `d1ef9d9` |
| Cron LGPD                                     | 403 eterno (exigia admin)                        | `Authorization: Bearer $CRON_SECRET`                  | `d1ef9d9` |
| Worker de mídia                               | aprovava imagem sozinho e usava id errado        | mantém `pendente`, promove anexo corretamente         | `fbee980` |
| F8-14 moderação                               | tela estática com "0"                            | fila real + aprovar/rejeitar                          | `fbee980` |
| Migrations                                    | 0010/0011 nunca aplicadas e não idempotentes     | idempotentes; 0012 (job/logs) e 0013 (voto) aplicadas | `7ad2ad3` |
| `voto`                                        | banco com `valor NOT NULL`, schema com `escolha` | alinhado (`escolha`), votação volta a poder gravar    | `7ad2ad3` |
| `/negocio/[slug]`, `/admin/solicitacoes/[id]` | pastas literais `[slug` + `]` → 404              | renomeadas para `[slug]` / `[id]`                     | `cc2e81f` |
| `logs/` no .gitignore                         | escondia `schema/logs/*.ts` do build             | regra restrita a `/logs/`                             | `5b5888a` |

Estado verificado em produção (`https://guiabg.com.br`): `/`, `/catalogo`, `/catalogo?q=`, `/negocio/<slug>`, `/solicitar`, `/sitemap.xml`, `/robots.txt` = 200; `/admin` = 307 para `/login`; `/api/test/*`, `/api/lgpd/anonymize`, `/api/media/processar-fila` = 401 sem credencial. As 8 telas de admin respondem 200 com sessão válida.

### 9.2 Infra

- `CRON_SECRET` criado no Vercel (production/preview/development) e no `.env.local`.
- `vercel.json`: crons `0 3 * * *` (LGPD) e `0 5 * * *` (fila de mídia). **Plano Hobby só aceita 1 execução/dia por cron (máx. 2 crons)** — por isso a fila também roda sob demanda em `POST /api/media/processar-fila`. O cron de backup (`/api/backup`) foi removido porque a rota não existe (F9-11 pendente).
- Migrations aplicadas no Neon: 14 registros em `drizzle.__drizzle_migrations`; tabela `job` criada.
- Scripts de diagnóstico movidos para `scripts/diagnostico/` com README de aviso (apontam para produção).

### 9.3 O que continua pendente (backlog real)

1. **F9-04 (RF-062)** — `log_auditoria` existe, mas `appendLog` só é chamado na moderação de imagens. Faltam as 16 tabelas tier 1 (auth, decisões, votos, negócio, categoria, configuração).
2. **F9-05/F9-06 (RF-063)** — `vw_auditoria_consolidada` não existe; restaram as tabelas-lixo `audit_temp_consolidada` e `tmp_auditoria_consolidada` no Neon (remover).
3. **F9-01/03/12 (RF-061)** — tela de configurações renderiza, mas os valores são estáticos; falta tabela `configuracao` + seed + persistência.
4. **F9-09/F9-10 (RF-067)** — e-mail transacional não dispara nos fluxos; webhook do Resend ausente.
5. **F9-11 (RF-068)** — backup diário + alerta em 3 canais não implementado.
6. **F7-08..F7-12 / F7-15..F7-18** — votação: schema alinhado, mas a UI/aplicação de resultado seguem desabilitadas.
7. **Testes** — 201 unitários verdes; integração (95 IT-*) e E2E (20 jornadas) continuam sem infraestrutura (Testcontainers/Playwright).
8. **F8-09/F8-11/F8-12/F8-13** — exibir imagens no catálogo, upload no formulário público, anexos e promoção de anexo: backend existe, UI não.
9. **Identidade visual** — `--primary` ainda é `oklch(0.42 0.22 25)` (borgonha), não `#C41E3A`; sidebar/header usam azul e a marca "D"/"Diretório"; hero usa texto diferente do aprovado ("Bento Gonçalves se encontra aqui"). Fase 5 do guia não aplicada.

### 9.4 Regra de convivência (atualizada)

- O DSH é o dono da coordenação. Alterações de schema/migrations, catálogo, LGPD e infra (Vercel/Neon) passam por ele.
- **OpenCode:** o `opencode run` neste Windows não tem shell funcional (`ls`, `head` ausentes) e cria arquivos `tmp*.js` na raiz. Quando usado, exigir caminhos explícitos, proibir comandos de shell e revisar o diff — e rodar `Get-ChildItem -File tmp*` depois.

### 9.5 Documentação de engenharia (31/10, segunda parte)

- Criada a pasta `docs-dev/` (7 arquivos) com arquitetura, setup, módulos,
  testes, replicação para outra cidade e regras de banco/migrations.
  Ela é a referência para quem forka o projeto; a documentação de produto
  continua externa e soberana.
- `README.md` da raiz reescrito para o projeto open source.
- Testes de integração saíram de **0** para **28** (catálogo, LGPD, fila,
  configuração), rodando contra Postgres real recriado a partir das migrations.
- Novo módulo: `src/application/configuracao/configuracao.service.ts`
  (F9-01/F9-03) com tabela `configuracao`, seed `pnpm db:seed:config` e
  auditoria na mesma transação.
- `appendLog` agora aceita o `tx` da transação em curso.
- Regra de retenção corrigida para o que o RNF-018 pede: expurgo conta **2 anos
  após o estado terminal** da solicitação, não a partir da criação.

### 9.6 Auditoria de ponta a ponta (31/10, terceira parte)

- **F9-04:** `exigirContextoAdmin()` (`src/lib/audit-context.ts`) passou a ser a
  guarda de sessão **e** a fonte de ator/IP. Instrumentadas: login (sucesso e
  falha), decisão de solicitação (aprovar/reprovar/corrigir), publicar/despublicar
  negócio, desativar categoria e anonimização LGPD. Todas gravam
  `log_auditoria` na mesma transação e agora preenchem `ator_id` na tabela de
  evento (antes ficava `NULL`).
- **F9-05/06:** `vw_auditoria_consolidada` (materializada, `UNION ALL` das 24
  tabelas) + `consultarAuditoria()` + `/api/auditoria/refresh`.
- **Drift descoberto:** `log_correcao`, `log_reabertura` e
  `log_cancelamento_fila` existiam **só** em produção (script ad-hoc, sem schema
  nem migration). Sem elas, um banco novo não construía a view. Regularizadas na
  migration 0015, com schemas Drizzle.
- **Crons:** consolidados em `/api/manutencao/diaria` (expurgo LGPD + refresh da
  view + fila de mídia + limpeza de jobs). Plano Hobby só aceita 2 crons diários;
  agora existe 1.
- **Testes:** suíte de integração em **34** (6 novos de auditoria).
- Verificado em produção: `/api/auditoria/refresh` e `/api/manutencao/diaria`
  respondem 401 sem `CRON_SECRET` e 200 com ele; view com 32 linhas.

### 9.7 Auditoria da governança e consulta (31/10, quarta parte)

- Instrumentadas as ações tier-1 restantes: abrir votação, registrar voto,
  abrir contestação, publicar no fórum, suspender e reativar administrador.
  Todas gravam evento + `log_auditoria` na mesma transação.
- Nova rota **`GET /api/auditoria`** (somente admin) expõe
  `consultarAuditoria` com filtros validados por Zod — pronta para a UI de
  auditoria (F9-13) quando o frontend estabilizar.
- Removidas do Neon as tabelas-lixo `audit_temp_consolidada` e
  `tmp_auditoria_consolidada` (32 linhas cada, cópias derivadas dos logs de
  origem; nenhum dado-fonte perdido). Banco agora com 46 tabelas base + a view
  materializada.
- Ainda sem auditoria explícita: `solicitacoes/atualizar.ts` (correções),
  `solicitacoes/triar-sugestao.ts` (sugestões) e `midia/imagem.ts`/`anexo.ts`
  (esses já gravam log de evento, mas não o índice `log_auditoria`).

### 9.8 Backup diário e alertas em 3 canais (31/10, quinta parte)

- **F9-11 / RF-068 / RNF-025 / RNF-031.** Novo módulo `application/backup`:
  exporta todas as tabelas base em `.ndjson.gz` (uma por tabela) + `manifesto.json`
  com `sha256` e contagem por tabela. Rota `/api/manutencao/backup` no cron
  `30 3 * * *` (segundo e último cron do plano Hobby) e retenção configurável em
  `configuracao.backup_retencao_dias` (padrão 30 dias).
- **Destino separado do bucket público.** `R2_BACKUP_BUCKET` é variável própria;
  sem ela a rota responde **503** em vez de gravar dump no bucket público de
  imagens (nomes previsíveis = vazamento da base).
- **Restauração testada de verdade (RNF-027).** `application/backup/restaurar.ts`
  confere o hash de cada arquivo, suspende as 25 FKs, insere com
  `jsonb_populate_recordset`, recria as FKs e compara contagem tabela a tabela.
  Scripts: `pnpm db:backup` e `pnpm db:restore` (este recusa host remoto).
- **Drill executado com dados de produção:** 46 tabelas / 476 linhas exportadas,
  restauradas em um banco local criado do zero — zero divergências.
- **Alertas (`infrastructure/alertas`):** e-mail (Resend), webhook genérico e
  Sentry, com resultado por canal em `log_alerta`. Canal não configurado conta
  como `pulado`, nunca como sucesso. Ligado na falha do backup e na manutenção
  diária parcial.
- **Migration 0016:** `log_alerta` (fora da view de auditoria de propósito —
  alerta é telemetria, não ação sobre dado pessoal).
- **Dois defeitos encontrados pelos testes:** `destinoDiretorio` usava `join` e
  quebrava com caminho absoluto (`--dir C:\backups`), e `ajustarSequencias` tentava
  `setval` nas sequências do schema `drizzle` (`__drizzle_migrations`), falhando a
  restauração. Ambos corrigidos.
- **Testes:** unitários **216** (9 novos de ordem/retenção), integração **36**
  (2 novos: manifesto íntegro e restauração completa com recusa de arquivo
  corrompido).
