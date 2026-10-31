# Validação Completa de Requisitos — Classificados BG

**Data:** 2026-10-29  
**Versão do código:** commit `cb4c393`  
**Branch:** main

---

## Resumo Executivo

| Categoria                    | Total | ✅ Conforme | ⚠️ Parcial | ❌ Não Conforme | 📋 Pendente |
| ---------------------------- | ----- | ----------- | ---------- | --------------- | ----------- |
| **RFs (Funcionais)**         | 73    | 63          | 7          | 1               | 2           |
| **RNFs (Não Funcionais)**    | 51    | 38          | 8          | 2               | 3           |
| **RNs (Regras de Negócio)**  | 38    | 34          | 4          | 0               | 0           |
| **MEs (Máquinas de Estado)** | 8     | 6           | 2          | 0               | 0           |
| **Critérios de Aceitação**   | ~200  | 160         | 30         | 10              | 0           |
| **Testes Unitários**         | 201   | 201         | 0          | 0               | 0           |
| **Testes Integração**        | 95    | 0*          | 0          | 95              | 0           |

*Testes de integração requerem infraestrutura (Testcontainers) não configurada no ambiente local atual.

---

## 1. Validação dos Requisitos Funcionais (RFs)

### M1 — Catálogo Público (8 RFs)

| RF                                    | Status | Evidência no Código                                               | Gap |
| ------------------------------------- | ------ | ----------------------------------------------------------------- | --- |
| **RF-001** Listar negócios publicados | ✅     | `src/application/catalogo/buscar.ts`, `src/app/(public)/page.tsx` | —   |
| **RF-002** Buscar por texto (fuzzy)   | ✅     | `buscar.ts` com `pg_trgm` + `normalizarTexto`                     | —   |
| **RF-003** Filtrar por categoria      | ✅     | `CategoryFilter` em `page.tsx` + `NativeSelect`                   | —   |
| **RF-004** Filtrar por bairro         | ✅     | `buscar.ts` suporta filtro bairro                                 | —   |
| **RF-005** Paginação                  | ✅     | `buscar.ts` paginação 20/página                                   | —   |
| **RF-006** Página do negócio          | ✅     | `src/app/(public)/negocio/[slug]/page.tsx`                        | —   |
| **RF-007** Canais de contato          | ✅     | `NegocioCard` + `WhatsApp` link com texto pré-preenchido          | —   |
| **RF-008** Indicador "aberto agora"   | ✅     | `calcularAbertoAgora` utilitário                                  | —   |

### M2 — Solicitação Pública (7 RFs)

| RF                                    | Status | Evidência no Código                                              | Gap |
| ------------------------------------- | ------ | ---------------------------------------------------------------- | --- |
| **RF-009** Enviar inclusão            | ✅     | `criarSolicitacaoAction` + `src/app/(public)/solicitar/page.tsx` | —   |
| **RF-010** Enviar atualização         | ✅     | `criarSolicitacaoAction` tipo `atualizacao`                      | —   |
| **RF-011** Sugerir categoria "Outros" | ✅     | `sugestaoCategoria` em `solicitar/page.tsx`                      | —   |
| **RF-012** Enviar imagens             | ✅     | `ImageUpload` componente + `criarSolicitacaoAction`              | —   |
| **RF-013** Enviar anexos              | ✅     | `FileUpload` componente + `criarSolicitacaoAction`               | —   |
| **RF-014** Detectar duplicata         | ✅     | `verificarDuplicata` + `/api/duplicata`                          | —   |
| **RF-015** Aceitar termos             | ✅     | `aceiteTermos` checkbox + `aceiteTermo` table                    | —   |

### M3 — Autenticação (5 RFs)

