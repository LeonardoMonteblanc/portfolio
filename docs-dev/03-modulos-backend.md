# 03 — Módulos do backend

Cada caso de uso é um arquivo pequeno e explícito. Server actions começam com
`"use server"`; serviços (`*.service.ts`) são funções puras de orquestração.

## application/

| Módulo                                 | Responsabilidade                                            | Entradas principais                                                                                                                   |
| -------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `catalogo/buscar.ts`                   | busca/filtros/paginação do catálogo; bairros; sitemap       | `buscarNegocios`, `buscarNegocioPorSlug`, `listarCategoriasAtivas`, `listarBairrosComNegocios`, `listarNegociosPublicadosParaSitemap` |
| `solicitacoes/criar.ts`                | criar solicitação (transação com solicitante, aceite e log) | `criarSolicitacaoAction`                                                                                                              |
| `solicitacoes/listar.ts`               | listagem/filtros do painel                                  | `listarSolicitacoesAction`                                                                                                            |
| `solicitacoes/analise.ts`              | iniciar análise, decidir, reabrir                           | `iniciarAnaliseAction`, `registrarDecisaoAction`                                                                                      |
| `solicitacoes/atualizar.ts`            | correções (RF-027..029)                                     | —                                                                                                                                     |
| `negocios/*`                           | criar, editar, publicar, invalidar, listar                  | `criarNegocioAction`, `publicarNegocioAction`                                                                                         |
| `categorias/*`                         | criar, editar, desativar, reativar, mesclar, listar         | `criarCategoriaAction`, `mesclarCategoriasAction`                                                                                     |
| `governanca/forum.ts`                  | comentário e manifestação                                   | `comentarAction`                                                                                                                      |
| `governanca/contestacao.ts`            | abrir contestação (ME-03)                                   | `abrirContestacaoAction`                                                                                                              |
| `governanca/votacao.ts`                | registrar voto e apurar                                     | `registrarVotoAction`                                                                                                                 |
| `midia/upload-publico.ts`              | upload no formulário público (F8-11)                        | —                                                                                                                                     |
| `midia/processar.service.ts`           | worker da fila (imagem/anexo/promover)                      | `processarFila`                                                                                                                       |
| `lgpd/anonymize.service.ts`            | anonimização manual + expurgo por retenção                  | `anonimizarSolicitante`, `cronAnonimizacaoAutomatica`                                                                                 |
| `configuracao/configuracao.service.ts` | parâmetros operacionais com validação e auditoria           | `listarConfiguracoes`, `obterConfiguracao*`, `atualizarConfiguracao`, `garantirConfiguracoesPadrao`                                   |
| `auth/*`                               | login, recuperação de senha                                 | `loginAction`, `solicitarRecuperacaoSenhaAction`                                                                                      |

## infrastructure/

| Módulo                   | Responsabilidade                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------------ |
| `db/client.ts`           | conexão Drizzle (com fallback só para o build da Vercel)                                         |
| `db/schema/*`            | tabelas por domínio; `logs/` tem as tabelas append-only                                          |
| `auth/jwt.ts`            | assinar/validar JWT (jose)                                                                       |
| `auth/hash.ts`           | argon2                                                                                           |
| `auth/rate-limit.ts`     | Upstash                                                                                          |
| `media/media.service.ts` | URL assinada, validação de MIME/tamanho, chave no bucket                                         |
| `queue/queue.service.ts` | fila: enfileirar, reivindicar (SKIP LOCKED), concluir, falhar com backoff, estatísticas, limpeza |
| `audit/audit.service.ts` | `appendLog` (aceita transação) + `criarSnapshot`                                                 |
| `email/*`                | Resend + templates                                                                               |
| `r2/client.ts`           | SDK S3 apontando para o R2                                                                       |

## Convenções que você deve seguir

1. **Valide na borda com Zod** e devolva `ErroDominio` com código estável para
   erros de regra. Nada de `any` para "passar".
2. **Mutação composta = transação.** Se grava entidade + log, use
   `db.transaction`, e passe o `tx` para `appendLog(input, tx)`.
3. **Log é requisito, não enfeite.** Toda operação listada em RF-062 grava
   `log_<evento>` **e** `log_auditoria` (índice consultável).
4. **Nunca apague dado para "resolver" erro.** Se o schema e o banco divergirem,
   corrija a migration (ver [06](./06-banco-e-migrations.md)).
5. **Nada de stub.** `return []`, `TODO`, `catch {}` ou string "em breve"
   escondem falha e quebram contratos de teste.
6. **Documente o porquê** no topo do módulo quando a regra não for óbvia.
7. **Toda action administrativa começa com `exigirContextoAdmin()`**
   (`src/lib/audit-context.ts`): valida a sessão **e** devolve ator/IP para o
   `appendLog`. Confiar só no layout `/admin` não protege um POST direto.
