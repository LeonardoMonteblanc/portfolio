// src/application/solicitacoes/atualizar.ts
"use server";

import { z } from "zod";
import { db } from "@/infrastructure/db/client";
import {
  solicitante,
  solicitacao,
  sugestaoCategoria,
  aceiteTermo,
  documentoTermo,
  negocio,
  contato,
} from "@/infrastructure/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { normalizarTexto } from "@/domain/utils/normalizar-texto";
import {
  logSolicitacaoRecebida,
  logVinculacaoSolicitacao,
} from "@/infrastructure/db/schema/logs";

const atualizarSolicitacaoSchema = z.object({
  // Dados do solicitante
  nomeSolicitante: z.string().min(1).max(120),
  email: z.string().email(),
  telefone: z.string().min(10).max(20),
  // Dados do negócio
  nomeNegocio: z.string().min(1).max(150),
  descricao: z.string().min(1),
  contatos: z
    .array(
      z.object({
        tipo: z.enum(["whatsapp", "telefone", "instagram", "email", "outro"]),
        valor: z.string().min(1),
        ordem: z.number().default(0),
      }),
    )
    .min(1),
  categoriasIds: z.array(z.string().uuid()).optional(),
  sugestaoCategoria: z.string().max(150).optional(),
  localizacao: z
    .object({
      endereco: z.string().optional(),
      bairro: z.string().max(80).optional(),
      areaAtendimento: z.string().optional(),
    })
    .optional(),
  horarios: z
    .array(
      z.object({
        diaSemana: z.number().min(0).max(6),
        horaAbertura: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
        horaFechamento: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
        observacao: z.string().max(100).optional(),
      }),
    )
    .optional(),
  // Declaração e aceite
  declaracaoVinculo: z.string().min(1),
  aceiteTermos: z
    .boolean()
    .refine((v) => v === true, "É obrigatório aceitar os termos"),
});

export async function criarSolicitacaoAtualizacaoAction(
  prevState: unknown,
  formData: FormData,
) {
  const rawData = {
    nomeSolicitante: formData.get("nomeSolicitante"),
    email: formData.get("email"),
    telefone: formData.get("telefone"),
    nomeNegocio: formData.get("nomeNegocio"),
    descricao: formData.get("descricao"),
    contatos: formData.get("contatos")
      ? JSON.parse(formData.get("contatos") as string)
      : [],
    categoriasIds:
      formData.getAll("categoriasIds").length > 0
        ? formData.getAll("categoriasIds").map((id) => id as string)
        : undefined,
    sugestaoCategoria: formData.get("sugestaoCategoria") || undefined,
    localizacao: formData.get("localizacao")
      ? JSON.parse(formData.get("localizacao") as string)
      : undefined,
    horarios: formData.get("horarios")
      ? JSON.parse(formData.get("horarios") as string)
      : undefined,
    declaracaoVinculo: formData.get("declaracaoVinculo"),
    aceiteTermos: formData.get("aceiteTermos") === "true",
  };

  const parseResult = atualizarSolicitacaoSchema.safeParse(rawData);
  if (!parseResult.success) {
    const errorMsg = Object.values(parseResult.error.flatten().fieldErrors)
      .flat()
      .join(", ");
    return { error: errorMsg || "Dados inválidos" };
  }

  const data = parseResult.data;

  // Verificar duplicata (nível C - apenas alerta)
  const nomeNormalizado = data.nomeNegocio
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const [duplicataNome, duplicataContato] = await Promise.all([
    db.query.negocio.findFirst({
      where: (n, { sql }) =>
        sql`lower(unaccent(${negocio.nome})) = ${nomeNormalizado}`,
    }),
    db.query.contato.findFirst({
      where: (c, { sql }) =>
        sql`${contato.valor} ILIKE ${"%" + data.contatos[0]?.valor.replace(/\D/g, "") + "%"}`,
      with: { negocio: true },
    }),
  ]);

  const duplicataDetectada = !!duplicataNome || !!duplicataContato;

  // Buscar termos vigentes
  const termosVigentes = await Promise.all([
    db.query.documentoTermo.findFirst({
      where: (d, { eq }) => and(eq(d.tipo, "termos_uso"), eq(d.vigente, true)),
    }),
    db.query.documentoTermo.findFirst({
      where: (d, { eq }) =>
        and(eq(d.tipo, "politica_privacidade"), eq(d.vigente, true)),
    }),
    db.query.documentoTermo.findFirst({
      where: (d, { eq }) =>
        and(eq(d.tipo, "tratamento_dados"), eq(d.vigente, true)),
    }),
  ]);

  // Criar tudo em transação
  const resultado = await db.transaction(async (tx) => {
    // Criar solicitante
    const novoSolicitanteResult = await tx
      .insert(solicitante)
      .values({
        nome: data.nomeSolicitante.trim(),
        email: data.email.toLowerCase().trim(),
        telefone: data.telefone.trim(),
      })
      .returning();
    const novoSolicitante = novoSolicitanteResult[0];
    if (!novoSolicitante) throw new Error("Falha ao criar solicitante");

    // Preparar dados do negócio proposto (snapshot)
    const dadosNegocioProposto = {
      nome: data.nomeNegocio.trim(),
      descricao: data.descricao.trim(),
      contatos: data.contatos,
      localizacao: data.localizacao,
      horarios: data.horarios,
      categoriasIds: data.categoriasIds,
      sugestaoCategoria: data.sugestaoCategoria,
    };

    // Verificar se há negócio em oculto_contestacao para lógica de em_fila_contestacao
    let negocioEmContestacao = false;
    // Se o usuário informou um negócio existente, verificar se está em contestacao
    // Isso seria feito via parâmetro hidden no form ou lógica de negócio

    // Criar solicitação
    const novaSolicitacaoResult = await tx
      .insert(solicitacao)
      .values({
        solicitanteId: novoSolicitante.id,
        tipo: "atualizacao",
        situacao: negocioEmContestacao ? "em_fila_contestacao" : "recebida",
        declaracaoVinculo: data.declaracaoVinculo.trim(),
        dadosNegocioProposto,
        duplicataDetectada: false,
      })
      .returning();
    const novaSolicitacao = novaSolicitacaoResult[0];
    if (!novaSolicitacao) throw new Error("Falha ao criar solicitação");

    // Sugestão de categoria se fornecida
    if (data.sugestaoCategoria?.trim()) {
      await tx.insert(sugestaoCategoria).values({
        solicitacaoId: novaSolicitacao.id,
        textoSugerido: data.sugestaoCategoria.trim(),
        situacao: "pendente",
      });
    }

    // Aceites de termos
    for (const doc of termosVigentes) {
      if (doc) {
        await tx.insert(aceiteTermo).values({
          solicitanteId: novoSolicitante.id,
          documentoTermoId: doc.id,
        });
      }
    }

    // Log de auditoria
    await tx.insert(logSolicitacaoRecebida).values({
      atorTipo: "solicitante",
      solicitacaoId: novaSolicitacao.id,
      tipo: "inclusao",
    });

    return { solicitacao: novaSolicitacao, duplicataDetectada: false };
  });

  return {
    success: true,
    solicitacao: resultado.solicitacao,
    duplicataDetectada: resultado.duplicataDetectada,
  };
}