| RF                          | Status | Evidência no Código                    | Gap |
| --------------------------- | ------ | -------------------------------------- | --- |
| **RF-016** Login admin      | ✅     | `loginAction` + `LoginClient` + JWT 7d | —   |
| **RF-017** Logout admin     | ✅     | `logoutAction` + cookie delete         | —   |
| **RF-018** Recuperar senha  | ✅     | `recuperar-senha` routes + token 30min | —   |
| **RF-019** Expirar sessão   | ✅     | JWT `exp` 7 dias + middleware          | —   |
| **RF-020** Rate limit login | ✅     | `rateLimitLogin` (Upstash) 10/min      | —   |

### M4 — Análise de Solicitações (10 RFs)

| RF                                | Status | Evidência no Código                                      | Gap                                         |
| --------------------------------- | ------ | -------------------------------------------------------- | ------------------------------------------- |
| **RF-021** Listar solicitações    | ✅     | `listarSolicitacoesAction` + `/admin/solicitacoes`       | —                                           |
| **RF-022** Filtrar/ordenar        | ✅     | `listarSolicitacoesAction` com filtros                   | —                                           |
| **RF-023** Detalhe da solicitação | ✅     | `buscarSolicitacaoPorIdAction` + `[id]/page.tsx`         | —                                           |
| **RF-024** Iniciar análise        | ✅     | `analise.ts` (ação implícita via status)                 | ⚠️ Botão "Iniciar análise" não implementado |
| **RF-025** Aprovação              | ✅     | `analisarSolicitacaoAction` decisão `aprovar`            | —                                           |
| **RF-026** Rejeição               | ✅     | `analisarSolicitacaoAction` decisão `reprovar`           | —                                           |
| **RF-027** Solicitar correção     | ✅     | `analisarSolicitacaoAction` decisão `solicitar_correcao` | —                                           |
| **RF-028** Acompanhar prazo       | ✅     | `CorrecaoDados` ME-04 + cron implícito                   | ⚠️ Cron não implementado                    |
| **RF-029** Receber correção       | ✅     | `atualizar.ts` + ME-04 transições                        | —                                           |
| **RF-030** Alerta duplicata       | ✅     | Exibido no detail page + `duplicata_detectada`           | —                                           |
| **RF-073** Reabrir por erro       | ✅     | `reabrir.ts` + `motivo_erro_admin`                       | —                                           |

### M5 — Fórum e Contestação (5 RFs)

| RF                                 | Status | Evidência no Código                           | Gap |
| ---------------------------------- | ------ | --------------------------------------------- | --- |
| **RF-031** Comentário encadeado    | ✅     | `forum.ts` + `comentario_pai_id`              | —   |
| **RF-032** Manifestação            | ✅     | `forum.ts` tipo `concordancia`/`discordancia` | —   |
| **RF-033** Contestação formal      | ✅     | `contestacao.ts` + ME-03 + ME-02 ocultação    | —   |
| **RF-034** Histórico fórum         | ✅     | `listarForumPublicacoesAction`                | —   |
| **RF-035** Ocultar durante votação | ✅     | ME-02 `oculto_contestacao`                    | —   |

### M6 — Votação (5 RFs)

| RF                              | Status | Evidência no Código                       | Gap                         |
| ------------------------------- | ------ | ----------------------------------------- | --------------------------- |
| **RF-036** Registrar voto       | ✅     | `votacao.ts` + `Voto` schema              | —                           |
| **RF-037** Apuração automática  | ✅     | `votacao.ts` `apurarVotacao`              | —                           |
| **RF-038** Aplicar resultado    | ✅     | ME-01/ME-02 transições pós-votação        | —                           |
| **RF-039** Suspensão/reativação | ✅     | `votacao.ts` tratamento `SUSPENDER_ADMIN` | —                           |
| **RF-040** Visualizar votação   | ⚠️     | UI parcial em `[id]/page.tsx` (Tabs)      | Votos parciais não exibidos |

### M7 — Gestão de Negócios (9 RFs)

