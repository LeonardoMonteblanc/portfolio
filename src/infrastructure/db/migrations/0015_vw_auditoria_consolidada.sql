-- 0015: visão consolidada de auditoria (RF-063 / F9-05 / F9-06).
-- Materializada porque a consulta cruza 24 tabelas de log e é somente leitura.
-- Atualizada por /api/auditoria/refresh (CRON_SECRET) a cada
-- 'refresh_view_auditoria_min' minutos (parâmetro em configuracao).

-- Regulariza três tabelas de log que só existiam no banco (criadas por script
-- ad-hoc em 2026-10-29) e não tinham schema/migration. Sem elas a view não
-- podia ser construída em um banco novo.
CREATE TABLE IF NOT EXISTS "log_correcao" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ator_tipo" varchar(20) NOT NULL,
  "ator_id" uuid,
  "ip_origem" varchar(45),
  "user_agent" varchar(500),
  "request_id" uuid,
  "criado_em" timestamp with time zone DEFAULT now() NOT NULL,
  "solicitacao_id" uuid NOT NULL,
  "acao" varchar(20) NOT NULL,
  "prazo_em" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "log_reabertura" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ator_tipo" varchar(20) NOT NULL,
  "ator_id" uuid,
  "ip_origem" varchar(45),
  "user_agent" varchar(500),
  "request_id" uuid,
  "criado_em" timestamp with time zone DEFAULT now() NOT NULL,
  "solicitacao_id" uuid NOT NULL,
  "decisao_original_id" uuid NOT NULL,
  "justificativa" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "log_cancelamento_fila" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ator_tipo" varchar(20) NOT NULL,
  "ator_id" uuid,
  "ip_origem" varchar(45),
  "user_agent" varchar(500),
  "request_id" uuid,
  "criado_em" timestamp with time zone DEFAULT now() NOT NULL,
  "solicitacao_id" uuid NOT NULL,
  "motivo" text
);
--> statement-breakpoint
DROP MATERIALIZED VIEW IF EXISTS "vw_auditoria_consolidada";
--> statement-breakpoint

CREATE MATERIALIZED VIEW "vw_auditoria_consolidada" AS
SELECT
  t.criado_em,
  'log_anexo'::text AS origem,
  t.id AS registro_id,
  t.ator_tipo,
  t.ator_id,
  t.request_id,
  t.ip_origem,
  t.user_agent,
  t.acao::text AS acao,
  'anexo' AS entidade_tipo,
  t.anexo_id AS entidade_id,
  (to_jsonb(t) - ARRAY['id','criado_em','ator_tipo','ator_id','ip_origem','user_agent','request_id']::text[]) AS detalhes
FROM log_anexo t

UNION ALL

SELECT
  t.criado_em,
  'log_anonimizacao'::text AS origem,
  t.id AS registro_id,
  t.ator_tipo,
  t.ator_id,
  t.request_id,
  t.ip_origem,
  t.user_agent,
  'anonimizar'::text AS acao,
  'solicitante' AS entidade_tipo,
  t.solicitante_id AS entidade_id,
  (to_jsonb(t) - ARRAY['id','criado_em','ator_tipo','ator_id','ip_origem','user_agent','request_id']::text[]) AS detalhes
FROM log_anonimizacao t

UNION ALL

SELECT
  t.criado_em,
  'log_auditoria'::text AS origem,
  t.id AS registro_id,
  t.ator_tipo,
  t.ator_id,
  t.request_id,
  t.ip_origem,
  t.user_agent,
  t.acao::text AS acao,
  t.entidade_tipo AS entidade_tipo,
  t.entidade_id AS entidade_id,
  t.detalhes
FROM log_auditoria t

UNION ALL

SELECT
  t.criado_em,
  'log_cancelamento_fila'::text AS origem,
  t.id AS registro_id,
  t.ator_tipo,
  t.ator_id,
  t.request_id,
  t.ip_origem,
  t.user_agent,
  'cancelar_fila'::text AS acao,
  'solicitacao' AS entidade_tipo,
  t.solicitacao_id AS entidade_id,
  (to_jsonb(t) - ARRAY['id','criado_em','ator_tipo','ator_id','ip_origem','user_agent','request_id']::text[]) AS detalhes
