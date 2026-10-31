import { db } from "@/infrastructure/db/client";
import { sql } from "drizzle-orm";

async function run() {
  try {
    console.log("🔄 Criando view vw_auditoria_consolidada em etapas...");

    // Estratégia: criar view com apenas as tabelas principais primeiro
    const coreTables = [
      {
        name: "log_login",
        acao: "login",
        entidade: "admin",
        detalhes: "jsonb_build_object('admin_id', admin_id)",
      },
      {
        name: "log_logout",
        acao: "logout",
        entidade: "admin",
        detalhes: "jsonb_build_object('admin_id', admin_id)",
      },
      {
        name: "log_falha_login",
        acao: "falha_login",
        entidade: "admin",
        detalhes:
          "jsonb_build_object('email_tentado', email_tentado, 'motivo', motivo)",
        ator_tipo: "'sistema'",
        ator_id: "null",
      },
      {
        name: "log_recuperacao_senha",
        acao: "etapa",
        entidade: "admin",
        detalhes: "jsonb_build_object('admin_id', admin_id, 'etapa', etapa)",
        ator_tipo: "'admin'",
        ator_id: "admin_id",
      },
      {
        name: "log_rate_limit",
        acao: "rate_limit",
        entidade: "rate_limit",
        detalhes:
          "jsonb_build_object('ip', ip, 'rota', rota, 'limite', limite)",
        ator_tipo: "'sistema'",
        ator_id: "null",
      },
      {
        name: "log_solicitacao_recebida",
        acao: "solicitacao_recebida",
        entidade: "solicitacao",
        detalhes:
          "jsonb_build_object('solicitacao_id', solicitacao_id, 'tipo', tipo)",
        ator_tipo: "'solicitante'",
        ator_id: "null",
      },
    ];

    let unionParts = [];

    for (const t of coreTables) {
      const atorTipo = t.ator_tipo || "ator_tipo";
      const atorId = t.ator_id || "ator_id";
      const detalhes = t.detalhes;

      unionParts.push(sql`
        SELECT
          id,
          ${sql.raw(`'${t.name}'`)} as tabela_origem,
          criado_em,
          ${sql.raw(atorTipo)} as ator_tipo,
          ${sql.raw(atorId)} as ator_id,
          ${sql.raw(`'${t.acao}'`)} as acao,
          ${sql.raw(`'${t.entidade}'`)} as entidade_tipo,
          ${sql.raw(t.entidade === "admin" ? "ator_id" : "null")} as entidade_id,
          ${sql.raw(detalhes)} as detalhes
        FROM ${sql.identifier(t.name)}
      `);
    }

    // Primeira parte - criar view com tabelas principais
    const coreQuery = sql`CREATE OR REPLACE VIEW vw_auditoria_consolidada AS ${sql.join(unionParts, sql` UNION ALL `)}`;
    await db.execute(coreQuery);
    console.log("✅ Parte 1 (core) criada");

    // Agora adicionar as demais tabelas via ALTER VIEW ou recriar
    // Como ALTER VIEW não suporta UNION ALL, vamos recriar a view completa
    // Vamos usar a abordagem de criar em etapas com INSERT INTO

    console.log("✅ Parte 1 (core) criada");
  } catch (e: any) {
    console.error("❌ Erro:", e.message);
    console.error(e.stack);
  }
  process.exit(0);
}

run();