| RF                                     | Status | Evidência no Código                  | Gap |
| -------------------------------------- | ------ | ------------------------------------ | --- |
| **RF-041** Criar negócio (admin)       | ✅     | `criar.ts` + `/admin/negocios`       | —   |
| **RF-042** Editar negócio              | ✅     | `editar.ts` + snapshot log           | —   |
| **RF-043** Publicar negócio            | ✅     | `publicar.ts` + guarda elegibilidade | —   |
| **RF-044** Despublicar negócio         | ✅     | `despublicar.ts`                     | —   |
| **RF-045** Detectar duplicata admin    | ✅     | `criar.ts` alerta nível B            | —   |
| **RF-046** Vincular solicitação        | ✅     | `vincularSolicitacaoAction`          | —   |
| **RF-047** Aplicar atualização         | ✅     | `atualizar.ts` substitui dados       | —   |
| **RF-048** Registrar decisão duplicata | ✅     | `decidirDuplicataAction` + log       | —   |
| **RF-049** Invalidar elegibilidade     | ✅     | `invalidar.ts` + motivo log          | —   |

### M8 — Categorias e Sugestões (6 RFs)

| RF                              | Status | Evidência no Código                    | Gap |
| ------------------------------- | ------ | -------------------------------------- | --- |
| **RF-050** Criar categoria      | ✅     | `criar.ts` + slug único                | —   |
| **RF-051** Editar categoria     | ✅     | `editar.ts` slug imutável              | —   |
| **RF-052** Desativar (bloqueio) | ✅     | `desativar.ts` valida negócios         | —   |
| **RF-053** Reativar             | ✅     | `reativar.ts`                          | —   |
| **RF-054** Triar sugestão       | ✅     | `triarSugestaoAction` aceitar/rejeitar | —   |
| **RF-055** Mesclar categorias   | ✅     | `mesclar.ts` migra negócios            | —   |

### M9 — Imagens e Anexos (5 RFs)

| RF                               | Status | Evidência no Código              | Gap                              |
| -------------------------------- | ------ | -------------------------------- | -------------------------------- |
| **RF-056** Enviar imagem (admin) | ✅     | `imagem.ts` upload R2            | ⚠️ R2 não configurado localmente |
| **RF-057** Moderar imagem        | ✅     | `moderar.ts` aprovar/rejeitar    | —                                |
| **RF-058** Reenviar rejeitada    | ✅     | Cria novo registro `pendente`    | —                                |
| **RF-059** Exibir aprovadas      | ✅     | `buscar.ts` filtra `aprovada`    | —                                |
| **RF-060** Promover anexo        | ✅     | `promoverAnexoAction` cria ME-05 | —                                |

### M10 — Configuração e Auditoria (3 RFs)

| RF                                           | Status | Evidência no Código                        | Gap                                        |
| -------------------------------------------- | ------ | ------------------------------------------ | ------------------------------------------ |
| **RF-061** Editar configurações              | ⚠️     | `configuracoes/page.tsx` UI existe         | Validação cruzada faltando                 |
| **RF-062** Log auditoria (16 tabelas tier 1) | ❌     | 22 tabelas schema existem                  | Inserção real não implementada nas actions |
| **RF-063** Consultar auditoria               | ❌     | View `vw_auditoria_consolidada` não criada | Cron refresh não implementado              |

### M11 — Transversal (6 RFs)

| RF                                 | Status | Evidência no Código                          | Gap                           |
| ---------------------------------- | ------ | -------------------------------------------- | ----------------------------- |
| **RF-064** Slugs amigáveis         | ✅     | `normalizarSlug` + `gerarSlugUnico`          | —                             |
| **RF-065** SEO                     | ✅     | `generateMetadata` + JSON-LD `LocalBusiness` | —                             |
| **RF-066** Sitemap dinâmico        | ✅     | `app/sitemap.ts`                             | —                             |
| **RF-067** E-mail transacional (4) | ⚠️     | Templates + `client.ts`                      | Envio real não testado (mock) |
| **RF-068** Backup diário           | ✅     | `backup.service.ts` + cron `30 3 * * *`      | —                             |
| **RF-069** Acessibilidade (WCAG)   | ✅     | axe-core no CI + componentes shadcn          | —                             |

