// src/application/negocios/editar.ts
"use server";

import { z } from "zod";
import { db } from "@/infrastructure/db/client";
import {
  negocio,
  contato,
  localizacao,
  horarioFuncionamento,
  negocioCategoria,
  categoria,
} from "@/infrastructure/db/schema";
import { eq, and } from "drizzle-orm";
import { logNegocio } from "@/infrastructure/db/schema/logs";

const editarNegocioSchema = z.object({
  id: z.string().uuid(),
  nome: z.string().min(1).max(150).optional(),
  descricao: z.string().min(1).optional(),
  contatos: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        tipo: z.enum(["whatsapp", "telefone", "instagram", "email", "outro"]),
        valor: z.string().min(1),
        ordem: z.number().default(0),
        valido: z.boolean().default(true),
      }),
    )
    .optional(),
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
        id: z.string().uuid().optional(),
        diaSemana: z.number().min(0).max(6),
        horaAbertura: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
        horaFechamento: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
        observacao: z.string().max(100).optional(),
      }),
    )
    .optional(),
  categoriasIds: z.array(z.string().uuid()).optional(),
});

export async function editarNegocioAction(
  prevState: unknown,
  formData: FormData,
) {
  const rawData = {
    id: formData.get("id"),
    nome: formData.get("nome") || undefined,
    descricao: formData.get("descricao") || undefined,
    contatos: formData.get("contatos")
      ? JSON.parse(formData.get("contatos") as string)
      : undefined,
    localizacao: formData.get("localizacao")
      ? JSON.parse(formData.get("localizacao") as string)
      : undefined,
    horarios: formData.get("horarios")
      ? JSON.parse(formData.get("horarios") as string)
      : undefined,
    categoriasIds:
      formData.getAll("categoriasIds").length > 0
        ? formData.getAll("categoriasIds").map((id) => id as string)
        : undefined,
  };

  const parseResult = editarNegocioSchema.safeParse(rawData);
  if (!parseResult.success) {
    const errorMsg = Object.values(parseResult.error.flatten().fieldErrors)
      .flat()
      .join(", ");
    return { error: "Dados inválidos: " + (errorMsg || "Dados inválidos") };
  }

  const { id, ...dados } = parseResult.data;

  const atual = await db.query.negocio.findFirst({
    where: (n, { eq }) => eq(n.id, id),
  });
  if (!atual) {
    return { error: "Negócio não encontrado." };
  }

  const snapshotAntes = { ...atual };

  // Atualizar campos básicos
  if (dados.nome) {
    await db
      .update(negocio)
      .set({ nome: dados.nome.trim() })
      .where(eq(negocio.id, id));
  }
  if (dados.descricao) {
    await db
      .update(negocio)
      .set({ descricao: dados.descricao.trim() })
      .where(eq(negocio.id, id));
  }

  // Atualizar contatos (substituir todos)
  if (dados.contatos) {
    await db.delete(contato).where(eq(contato.negocioId, id));
    if (dados.contatos.length > 0) {
      await db.insert(contato).values(
        dados.contatos.map((c, i) => ({
          negocioId: id,
          tipo: c.tipo,
          valor: c.valor,
          ordem: c.ordem ?? i,
          valido: c.valido ?? true,
        })),
      );
    }
  }

  // Atualizar localização
  if (dados.localizacao) {
    const existe = await db.query.localizacao.findFirst({
      where: (l, { eq }) => eq(l.negocioId, id),
    });
    if (existe) {
      await db
        .update(localizacao)
        .set({
          endereco: dados.localizacao.endereco?.trim() || null,
          bairro: dados.localizacao.bairro?.trim() || null,
          areaAtendimento: dados.localizacao.areaAtendimento?.trim() || null,
        })
        .where(eq(localizacao.negocioId, id));
    } else if (
      dados.localizacao.endereco ||
      dados.localizacao.bairro ||
      dados.localizacao.areaAtendimento
    ) {
      await db.insert(localizacao).values({
        negocioId: id,
        endereco: dados.localizacao.endereco?.trim() || null,
        bairro: dados.localizacao.bairro?.trim() || null,
        areaAtendimento: dados.localizacao.areaAtendimento?.trim() || null,
      });
    }
  }

  // Atualizar horários
  if (dados.horarios) {
    await db
      .delete(horarioFuncionamento)
      .where(eq(horarioFuncionamento.negocioId, id));
    if (dados.horarios.length > 0) {
      await db.insert(horarioFuncionamento).values(
        dados.horarios.map((h) => ({
          negocioId: id,
          diaSemana: h.diaSemana,
          horaAbertura: h.horaAbertura,
          horaFechamento: h.horaFechamento,
          observacao: h.observacao?.trim() || null,
        })),
      );
    }
  }

  // Atualizar categorias
  if (dados.categoriasIds) {
    await db.delete(negocioCategoria).where(eq(negocioCategoria.negocioId, id));
    if (dados.categoriasIds.length > 0) {
      await db.insert(negocioCategoria).values(
        dados.categoriasIds.map((catId) => ({
          negocioId: id,
          categoriaId: catId,
        })),
      );
    }
  }

  const atualizado = await db.query.negocio.findFirst({
    where: (n, { eq }) => eq(n.id, id),
  });

  // Verificar se edição tornou inelegível
  const contatosValidos = await db
    .select()
    .from(contato)
    .where(and(eq(contato.negocioId, id), eq(contato.valido, true)));
  const categoriasAtivas = await db
    .select({ categoria: { ativa: categoria.ativa } })
    .from(negocioCategoria)
    .innerJoin(categoria, eq(negocioCategoria.categoriaId, categoria.id))
    .where(eq(negocioCategoria.negocioId, id));

  const elegivel =
    atualizado &&
    atualizado.nome &&
    atualizado.descricao &&
    contatosValidos.length > 0 &&
    categoriasAtivas.some((c): boolean => c.categoria.ativa);

  if (!elegivel && atual.situacaoPublicacao === "publicado") {
    await db
      .update(negocio)
      .set({
        situacaoPublicacao: "nao_elegivel",
        motivoNaoElegivel: "dados_incompletos",
      })
      .where(eq(negocio.id, id));
  }

  const final = await db.query.negocio.findFirst({
    where: (n, { eq }) => eq(n.id, id),
  });

  // Log de auditoria
  await db.insert(logNegocio).values({
    atorTipo: "admin",
    negocioId: id,
    acao: "editar",
    snapshotAntes: JSON.stringify(snapshotAntes),
    snapshotDepois: JSON.stringify(final),
  });

  return { success: true, negocio: final };
}