8. **Grave o ator também na tabela de evento** (`atorId`), não apenas no
   `log_auditoria`: é o que a view consolidada usa como fallback.

## Rotas de API (não públicas)

| Rota                                                      | Auth                   | Função                     |
| --------------------------------------------------------- | ---------------------- | -------------------------- |
| `POST /api/auth/login`, `POST /api/auth/logout`           | pública                | sessão                     |
| `POST /api/auth/recuperar-senha/*`                        | pública                | recuperação                |
| `POST /api/media/upload-url`, `POST /api/media/confirmar` | admin                  | upload                     |
| `GET/POST /api/media/processar-fila`                      | `CRON_SECRET` ou admin | worker / estatísticas      |
| `POST /api/admin/imagens/[id]/moderar`                    | admin                  | moderação                  |
| `POST /api/lgpd/anonymize`, `GET` (cron)                  | admin / `CRON_SECRET`  | LGPD                       |
| `GET /api/test/*`                                         | admin                  | diagnóstico (exige sessão) |

## Auditoria (adicionado em 2026-10-31)

| Módulo                                       | Responsabilidade                            | Entradas                                       |
| -------------------------------------------- | ------------------------------------------- | ---------------------------------------------- |
| `application/auditoria/auditoria.service.ts` | consulta a view consolidada e refresh       | `consultarAuditoria`, `atualizarViewAuditoria` |
| `lib/audit-context.ts`                       | guarda de sessão + ator/IP para auditoria   | `exigirContextoAdmin`, `contextoDaRequisicao`  |
| `lib/cron-auth.ts`                           | valida `Authorization: Bearer $CRON_SECRET` | `autorizadoPorCron`                            |

Rotas relacionadas:

| Rota                              | Auth                   | Função                                                           |
| --------------------------------- | ---------------------- | ---------------------------------------------------------------- |
| `GET/POST /api/auditoria/refresh` | `CRON_SECRET` ou admin | `REFRESH MATERIALIZED VIEW CONCURRENTLY`                         |
| `GET/POST /api/manutencao/diaria` | `CRON_SECRET` ou admin | expurgo LGPD + refresh da view + fila de mídia + limpeza de jobs |

Regras ao instrumentar uma action:

1. comece com `const contexto = await exigirContextoAdmin()` — valida a sessão e
   fornece ator/IP (confiar só no layout `/admin` não protege um POST direto);
2. grave `atorId` também na tabela de evento (`log_negocio`, `log_categoria`, ...);
3. chame `appendLog({ ...contexto, acao, entidadeTipo, entidadeId, detalhes }, tx)`
   dentro da transação da mutação.

## Ações com auditoria instrumentada (2026-10-31)

| Arquivo                                            | Ações que gravam `log_auditoria`                            |
| -------------------------------------------------- | ----------------------------------------------------------- |
| `application/auth/login.ts`                        | `login`, `login_falha`                                      |
| `application/solicitacoes/analise.ts`              | `decidir_solicitacao_{aprovar,reprovar,solicitar_correcao}` |
| `application/negocios/publicar.ts`                 | `publicar_negocio`, `despublicar_negocio`                   |
| `application/categorias/desativar.ts`              | `desativar_categoria`                                       |
| `application/governanca/votacao.ts`                | `abrir_votacao`, `registrar_voto`                           |
| `application/governanca/contestacao.ts`            | `abrir_contestacao`                                         |
| `application/governanca/forum.ts`                  | `publicar_forum`                                            |
| `application/governanca/admin.ts`                  | `suspender_admin`, `reativar_admin`                         |
| `application/configuracao/configuracao.service.ts` | `atualizar_configuracao`                                    |
| `application/lgpd/anonymize.service.ts`            | `anonimizar_titular`                                        |
| `app/api/admin/imagens/[id]/moderar`               | `aprovar_imagem`, `rejeitar_imagem`                         |

Para consultar no painel (quando a UI chegar):

```http
GET /api/auditoria?entidadeTipo=negocio&desde=2026-10-01&limite=50
```

Resposta: `{ registros, total }`, com `origem`, `acao`, `entidade_tipo`,
`entidade_id`, `ator_id`, `detalhes` e `criado_em`. Exige sessão de admin;
filtros inválidos retornam 400 com o campo problemático.

> As server actions em si não têm teste automatizado porque dependem do contexto
> de requisição do Next (`cookies()`/`headers()`). O que é testado é a camada que
> elas chamam (`appendLog`, `consultarAuditoria`, serviços). Se precisar cobrir
> uma action, extraia a regra para um serviço com parâmetros explícitos.