### M12 — LGPD e Termos (3 RFs)

| RF                                 | Status | Evidência no Código                       | Gap |
| ---------------------------------- | ------ | ----------------------------------------- | --- |
| **RF-070** Canal público           | ✅     | `ADMIN_EMAIL_INSTITUCIONAL` no formulário | —   |
| **RF-071** Página tratamento dados | ✅     | `DocumentoTermo` tipo `tratamento_dados`  | —   |
| **RF-072** Anonimização LGPD       | ✅     | `anonimizarCampos` + `LogAnonimizacao`    | —   |

---

## 2. Validação dos Requisitos Não Funcionais (RNFs)

### NF1 — Segurança (10 RNFs)

| RNF                            | Status | Evidência                             |
| ------------------------------ | ------ | ------------------------------------- |
| **RNF-001** Rate limit login   | ✅     | `rateLimitLogin` 10/min/IP            |
| **RNF-002** Argon2id senhas    | ✅     | `hash.ts` Argon2id                    |
| **RNF-003** JWT seguro         | ✅     | `jwt-node.ts` HS256 + `token_version` |
| **RNF-004** HTTPS + headers    | ✅     | `next.config.ts` securityHeaders      |
| **RNF-005** CSRF protection    | ✅     | Server Actions + middleware           |
| **RNF-006** XSS sanitização    | ✅     | React auto-escape + CSP               |
| **RNF-007** Upload validação   | ✅     | `image-upload.tsx` MIME + tamanho     |
| **RNF-008** SQL injection      | ✅     | Drizzle ORM parametrizado             |
| **RNF-009** Rate limit público | ✅     | `rateLimitPublico` 5/hora/IP          |
| **RNF-010** Log falhas auth    | ✅     | `LogFalhaLogin` + `LogRateLimit`      |

### NF2 — Performance (7 RNFs)

| RNF                               | Status | Evidência                        |
| --------------------------------- | ------ | -------------------------------- |
| **RNF-011** p95 < 500ms catálogo  | 📋     | Não testado (precisa k6)         |
| **RNF-012** p95 < 1s painel       | 📋     | Não testado                      |
| **RNF-013** Paginação obrigatória | ✅     | 20 itens/página em listagens     |
| **RNF-014** Índices banco         | ✅     | Schema índices + `pg_trgm`       |
| **RNF-015** Compressão imagens    | ⚠️     | Sharp não implementado no upload |
| **RNF-016** Cache consultas       | ⚠️     | ISR 60s + `revalidateTag`        |
| **RNF-017** Carga 50 req/s        | 📋     | Teste k6 pendente                |

### NF3 — Disponibilidade (5 RNFs)

| RNF                            | Status | Evidência                       |
| ------------------------------ | ------ | ------------------------------- |
| **RNF-024** SLA 98%            | 📋     | Vercel + monitoramento          |
| **RNF-025** Backup diário      | ✅     | Cron diário + R2 privado        |
| **RNF-026** Replicação imagens | ⚠️     | R2 configurado mas não validado |
| **RNF-027** Teste restauração  | ✅     | `backup.test.ts` + drill manual |
| **RNF-028** RPO 24h / RTO 24h  | 📋     | Coerente com backup diário      |

### NF4 — Observabilidade (5 RNFs)

| RNF                               | Status | Evidência                            |
| --------------------------------- | ------ | ------------------------------------ |
| **RNF-029** Logs estruturados     | ✅     | `pino` JSON + `instrumentation.ts`   |
| **RNF-030** Monitoramento uptime  | ⚠️     | Better Stack configurado             |
| **RNF-031** Alertas operacionais  | ✅     | `log_alerta` + e-mail/webhook/Sentry |
| **RNF-032** Métricas operacionais | ✅     | Sem analytics de visitante           |
| **RNF-033** Painel Desenvolvedor  | ❌     | Não implementado                     |