FROM log_cancelamento_fila t

UNION ALL

SELECT
  t.criado_em,
  'log_categoria'::text AS origem,
  t.id AS registro_id,
  t.ator_tipo,
  t.ator_id,
  t.request_id,
  t.ip_origem,
  t.user_agent,
  t.acao::text AS acao,
  'categoria' AS entidade_tipo,
  t.categoria_id AS entidade_id,
  (to_jsonb(t) - ARRAY['id','criado_em','ator_tipo','ator_id','ip_origem','user_agent','request_id']::text[]) AS detalhes
FROM log_categoria t

UNION ALL

SELECT
  t.criado_em,
  'log_comunicacao'::text AS origem,
  t.id AS registro_id,
  t.ator_tipo,
  t.ator_id,
  t.request_id,
  t.ip_origem,
  t.user_agent,
  t.tipo::text AS acao,
  'comunicacao' AS entidade_tipo,
  NULL::uuid AS entidade_id,
  (to_jsonb(t) - ARRAY['id','criado_em','ator_tipo','ator_id','ip_origem','user_agent','request_id']::text[]) AS detalhes
FROM log_comunicacao t

UNION ALL

SELECT
  t.criado_em,
  'log_configuracao'::text AS origem,
  t.id AS registro_id,
  t.ator_tipo,
  t.ator_id,
  t.request_id,
  t.ip_origem,
  t.user_agent,
  'atualizar_configuracao'::text AS acao,
  'configuracao' AS entidade_tipo,
  NULL::uuid AS entidade_id,
  (to_jsonb(t) - ARRAY['id','criado_em','ator_tipo','ator_id','ip_origem','user_agent','request_id']::text[]) AS detalhes
FROM log_configuracao t

UNION ALL

SELECT
  t.criado_em,
  'log_contestacao'::text AS origem,
  t.id AS registro_id,
  t.ator_tipo,
  t.ator_id,
  t.request_id,
  t.ip_origem,
  t.user_agent,
  t.acao::text AS acao,
  'contestacao' AS entidade_tipo,
  t.contestacao_id AS entidade_id,
  (to_jsonb(t) - ARRAY['id','criado_em','ator_tipo','ator_id','ip_origem','user_agent','request_id']::text[]) AS detalhes
FROM log_contestacao t

UNION ALL

SELECT
  t.criado_em,
  'log_correcao'::text AS origem,
  t.id AS registro_id,
  t.ator_tipo,
  t.ator_id,
  t.request_id,
  t.ip_origem,
  t.user_agent,
  t.acao::text AS acao,
  'solicitacao' AS entidade_tipo,
  t.solicitacao_id AS entidade_id,
  (to_jsonb(t) - ARRAY['id','criado_em','ator_tipo','ator_id','ip_origem','user_agent','request_id']::text[]) AS detalhes
FROM log_correcao t

UNION ALL

SELECT
  t.criado_em,
  'log_falha_login'::text AS origem,
  t.id AS registro_id,
  t.ator_tipo,
  coalesce(t.ator_id, t.admin_id) AS ator_id,
  t.request_id,
  t.ip_origem,
  t.user_agent,
  'login_falha'::text AS acao,
  'administrador' AS entidade_tipo,
  t.admin_id AS entidade_id,
  (to_jsonb(t) - ARRAY['id','criado_em','ator_tipo','ator_id','ip_origem','user_agent','request_id']::text[]) AS detalhes
FROM log_falha_login t

UNION ALL

SELECT
  t.criado_em,
  'log_forum'::text AS origem,
  t.id AS registro_id,
  t.ator_tipo,
  t.ator_id,
  t.request_id,
  t.ip_origem,
  t.user_agent,
  t.acao::text AS acao,
  'forum_publicacao' AS entidade_tipo,
  t.publicacao_id AS entidade_id,
  (to_jsonb(t) - ARRAY['id','criado_em','ator_tipo','ator_id','ip_origem','user_agent','request_id']::text[]) AS detalhes
