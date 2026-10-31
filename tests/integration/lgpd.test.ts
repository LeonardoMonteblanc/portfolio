import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/infrastructure/db/client";
import { solicitacao, solicitante } from "@/infrastructure/db/schema";
import { logAnonimizacao } from "@/infrastructure/db/schema/logs";
import {
  anonimizarSolicitante,
  cronAnonimizacaoAutomatica,
} from "@/application/lgpd/anonymize.service";
import { MARCADOR_ANONIMIZADO } from "@/domain/utils/anonimizar-campos";
import { criarSolicitacaoComPii, limparBanco } from "./setup";

/**
 * RF-072 / RNF-021 — direito de exclusão.
 * Regressão do defeito de 31/10: a anonimização não percorria o jsonb e
 * deixava nome/contatos/endereço intactos em dados_negocio_proposto.
 */
describe("LGPD — anonimização do titular", () => {
  beforeEach(async () => {
    await limparBanco();
  });

  it("substitui nome, e-mail e telefone e grava anonimizado_em", async () => {
    const { solicitante: alvo } = await criarSolicitacaoComPii();

    await anonimizarSolicitante(alvo.id, null);

    const [depois] = await db
      .select()
      .from(solicitante)
      .where(eq(solicitante.id, alvo.id));

    expect(depois?.nome).toBe(MARCADOR_ANONIMIZADO);
    expect(depois?.email).toBe(MARCADOR_ANONIMIZADO);
    expect(depois?.telefone).toBe(MARCADOR_ANONIMIZADO);
    expect(depois?.anonimizadoEm).toBeInstanceOf(Date);
  });

  it("mascara PII do jsonb e preserva dados não pessoais", async () => {
    const { solicitante: alvo, solicitacao: pedido } =
      await criarSolicitacaoComPii();

    await anonimizarSolicitante(alvo.id, null);

    const [depois] = await db
      .select()
      .from(solicitacao)
      .where(eq(solicitacao.id, pedido.id));

    const dados = depois?.dadosNegocioProposto as Record<string, unknown>;
    expect(dados.nome).toBe(MARCADOR_ANONIMIZADO);

    const contatos = dados.contatos as Array<{ valor: string; tipo: string }>;
    expect(contatos[0]?.valor).toBe(MARCADOR_ANONIMIZADO);
    expect(contatos[0]?.tipo).toBe("whatsapp");

    const local = dados.localizacao as Record<string, unknown>;
    expect(local.endereco).toBe(MARCADOR_ANONIMIZADO);
    expect(local.bairro).toBe("Centro");

    // Preservados: descrição, horários e sugestão de categoria.
    expect(dados.descricao).toBe("Costura criativa e reparos");
    expect(dados.sugestaoCategoria).toBe("Costura");
    expect(dados.horarios).toEqual([
      { diaSemana: 1, horaAbertura: "09:00", horaFechamento: "18:00" },
    ]);
  });

  it("registra LogAnonimizacao com os campos alterados", async () => {
    const { solicitante: alvo } = await criarSolicitacaoComPii();

    const resultado = await anonimizarSolicitante(
      alvo.id,
      null,
      "203.0.113.10",
      "vitest",
      "sistema",
    );

    const logs = await db
      .select()
      .from(logAnonimizacao)
      .where(eq(logAnonimizacao.solicitanteId, alvo.id));

    expect(logs).toHaveLength(1);
    expect(logs[0]?.atorTipo).toBe("sistema");
    expect(logs[0]?.ipOrigem).toBe("203.0.113.10");
    expect(logs[0]?.camposAnonimizados).toContain("solicitante.nome");
    expect(resultado.camposAnonimizados.length).toBeGreaterThan(3);
  });

  it("é idempotente: a segunda chamada não altera nem duplica log", async () => {
    const { solicitante: alvo } = await criarSolicitacaoComPii();

    await anonimizarSolicitante(alvo.id, null);
    const segundo = await anonimizarSolicitante(alvo.id, null);

    const logs = await db
      .select()
      .from(logAnonimizacao)
      .where(eq(logAnonimizacao.solicitanteId, alvo.id));

    expect(segundo.camposAnonimizados).toEqual([]);
    expect(logs).toHaveLength(1);
  });

  it("recusa solicitante inexistente", async () => {
    await expect(
      anonimizarSolicitante("00000000-0000-0000-0000-000000000000", null),
    ).rejects.toThrow("Solicitante não encontrado");
  });

  it("cron expurga apenas solicitações terminais com mais de 2 anos (RNF-018)", async () => {
    const tresAnos = new Date();
    tresAnos.setFullYear(tresAnos.getFullYear() - 3);

    const elegivel = await criarSolicitacaoComPii({
      situacao: "rejeitada",
      criadoEm: tresAnos,
      atualizadoEm: tresAnos,
    });

    const recente = await criarSolicitacaoComPii({
      situacao: "rejeitada",
      criadoEm: new Date(),
      atualizadoEm: new Date(),
    });

    const emAndamento = await criarSolicitacaoComPii({
      situacao: "em_analise",
      criadoEm: tresAnos,
      atualizadoEm: tresAnos,
    });

    const incompleta = await criarSolicitacaoComPii({
      situacao: "incompleta",
      criadoEm: tresAnos,
      atualizadoEm: tresAnos,
    });

    const resultado = await cronAnonimizacaoAutomatica();

    expect(resultado.anonimizados).toBe(1);
    expect(resultado.erros).toEqual([]);

    const buscar = async (id: string) => {
      const [linha] = await db
        .select({ anonimizadoEm: solicitante.anonimizadoEm })
        .from(solicitante)
        .where(eq(solicitante.id, id));
      return linha?.anonimizadoEm ?? null;
    };

    expect(await buscar(elegivel.solicitante.id)).toBeInstanceOf(Date);
    expect(await buscar(recente.solicitante.id)).toBeNull();
    expect(await buscar(emAndamento.solicitante.id)).toBeNull();
    expect(await buscar(incompleta.solicitante.id)).toBeNull();
  });

  it("não expurga solicitante sem nenhuma solicitação", async () => {
    const [orfao] = await db
      .insert(solicitante)
      .values({
        nome: "Sem Pedido",
        email: "sem@exemplo.com",
        telefone: "5433334444",
      })
      .returning();

    const resultado = await cronAnonimizacaoAutomatica();

    expect(resultado.anonimizados).toBe(0);
    const [depois] = await db
      .select({ anonimizadoEm: solicitante.anonimizadoEm })
      .from(solicitante)
      .where(eq(solicitante.id, orfao!.id));
    expect(depois?.anonimizadoEm).toBeNull();
  });
});