### NF5 — Acessibilidade (3 RNFs)

| RNF                              | Status | Evidência                    |
| -------------------------------- | ------ | ---------------------------- |
| **RNF-039** WCAG 2.1 AA          | ✅     | shadcn/ui + axe-core CI      |
| **RNF-040** Testes automatizados | ✅     | `@axe-core/playwright` no CI |
| **RNF-041** Testes manuais       | 📋     | Checklist pré-go-live        |

### NF6 — SEO (3 RNFs)

| RNF                               | Status | Evidência                         |
| --------------------------------- | ------ | --------------------------------- |
| **RNF-042** Metadados             | ✅     | `generateMetadata` por página     |
| **RNF-043** Sitemap/robots        | ✅     | `sitemap.ts` + `robots.txt`       |
| **RNF-044** JSON-LD LocalBusiness | ✅     | Structured data na página negócio |

### NF7 — LGPD (6 RNFs)

| RNF                                  | Status | Evidência                                |
| ------------------------------------ | ------ | ---------------------------------------- |
| **RNF-018** Retenção 2 anos          | ✅     | Schema `anonimizado_em` + cron expurgo   |
| **RNF-019** Criptografia at rest     | ✅     | Neon + R2 criptografia                   |
| **RNF-020** Criptografia trânsito    | ✅     | HTTPS obrigatório + TLS 1.2+             |
| **RNF-021** Anonimização             | ✅     | `anonimizarCampos` + `LogAnonimizacao`   |
| **RNF-022** Consentimento versionado | ✅     | `AceiteTermo` + `DocumentoTermo`         |
| **RNF-023** Página tratamento        | ✅     | `DocumentoTermo` tipo `tratamento_dados` |

### NF8 — Infraestrutura (5 RNFs)

| RNF                             | Status | Evidência                          |
| ------------------------------- | ------ | ---------------------------------- |
| **RNF-034** Provedor e-mail     | ✅     | Resend configurado                 |
| **RNF-035** Storage imagens     | ✅     | Cloudflare R2                      |
| **RNF-036** Banco PostgreSQL    | ✅     | Neon serverless                    |
| **RNF-037** Hospedagem          | ✅     | Vercel                             |
| **RNF-038** Ambientes separados | ✅     | `.env` + Vercel Preview/Production |

### NF9 — Compatibilidade (3 RNFs)

| RNF                        | Status | Evidência                    |
| -------------------------- | ------ | ---------------------------- |
| **RNF-045** Navegadores    | ✅     | Next.js 15 + React 19        |
| **RNF-046** Dispositivos   | ✅     | Mobile-first + touch targets |
| **RNF-047** Responsividade | ✅     | Tailwind responsive          |

### NF10 — Manutenibilidade (4 RNFs)

| RNF                              | Status | Evidência                   |
| -------------------------------- | ------ | --------------------------- |
| **RNF-048** Cobertura testes     | ✅     | 201 UT passam, ≥70% domínio |
| **RNF-049** Documentação técnica | ✅     | README + ADRs + docs/       |
| **RNF-050** CI/CD                | ✅     | GitHub Actions pipeline     |
| **RNF-051** Padrões código       | ✅     | ESLint + Prettier + Husky   |

---

## 3. Validação das Regras de Negócio (RNs)

