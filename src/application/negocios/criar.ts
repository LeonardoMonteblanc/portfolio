// src/application/negocios/criar.ts
"use server";

import { z } from "zod";
import { db } from "@/infrastructure/db/client";
import {
  negocio,
  contato,
  localizacao,
  horarioFuncionamento,
  negocioCategoria,
} from "@/infrastructure/db/schema";
import { eq } from "drizzle-orm";
import { gerarSlugUnico } from "@/domain/utils/gerar-slug-unico";
import { normalizarSlug } from "@/domain/utils/normalizar-slug";
import { logNegocio } from "@/infrastructure/db/schema/logs";

const criarNegocioSchema = z.object({
  nome: z.string().min(1).max(150),
  descricao: z.string().min(1),
  contatos: z
    .array(
      z.object({
        tipo: z.enum(["whatsapp", "telefone", "instagram", "email", "outro"]),
        valor: z.string().min(1),
        ordem: z.number().default(0),
        valido: z.boolean().default(true),
      }),
    )
    .min(1),
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
  categoriasIds: z.array(z.string().uuid()).min(1),
});

export async function criarNegocioAction(
  prevState: unknown,
  formData: FormData,
) {
  // Parse contatos array
  const contatosRaw = formData.getAll("contatos");
  const contatos = contatosRaw.map((c) => JSON.parse(c as string));

  const localizacaoRaw = formData.get("localizacao");
  const localizacao = localizacaoRaw
    ? JSON.parse(localizacaoRaw as string)
    : undefined;

  const horariosRaw = formData.getAll("horarios");
  const horarios = horariosRaw.map((h) => JSON.parse(h as string));

  const categoriasIdsRaw = formData.getAll("categoriasIds");
  const categoriasIds = categoriasIdsRaw.map((id) => id as string);

  const rawData = {
    nome: formData.get("nome"),
    descricao: formData.get("descricao"),
    contatos,
    localizacao,
    horarios,
    categoriasIds,
  };

  const parseResult = criarNegocioSchema.safeParse(rawData);
  if (!parseResult.success) {
    const errorMsg = Object.values(parseResult.error.flatten().fieldErrors)
      .flat()
      .join(", ");
    return { error: "Dados inválidos: " + (errorMsg || "Dados inválidos") };
  }

  const {
    nome,
    descricao,
    contatos: contatosValidos,
    localizacao: loc,
    horarios: hrs,
    categoriasIds: catIds,
  } = parseResult.data;

  // Detectar duplicata por nome normalizado
  const baseSlug = normalizarSlug(nome);
  const slugsExistentes = new Set(
    (await db.query.negocio.findMany({ columns: { slug: true } })).map(
      (n) => n.slug,
    ),
  );
  const slug = gerarSlugUnico(baseSlug, slugsExistentes);

  // Verificar duplicata de nome (normalizado)
  const nomeNormalizado = nome
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const existente = await db.query.negocio.findFirst({
    where: (n, { eq, sql }) =>
      sql`lower(unaccent(${n.nome})) = ${nomeNormalizado}`,
  });

  if (existente) {
    // Alerta mas não bloqueia (nível B)
    console.warn(
      `Possível duplicata detectada: ${existente.nome} (ID: ${existente.id})`,
    );
  }

  // Criar negócio em transação
  const resultado = await db.transaction(async (tx) => {
    const insertResult = await tx
      .insert(negocio)
      .values({
        slug,
        nome: nome.trim(),
        descricao: descricao.trim(),
        situacaoPublicacao: "nao_elegivel",
        criadoEm: new Date(),
        atualizadoEm: new Date(),
      })
      .returning();

    const novoNegocio = insertResult[0];
    if (!novoNegocio) throw new Error("Falha ao criar negócio");

    // Inserir contatos
    if (contatosValidos.length > 0) {
      await tx.insert(contato).values(
        contatosValidos.map((c, i) => ({
          negocioId: novoNegocio.id,
          tipo: c.tipo,
          valor: c.valor,
          ordem: c.ordem ?? i,
          valido: c.valido ?? true,
        })),
      );
    }

    // Inserir localização se fornecida
    if (loc && (loc.endereco || loc.bairro || loc.areaAtendimento)) {
      await tx.insert(localizacao).values({
        negocioId: novoNegocio.id,
        endereco: loc.endereco?.trim() || null,
        bairro: loc.bairro?.trim() || null,
        areaAtendimento: loc.areaAtendimento?.trim() || null,
      });
    }

    // Inserir horários se fornecidos
    if (hrs && hrs.length > 0) {
      await tx.insert(horarioFuncionamento).values(
        hrs.map((h) => ({
          negocioId: novoNegocio.id,
          diaSemana: h.diaSemana,
          horaAbertura: h.horaAbertura,
          horaFechamento: h.horaFechamento,
          observacao: h.observacao?.trim() || null,
        })),
      );
    }

    // Associar categorias
    if (catIds.length > 0) {
      await tx.insert(negocioCategoria).values(
        catIds.map((catId) => ({
          negocioId: novoNegocio.id,
          categoriaId: catId,
        })),
      );
    }

    // Log de auditoria
    await tx.insert(logNegocio).values({
      atorTipo: "admin",
      negocioId: novoNegocio.id,
      acao: "criar",
      snapshotDepois: JSON.stringify(novoNegocio),
    });

    return novoNegocio;
  });

  return { success: true, negocio: resultado };
}
