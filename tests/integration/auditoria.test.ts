import { beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { db } from "@/infrastructure/db/client";
import { logLogin, logNegocio } from "@/infrastructure/db/schema/logs";
import {
  atualizarViewAuditoria,
  consultarAuditoria,
} from "@/application/auditoria/auditoria.service";
import { appendLog } from "@/infrastructure/audit/audit.service";
import { atualizarConfiguracao } from "@/application/configuracao/configuracao.service";
import { criarAdmin, criarNegocio, limparBanco } from "./setup";

/**
 * RF-062 / RF-063 (F9-04, F9-05, F9-06).
 * Prova que os eventos gravados nas tabelas de log aparecem na view
 * materializada consolidada, com ator, ação, entidade e detalhes.
 */
describe("auditoria consolidada", () => {
  beforeEach(async () => {
    await limparBanco();
    await atualizarViewAuditoria();
  });

  it("é uma view materializada com índice único (necessário p/ refresh concorrente)", async () => {
    const tipo = await db.execute(
      sql`select relkind::text as tipo from pg_class where relname = 'vw_auditoria_consolidada'`,
    );
    const indices = await db.execute(
      sql`select indexname from pg_indexes where tablename = 'vw_auditoria_consolidada'`,
    );

    expect((tipo as unknown as Array<{ tipo: string }>)[0]?.tipo).toBe("m");
    expect(
      (indices as unknown as Array<{ indexname: string }>).map(
        (i) => i.indexname,
      ),
    ).toContain("vw_auditoria_consolidada_pk");
  });

  it("consolida eventos de tabelas diferentes em um formato único", async () => {
    const admin = await criarAdmin();
    const negocio = await criarNegocio({ slug: "padaria", nome: "Padaria" });

    await db.insert(logLogin).values({
      atorTipo: "admin",
      atorId: admin.id,
      adminId: admin.id,
    });
    await db.insert(logNegocio).values({
      atorTipo: "admin",
      atorId: admin.id,
      negocioId: negocio.id,
      acao: "publicar",
      snapshotAntes: null,
      snapshotDepois: null,
    });

    await atualizarViewAuditoria();
    const { registros, total } = await consultarAuditoria();

    expect(total).toBe(2);

    const login = registros.find((r) => r.origem === "log_login");
    expect(login?.acao).toBe("login");
    expect(login?.entidadeTipo).toBe("administrador");
    expect(login?.entidadeId).toBe(admin.id);
    expect(login?.atorId).toBe(admin.id);

    const publicacao = registros.find((r) => r.origem === "log_negocio");
    expect(publicacao?.acao).toBe("publicar");
    expect(publicacao?.entidadeTipo).toBe("negocio");
    expect(publicacao?.entidadeId).toBe(negocio.id);
  });

  it("filtra por origem, entidade e ator", async () => {
    const admin = await criarAdmin();
    const negocio = await criarNegocio({ slug: "loja", nome: "Loja" });

    await db.insert(logLogin).values({
      atorTipo: "admin",
      atorId: admin.id,
      adminId: admin.id,
    });
    await db.insert(logNegocio).values({
      atorTipo: "admin",
      atorId: admin.id,
      negocioId: negocio.id,
      acao: "editar",
    });
    await atualizarViewAuditoria();

    expect((await consultarAuditoria({ origem: "log_negocio" })).total).toBe(1);
    expect((await consultarAuditoria({ entidadeTipo: "negocio" })).total).toBe(
      1,
    );
    expect(
      (
        await consultarAuditoria({
          entidadeTipo: "negocio",
          entidadeId: negocio.id,
        })
      ).total,
    ).toBe(1);
    expect((await consultarAuditoria({ atorId: admin.id })).total).toBe(2);
    expect((await consultarAuditoria({ acao: "inexistente" })).total).toBe(0);
  });

  it("leva para a view o log_auditoria gravado pelos casos de uso", async () => {
    const admin = await criarAdmin();

    await appendLog({
      atorTipo: "admin",
      atorId: admin.id,
      acao: "publicar_negocio",
      entidadeTipo: "negocio",
      entidadeId: null,
      detalhes: { slug: "padaria" },
    });

    await atualizarViewAuditoria();
    const { registros } = await consultarAuditoria({ origem: "log_auditoria" });

    expect(registros).toHaveLength(1);
    expect(registros[0]?.acao).toBe("publicar_negocio");
    expect(registros[0]?.detalhes).toEqual({ slug: "padaria" });
    expect(registros[0]?.entidadeTipo).toBe("negocio");
  });

  it("uma alteração de configuração aparece duas vezes: evento + índice de auditoria", async () => {
    const admin = await criarAdmin();

    await atualizarConfiguracao({
      chave: "prazo_correcao_dias",
      valor: "12",
      adminId: admin.id,
      ipOrigem: "198.51.100.7",
    });

    await atualizarViewAuditoria();
    const { registros, total } = await consultarAuditoria();

    expect(total).toBe(2);
    expect(registros.map((r) => r.origem).sort()).toEqual([
      "log_auditoria",
      "log_configuracao",
    ]);
    const evento = registros.find((r) => r.origem === "log_configuracao");
    expect(evento?.detalhes).toMatchObject({
      chave: "prazo_correcao_dias",
      valor_antes: "7",
      valor_depois: "12",
    });
  });

  it("pagina por limite e deslocamento, do mais recente para o mais antigo", async () => {
    const admin = await criarAdmin();
    for (let i = 0; i < 3; i += 1) {
      await db.insert(logLogin).values({
        atorTipo: "admin",
        atorId: admin.id,
        adminId: admin.id,
      });
    }
    await atualizarViewAuditoria();

    const primeira = await consultarAuditoria({ limite: 2 });
    const segunda = await consultarAuditoria({ limite: 2, deslocamento: 2 });

    expect(primeira.registros).toHaveLength(2);
    expect(segunda.registros).toHaveLength(1);
    expect(primeira.total).toBe(3);
    expect(primeira.registros[0]?.criadoEm.getTime()).toBeGreaterThanOrEqual(
      primeira.registros[1]!.criadoEm.getTime(),
    );
  });
});