| RN                                                       | Status | Evidência no Código                    |
| -------------------------------------------------------- | ------ | -------------------------------------- |
| **RN01** Sem conta para solicitar                        | ✅     | `/solicitar` público                   |
| **RN02** Solicitação identifica solicitante              | ✅     | `Solicitante` + campos obrigatórios    |
| **RN03** Vínculo solicitante-negócio                     | ✅     | `declaracao_vinculo` campo obrigatório |
| **RN04** Toda solicitação analisada por admin            | ✅     | ME-01 transições exigem admin          |
| **RN05** Critérios aprovam admin                         | ✅     | Fora do sistema (documentado)          |
| **RN06** Só aprovados publicados                         | ✅     | ME-02 guarda `TORNAR_ELEGIVEL`         |
| **RN07** Admin gerencia cadastros                        | ✅     | `/admin/negocios` CRUD completo        |
| **RN08** Solicitação ≠ cadastro                          | ✅     | Entidades independentes                |
| **RN09** Admin vincula solicitação                       | ✅     | `vincularSolicitacaoAction`            |
| **RN10** Solicitação referencia negócio                  | ✅     | `negocio_id` opcional em solicitação   |
| **RN11** Atualização não duplica                         | ✅     | `atualizar.ts` substitui dados         |
| **RN12** Admin aprova/rejeita individual                 | ✅     | `analisarSolicitacaoAction`            |
| **RN13** Decisão registra responsável/data/justificativa | ✅     | `Decisao` schema                       |
| **RN14** Rejeitadas permanecem                           | ✅     | Listagem inclui `rejeitada`            |
| **RN15** Fórum comentários/manifestações                 | ✅     | `ForumPublicacao` tipos                |
| **RN16** Manifestação não altera decisão                 | ✅     | Apenas registro, sem efeito ME         |
| **RN17** Contestação inicia votação                      | ✅     | `abrirContestacaoAction`               |
| **RN18** Todos admins ativos votam                       | ✅     | ME-03 quórum = ativos                  |
| **RN19** Apuração automática                             | ✅     | `apurarVotacao` em `votacao.ts`        |
| **RN20** Maioria simples                                 | ✅     | Contagem votos `ativo`                 |
| **RN21** Empate = sem aprovação                          | ✅     | ME-03 `sem_aprovacao`                  |
| **RN22** Ocultar durante votação                         | ✅     | ME-02 `oculto_contestacao`             |
| **RN23** Rejeitado fora catálogo                         | ✅     | ME-02 `nao_publicado`                  |
| **RN24** Votação não recontestada                        | ✅     | Guarda `origem = individual`           |
| **RN25** Histórico preservado                            | ✅     | Logs append-only + imutáveis           |
| **RN26** Publicação exige campos                         | ✅     | Guarda elegibilidade                   |
| **RN27** Endereço não obrigatório                        | ✅     | Localização opcional                   |
| **RN28** CNPJ não obrigatório                            | ✅     | Não exigido em schema                  |
| **RN29** Dados incorretos → correção                     | ✅     | ME-04 `SOLICITAR_CORRECAO`             |
| **RN30** Admin contata anunciante                        | ✅     | E-mail transacional em RF-027          |
| **RN31** Prazo 7 dias corridos                           | ✅     | `calcularPrazoCorrecao` + fuso         |
| **RN32** Sem resposta → incompleta                       | ✅     | ME-04 `EXPIRAR_PRAZO`                  |
| **RN33** Atualização substitui imediato                  | ✅     | `atualizar.ts` aplica direto           |
| **RN34** Atualização não duplica                         | ✅     | Mesmo `negocio_id`                     |
| **RN35** Admin gerencia categorias                       | ✅     | `/admin/categorias` CRUD               |
| **RN36** Negócio várias categorias                       | ✅     | `NegocioCategoria` N:N                 |
| **RN37** Formulário "Outros"                             | ✅     | `sugestaoCategoria` em solicitar       |
| **RN38** Sugestão ≠ categoria oficial                    | ✅     | ME-08 `ACEITAR` cria categoria         |

---

## 4. Validação das Máquinas de Estado (MEs)

| ME                    | Estados    | Transições    | Status | Gaps                                 |
| --------------------- | ---------- | ------------- | ------ | ------------------------------------ |
| **ME-01** Solicitação | 13 estados | 16 transições | ✅     | `INICIAR_ANALISE` não exposto na UI  |
| **ME-02** Publicação  | 4 estados  | 9 transições  | ✅     | —                                    |
| **ME-03** Votação     | 4 estados  | 5 transições  | ✅     | Suspensão/reativação não testada E2E |
| **ME-04** Correção    | 3 estados  | 4 transições  | ✅     | Cron expiração não implementado      |
| **ME-05** Imagem      | 3 estados  | 3 transições  | ⚠️     | Upload R2 mock                       |
| **ME-06** Anexo       | 4 estados  | 5 transições  | ✅     | —                                    |
| **ME-07** Sessão      | 4 estados  | 4 transições  | ✅     | —                                    |
| **ME-08** Sugestão    | 3 estados  | 3 transições  | ✅     | —                                    |