FROM log_forum t

UNION ALL

SELECT
  t.criado_em,
  'log_imagem'::text AS origem,
  t.id AS registro_id,
  t.ator_tipo,
  t.ator_id,
  t.request_id,
  t.ip_origem,
  t.user_agent,
  t.acao::text AS acao,
  'imagem' AS entidade_tipo,
  t.imagem_id AS entidade_id,
  (to_jsonb(t) - ARRAY['id','criado_em','ator_tipo','ator_id','ip_origem','user_agent','request_id']::text[]) AS detalhes
FROM log_imagem t

UNION ALL

SELECT
  t.criado_em,
  'log_login'::text AS origem,
  t.id AS registro_id,
  t.ator_tipo,
  coalesce(t.ator_id, t.admin_id) AS ator_id,
  t.request_id,
  t.ip_origem,
  t.user_agent,
  'login'::text AS acao,
  'administrador' AS entidade_tipo,
  t.admin_id AS entidade_id,
  (to_jsonb(t) - ARRAY['id','criado_em','ator_tipo','ator_id','ip_origem','user_agent','request_id']::text[]) AS detalhes
FROM log_login t

UNION ALL

SELECT
  t.criado_em,
  'log_logout'::text AS origem,
  t.id AS registro_id,
  t.ator_tipo,
  coalesce(t.ator_id, t.admin_id) AS ator_id,
  t.request_id,
  t.ip_origem,
  t.user_agent,
  'logout'::text AS acao,
  'administrador' AS entidade_tipo,
  t.admin_id AS entidade_id,
  (to_jsonb(t) - ARRAY['id','criado_em','ator_tipo','ator_id','ip_origem','user_agent','request_id']::text[]) AS detalhes
FROM log_logout t

UNION ALL

SELECT
  t.criado_em,
  'log_negocio'::text AS origem,
  t.id AS registro_id,
  t.ator_tipo,
  t.ator_id,
  t.request_id,
  t.ip_origem,
  t.user_agent,
  t.acao::text AS acao,
  'negocio' AS entidade_tipo,
  t.negocio_id AS entidade_id,
  (to_jsonb(t) - ARRAY['id','criado_em','ator_tipo','ator_id','ip_origem','user_agent','request_id']::text[]) AS detalhes
FROM log_negocio t

UNION ALL

SELECT
  t.criado_em,
  'log_rate_limit'::text AS origem,
  t.id AS registro_id,
  t.ator_tipo,
  t.ator_id,
  t.request_id,
  t.ip_origem,
  t.user_agent,
  'rate_limit'::text AS acao,
  'ip' AS entidade_tipo,
  NULL::uuid AS entidade_id,
  (to_jsonb(t) - ARRAY['id','criado_em','ator_tipo','ator_id','ip_origem','user_agent','request_id']::text[]) AS detalhes
FROM log_rate_limit t

UNION ALL

SELECT
  t.criado_em,
  'log_reabertura'::text AS origem,
  t.id AS registro_id,
  t.ator_tipo,
  t.ator_id,
  t.request_id,
  t.ip_origem,
  t.user_agent,
  'reabrir'::text AS acao,
  'solicitacao' AS entidade_tipo,
  t.solicitacao_id AS entidade_id,
  (to_jsonb(t) - ARRAY['id','criado_em','ator_tipo','ator_id','ip_origem','user_agent','request_id']::text[]) AS detalhes
FROM log_reabertura t

UNION ALL

SELECT
  t.criado_em,
  'log_recuperacao_senha'::text AS origem,
  t.id AS registro_id,
  t.ator_tipo,
  coalesce(t.ator_id, t.admin_id) AS ator_id,
  t.request_id,
  t.ip_origem,
  t.user_agent,
  t.etapa::text AS acao,
  'administrador' AS entidade_tipo,
  t.admin_id AS entidade_id,
  (to_jsonb(t) - ARRAY['id','criado_em','ator_tipo','ator_id','ip_origem','user_agent','request_id']::text[]) AS detalhes
FROM log_recuperacao_senha t

UNION ALL

