import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/infrastructure/db/client";
import { configuracao } from "@/infrastructure/db/schema";
import { logConfiguracao, logAuditoria } from "@/infrastructure/db/schema/logs";
import {
  CHAVES_CONFIGURACAO,
  CONFIGURACOES,
  atualizarConfiguracao,
  garantirConfiguracoesPadrao,
  listarConfiguracoes,
  obterConfiguracao,
  obterConfiguracaoLista,
  obterConfiguracaoNumero,
} from "@/application/configuracao/configuracao.service";
import { ErroDominio } from "@/domain/errors/domain-error";
import { criarAdmin, limparBanco } from "./setup";

/**
 * RF-061 / F9-01 / F9-03 — parâmetros operacionais.
 * Cobre: padrões, validação por chave, persistência, logs de evento e de
 * auditoria na mesma transação, e idempotência.
 */
describe("configuração do sistema", () => {
  beforeEach(async () => {
    await limparBanco();
  });

  it("usa os valores padrão quando nada foi persistido", async () => {
    expect(await obterConfiguracao("prazo_correcao_dias")).toBe("7");
    expect(await obterConfiguracaoNumero("tamanho_max_upload_mb")).toBe(10);
    expect(await obterConfiguracaoLista("formatos_imagem_aceitos")).toEqual([
      "jpg",
      "png",
      "webp",
    ]);
  });

  it("cria todas as chaves previstas de forma idempotente", async () => {
    const admin = await criarAdmin();

    const primeira = await garantirConfiguracoesPadrao(admin.id);
    const segunda = await garantirConfiguracoesPadrao(admin.id);

    expect(primeira.criadas.sort()).toEqual([...CHAVES_CONFIGURACAO].sort());
    expect(segunda.criadas).toEqual([]);

    const mapa = await listarConfiguracoes();
    expect(Object.keys(mapa).sort()).toEqual([...CHAVES_CONFIGURACAO].sort());
    expect(mapa.prazo_correcao_dias).toBe(
      CONFIGURACOES.prazo_correcao_dias.padrao,
    );
  });

  it("persiste valor válido e registra log de evento e de auditoria", async () => {
    const admin = await criarAdmin();

    const resultado = await atualizarConfiguracao({
      chave: "prazo_correcao_dias",
      valor: "10",
      adminId: admin.id,
      ipOrigem: "203.0.113.55",
      userAgent: "vitest",
    });

    expect(resultado).toMatchObject({
      valorAntes: "7",
      valorDepois: "10",
      alterado: true,
    });
    expect(await obterConfiguracaoNumero("prazo_correcao_dias")).toBe(10);

    const eventos = await db
      .select()
      .from(logConfiguracao)
      .where(eq(logConfiguracao.chave, "prazo_correcao_dias"));
    expect(eventos).toHaveLength(1);
    expect(eventos[0]?.valorAntes).toBe("7");
    expect(eventos[0]?.valorDepois).toBe("10");
    expect(eventos[0]?.atorId).toBe(admin.id);

    const auditoria = await db
      .select()
      .from(logAuditoria)
      .where(eq(logAuditoria.acao, "atualizar_configuracao"));
    expect(auditoria).toHaveLength(1);
    expect(auditoria[0]?.entidadeTipo).toBe("configuracao");
    expect(auditoria[0]?.ipOrigem).toBe("203.0.113.55");
    expect(auditoria[0]?.detalhes).toEqual({
      chave: "prazo_correcao_dias",
      valorAntes: "7",
      valorDepois: "10",
    });
  });

  it("não grava nada quando o valor não muda", async () => {
    const admin = await criarAdmin();

    const resultado = await atualizarConfiguracao({
      chave: "prazo_correcao_dias",
      valor: "7",
      adminId: admin.id,
    });

    expect(resultado.alterado).toBe(false);
    const eventos = await db.select().from(logConfiguracao);
    expect(eventos).toHaveLength(0);
  });

  it("rejeita chave desconhecida", async () => {
    const admin = await criarAdmin();

    await expect(
      atualizarConfiguracao({
        chave: "chave_que_nao_existe",
        valor: "1",
        adminId: admin.id,
      }),
    ).rejects.toBeInstanceOf(ErroDominio);
  });

  it("rejeita valor inválido por tipo (e-mail, número, lista)", async () => {
    const admin = await criarAdmin();

    await expect(
      atualizarConfiguracao({
        chave: "email_contato_dpo",
        valor: "nao-e-email",
        adminId: admin.id,
      }),
    ).rejects.toThrow(/Valor inválido/);

    await expect(
      atualizarConfiguracao({
        chave: "tamanho_max_upload_mb",
        valor: "999",
        adminId: admin.id,
      }),
    ).rejects.toThrow(/Valor inválido/);

    await expect(
      atualizarConfiguracao({
        chave: "formatos_imagem_aceitos",
        valor: "jpg;png",
        adminId: admin.id,
      }),
    ).rejects.toThrow(/Valor inválido/);

    const linhas = await db.select().from(configuracao);
    expect(linhas).toHaveLength(0);
  });
});