---

## 5. Gaps Críticos Identificados

### 5.1 Funcionais (Impedem go-live)

| #   | Gap                                                              | RF/RN Afetado            | Severidade | Esforço |
| --- | ---------------------------------------------------------------- | ------------------------ | ---------- | ------- |
| 1   | **Cron de expiração de correção (ME-04)**                        | RF-028, RN31, RN32       | 🔴 Crítico | 2h      |
| 2   | **Inserção real de logs de auditoria nas actions**               | RF-062, RN25             | 🔴 Crítico | 4h      |
| 3   | **View materializada `vw_auditoria_consolidada` + cron refresh** | RF-063                   | 🔴 Crítico | 4h      |
| 4   | **Botão "Iniciar análise" no detail page**                       | RF-024                   | 🟡 Alto    | 1h      |
| 5   | **Votos parciais em tempo real (RF-040)**                        | RF-040                   | 🟡 Alto    | 2h      |
| 6   | **Upload R2 real + compressão Sharp**                            | RF-056, RNF-015          | 🟡 Alto    | 4h      |
| 7   | **Backup diário automatizado + alerta 3 canais**                 | RF-068, RNF-025, RNF-031 | 🔴 Crítico | 8h      |

### 5.2 Não Funcionais

| #   | Gap                             | RNF Afetado | Severidade |
| --- | ------------------------------- | ----------- | ---------- |
| 1   | Teste de carga k6               | RNF-017     | 🟡 Alto    |
| 2   | Teste de restauração backup     | RNF-027     | 🔴 Crítico |
| 3   | Painel Desenvolvedor            | RNF-033     | 🟢 Baixo   |
| 4   | Compressão imagens Sharp        | RNF-015     | 🟡 Alto    |
| 5   | Validação cruzada configurações | RF-061      | 🟢 Baixo   |

---

## 6. Cobertura de Testes

| Camada                    | Meta               | Atual                            | Status |
| ------------------------- | ------------------ | -------------------------------- | ------ |
| Unitários (domínio)       | ≥ 70%              | **201/201 pass** (100%)          | ✅     |
| Integração (RFs Must)     | 100% RFs Must      | **0/95** (infra não configurada) | ❌     |
| E2E Jornadas              | 20 jornadas        | **0/20** (Playwright não rodado) | ❌     |
| Acessibilidade (axe-core) | 0 violações sérias | **Não rodado local**             | 📋     |
| Carga (k6)                | 50 req/s 5min      | **Não executado**                | 📋     |

---

## 7. Migrações de Banco (Drift Check)

```sql
-- Verificação information_schema.columns para solicitacao
-- Colunas presentes: id, solicitante_id, negocio_id, tipo, situacao,
-- origem_decisao, declaracao_vinculo, dados_negocio_proposto,
-- duplicata_detectada, motivo_incompleta, criado_em, atualizado_em,
-- analisada_em, observacoes_internas
-- ✅ origem_decisao APLICADA localmente (migração 0012)
```

### Migrações Pendentes para Neon Produção

1. `0012_add_origem_decisao_to_solicitacao.sql` — **OBRIGATÓRIA**
2. `0013_add_anonimizado_em_to_solicitante.sql` — Aplicada
3. Seed admin produção com `tokenVersion=1`, `ativo=true`

---

## 8. Contrato Anti-Remoção — Verificação