SELECT
  t.criado_em,
  'log_solicitacao_analisada'::text AS origem,
  t.id AS registro_id,
  t.ator_tipo,
  t.ator_id,
  t.request_id,
  t.ip_origem,
  t.user_agent,
  t.decisao::text AS acao,
  'solicitacao' AS entidade_tipo,
  t.solicitacao_id AS entidade_id,
  (to_jsonb(t) - ARRAY['id','criado_em','ator_tipo','ator_id','ip_origem','user_agent','request_id']::text[]) AS detalhes
FROM log_solicitacao_analisada t

UNION ALL

SELECT
  t.criado_em,
  'log_solicitacao_recebida'::text AS origem,
  t.id AS registro_id,
  t.ator_tipo,
  t.ator_id,
  t.request_id,
  t.ip_origem,
  t.user_agent,
  'receber'::text AS acao,
  'solicitacao' AS entidade_tipo,
  t.solicitacao_id AS entidade_id,
  (to_jsonb(t) - ARRAY['id','criado_em','ator_tipo','ator_id','ip_origem','user_agent','request_id']::text[]) AS detalhes
FROM log_solicitacao_recebida t

UNION ALL

SELECT
  t.criado_em,
  'log_sugestao_categoria'::text AS origem,
  t.id AS registro_id,
  t.ator_tipo,
  t.ator_id,
  t.request_id,
  t.ip_origem,
  t.user_agent,
  t.acao::text AS acao,
  'sugestao_categoria' AS entidade_tipo,
  t.sugestao_id AS entidade_id,
  (to_jsonb(t) - ARRAY['id','criado_em','ator_tipo','ator_id','ip_origem','user_agent','request_id']::text[]) AS detalhes
FROM log_sugestao_categoria t

UNION ALL

SELECT
  t.criado_em,
  'log_suspensao_admin'::text AS origem,
  t.id AS registro_id,
  t.ator_tipo,
  coalesce(t.ator_id, t.admin_alvo_id) AS ator_id,
  t.request_id,
  t.ip_origem,
  t.user_agent,
  t.acao::text AS acao,
  'administrador' AS entidade_tipo,
  t.admin_alvo_id AS entidade_id,
  (to_jsonb(t) - ARRAY['id','criado_em','ator_tipo','ator_id','ip_origem','user_agent','request_id']::text[]) AS detalhes
FROM log_suspensao_admin t

UNION ALL

SELECT
  t.criado_em,
  'log_vinculacao_solicitacao'::text AS origem,
  t.id AS registro_id,
  t.ator_tipo,
  t.ator_id,
  t.request_id,
  t.ip_origem,
  t.user_agent,
  'vincular'::text AS acao,
  'solicitacao' AS entidade_tipo,
  t.solicitacao_id AS entidade_id,
  (to_jsonb(t) - ARRAY['id','criado_em','ator_tipo','ator_id','ip_origem','user_agent','request_id']::text[]) AS detalhes
FROM log_vinculacao_solicitacao t

UNION ALL

SELECT
  t.criado_em,
  'log_votacao'::text AS origem,
  t.id AS registro_id,
  t.ator_tipo,
  t.ator_id,
  t.request_id,
  t.ip_origem,
  t.user_agent,
  t.acao::text AS acao,
  'votacao' AS entidade_tipo,
  t.votacao_id AS entidade_id,
  (to_jsonb(t) - ARRAY['id','criado_em','ator_tipo','ator_id','ip_origem','user_agent','request_id']::text[]) AS detalhes
FROM log_votacao t;
--> statement-breakpoint

-- Necessário para REFRESH MATERIALIZED VIEW CONCURRENTLY.
CREATE UNIQUE INDEX IF NOT EXISTS "vw_auditoria_consolidada_pk"
  ON "vw_auditoria_consolidada" ("origem", "registro_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vw_auditoria_consolidada_criado_em"
  ON "vw_auditoria_consolidada" ("criado_em" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vw_auditoria_consolidada_ator"
  ON "vw_auditoria_consolidada" ("ator_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vw_auditoria_consolidada_entidade"
  ON "vw_auditoria_consolidada" ("entidade_tipo", "entidade_id");