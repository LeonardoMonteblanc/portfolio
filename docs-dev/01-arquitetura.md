# 01 — Arquitetura

## Camadas

```
┌──────────────────────────────────────────────────────────────┐
│ app/            rotas, layouts, server actions, route handlers│
├──────────────────────────────────────────────────────────────┤
│ application/    casos de uso (orquestram domínio + infra)     │
├──────────────────────────────────────────────────────────────┤
│ domain/         entidades, enums, regras RN, máquinas ME      │
├──────────────────────────────────────────────────────────────┤
│ infrastructure/ Drizzle, JWT, R2, Resend, fila, auditoria     │
└──────────────────────────────────────────────────────────────┘
         dependências apontam para baixo (app → application → domain)
```

`domain` é puro: sem `next`, sem `drizzle`, sem `fetch`. Isso permite testar
todas as regras e máquinas de estado em milissegundos (`pnpm test:unit`).

## Por que essas escolhas

| Decisão                                            | Motivo                                                                                            | Onde ver                                            |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Next.js App Router com React Server Components     | catálogo é leitura intensiva e SEO; dados buscados no servidor, sem `useEffect`                   | `src/app/(public)/catalogo/page.tsx`                |
| Drizzle ORM + `postgres-js`                        | SQL tipado, migrations em arquivos versionados, funciona com Neon serverless                      | `src/infrastructure/db/`                            |
| JWT stateless em cookie httpOnly + `token_version` | revogar sessão sem tabela de sessões; trocar senha invalida tokens antigos                        | `src/infrastructure/auth/jwt.ts`, `src/lib/auth.ts` |
| Muitas tabelas de log por evento + `log_auditoria` | o modelo de dados pede 22 tabelas append-only; `log_auditoria` é o índice transversal consultável | `src/infrastructure/db/schema/logs/`                |
| Fila em Postgres (`FOR UPDATE SKIP LOCKED`)        | sem infraestrutura extra; concorrência correta                                                    | `src/infrastructure/queue/queue.service.ts`         |
| Configuração em tabela (`configuracao`)            | operação ajusta prazos/limites sem deploy                                                         | `src/application/configuracao/`                     |
| Acentos tratados na query (`translate`)            | busca "ze" precisa achar "Zé" sem depender de extensão                                            | `src/application/catalogo/buscar.ts`                |

## Fluxos principais

### Catálogo público (leitura)

1. `app/(public)/catalogo/page.tsx` lê `searchParams` (Promise no Next 16).
2. `application/catalogo/buscar.ts#buscarNegocios` monta as condições
   (situação `publicado` + busca + categoria + bairro) e pagina.
3. Busca textual compara colunas normalizadas com `translate(lower(col), ...)`,
   o que torna a busca insensível a acento e caixa.
4. Dados relacionados (contatos, localização, categorias, horários) são buscados
   em lote e agrupados em memória — evita N+1.

### Solicitação pública (escrita)

1. Formulário público → server action `criarSolicitacaoAction`.
2. Zod valida; a criação de `solicitante`, `solicitacao`, `aceite_termo` e
   `log_solicitacao_recebida` acontece **em uma transação**.
3. Duplicata é detectada e apenas sinalizada (não bloqueia).

### Decisão e publicação

ME-01 (solicitação) e ME-02 (publicação) são funções puras em
`src/domain/state-machines/`; os casos de uso só persistem o resultado.

### Mídia (upload → moderação)

1. `POST /api/media/upload-url` (admin) gera URL assinada no R2.
2. `POST /api/media/confirmar` cria `imagem`/`anexo` e enfileira um `job`.
3. Worker `application/media/processar.service.ts` consome até 10 jobs por
   execução. **Ele nunca aprova imagem**: a imagem fica `pendente` até a
   moderação humana (RF-057).
4. `POST /api/admin/imagens/[id]/moderar` aprova/rejeita e grava
   `log_imagem` + `log_auditoria`.

### Auditoria (RF-062 / RF-063)

1. Cada caso de uso grava o evento na sua tabela específica (`log_negocio`,
   `log_solicitacao_analisada`, ...) **e** uma linha em `log_auditoria` com ator,
   IP e snapshots antes/depois — sempre dentro da mesma transação.
2. A view materializada `vw_auditoria_consolidada` une as 24 tabelas em um
   formato único (`criado_em`, `ator`, `acao`, `entidade_tipo`, `entidade_id`,
   `detalhes`). Consultas usam `consultarAuditoria()`.
3. O refresh é diário pelo cron `/api/manutencao/diaria` (ou manual em
   `/api/auditoria/refresh`).

### LGPD (direito de exclusão)

1. `POST /api/lgpd/anonymize` (admin) ou cron diário com `CRON_SECRET`.
2. `application/lgpd/anonymize.service.ts` percorre o jsonb
   `dados_negocio_proposto` e mascara **apenas as folhas de PII**, preservando
   descrição, bairro, horários e categorias sugeridas.
3. Grava `anonimizado_em` e `log_anonimizacao` na mesma transação.
4. Os logs de auditoria **preservam** o PII original (base legal: auditoria).

## Autenticação e autorização

- Login em `POST /api/auth/login` → JWT (HS256, 7 dias) no cookie `auth_token`.
- `getAdmin()` (`src/lib/auth.ts`) valida assinatura, existência do admin,
  `ativo` e `tokenVersion` — qualquer divergência derruba a sessão.
- Não há `middleware.ts`; o guard das rotas `/admin/**` é o
  `app/(admin)/layout.tsx`, que redireciona para `/login`.
- Rotas de API internas usam `exigirAdmin()` (`src/lib/api-guard.ts`) ou
  `Authorization: Bearer $CRON_SECRET` quando chamadas por cron.