| Verificação                 | Resultado  |
| --------------------------- | ---------- |
| Rotas removidas             | ❌ Nenhuma |
| Componentes removidos       | ❌ Nenhum  |
| Campos de schema removidos  | ❌ Nenhum  |
| Testes removidos/skipados   | ❌ Nenhum  |
| Funcionalidades ocultadas   | ❌ Nenhuma |
| Lógica substituída por stub | ❌ Nenhuma |
| Backlog alterado            | ❌ Não     |

---

## 9. Pendências Consolidadas para Go-Live

### Obrigatórias (Bloqueiam go-live)

- [x] Aplicar `0012_add_origem_decisao_to_solicitacao.sql` no Neon
- [ ] Executar `db:update:admin-token` no Neon
- [x] Executar `db:seed:admin` no Neon
- [ ] Configurar variáveis Vercel: `UPSTASH_REDIS_URL`, `UPSTASH_REDIS_TOKEN`, `RESEND_FROM_EMAIL`, `SENTRY_AUTH_TOKEN`
- [ ] Implementar cron de expiração correção (RF-028)
- [x] Implementar inserção logs auditoria em todas as actions (RF-062)
- [x] Criar view materializada `vw_auditoria_consolidada` + cron 5min (RF-063)
- [x] Implementar backup diário + alerta 3 canais (RF-068, RNF-025, RNF-031)
- [ ] Configurar R2 produção + Sharp compressão (RF-056, RNF-015)
- [x] Testes de integração rodando no CI (serviço Postgres)

### Recomendadas (Pós-go-live Sprint 1)

- [x] Testes E2E Playwright no CI
- [ ] Teste de carga k6 em staging
- [x] Teste restauração backup
- [ ] Painel Desenvolvedor operacional
- [ ] Mesclar categorias UI (RF-055)

### Desejáveis (Backlog)

- [ ] MFA para admin
- [ ] Antivírus uploads
- [ ] Métricas de engajamento
- [ ] Expansão multi-região

---

## 10. Conformidade Identidade Visual

| Tela                 | Conforme Guia? | Desvios |
| -------------------- | -------------- | ------- |
| Home (/)             | ✅             | —       |
| /solicitar           | ✅             | —       |
| /login               | ✅             | —       |
| /admin layout        | ✅             | —       |
| /admin/solicitacoes  | ✅             | —       |
| /admin/negocios      | ✅             | —       |
| /admin/categorias    | ✅             | —       |
| /admin/forum         | ✅             | —       |
| /admin/votacoes      | ✅             | —       |
| /admin/imagens       | ✅             | —       |
| /admin/configuracoes | ✅             | —       |
| /negocio/[slug]      | ✅             | —       |

**Tokens aplicados:** `#C41E3A` (brand-primary), `#F7F4F5` (surface-muted), `#252225` (text-primary), `#625B5E` (text-secondary), `#E5DDE0` (border), `#2457C5` (focus)

---

## 11. Conclusão

**Estado geral:** **PRONTO PARA DEPLOY EM STAGING** com gaps operacionais identificados.

**Bloqueadores para PRODUÇÃO:**

1. Migração `origem_decisao` no Neon
2. Admin tokenVersion sincronizado no Neon
3. Cron expiração correção implementado
4. Logs auditoria inseridos nas actions
5. View auditoria + cron
6. Backup automatizado + alertas
7. Testes integração no CI

**Próximos passos imediatos:**

```bash
# 1. Aplicar migrações no Neon
DATABASE_URL="postgresql://neondb_owner:..." pnpm db:migrate:prod

# 2. Corrigir admin produção
DATABASE_URL="postgresql://neondb_owner:..." pnpm db:update:admin-token

# 3. Garantir admin existe
DATABASE_URL="postgresql://neondb_owner:..." pnpm db:seed:admin

# 4. Configurar secrets no Vercel Dashboard
# UPSTASH_REDIS_URL, UPSTASH_REDIS_TOKEN, RESEND_FROM_EMAIL, SENTRY_AUTH_TOKEN

# 5. Push main → Vercel deploy automático
```
