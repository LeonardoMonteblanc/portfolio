// src/app/api/admin/imagens/[id]/moderar/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import { db } from "@/infrastructure/db/client";
import {
  imagem,
  anexo,
  logImagem,
  logAnexo,
  logAuditoria,
} from "@/infrastructure/db/schema";
import { eq } from "drizzle-orm";
import { appendLog } from "@/infrastructure/audit/audit.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await getAdmin();

    if (!admin?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { acao, justificativa, tipo } = body; // tipo: 'imagem' | 'anexo'

    if (!acao || !["aprovar", "rejeitar", "promover"].includes(acao)) {
      return NextResponse.json(
        { error: "Ação inválida. Use: aprovar, rejeitar, promover" },
        { status: 400 },
      );
    }

    if (!tipo || !["imagem", "anexo"].includes(tipo)) {
      return NextResponse.json(
        { error: "Tipo inválido. Use: imagem ou anexo" },
        { status: 400 },
      );
    }

    if (acao === "rejeitar" && !justificativa) {
      return NextResponse.json(
        { error: "Justificativa é obrigatória para rejeição" },
        { status: 400 },
      );
    }

    const ipOrigem =
      request.headers.get("x-forwarded-for") ??
      request.headers.get("x-real-ip") ??
      "unknown";
    const userAgent = request.headers.get("user-agent") ?? "unknown";

    if (tipo === "imagem") {
      const imgRow = await db
        .select()
        .from(imagem)
        .where(eq(imagem.id, id))
        .limit(1);

      if (!imgRow.length) {
        return NextResponse.json(
          { error: "Imagem não encontrada" },
          { status: 404 },
        );
      }

      const img = imgRow[0]!;

      if (acao === "aprovar") {
        await db
          .update(imagem)
          .set({ situacao: "aprovada" })
          .where(eq(imagem.id, id));

        await db.insert(logImagem).values({
          atorTipo: "admin",
          atorId: admin.id,
          ipOrigem,
          userAgent,
          imagemId: id,
          acao: "aprovar",
          situacaoAnterior: img.situacao,
          situacaoNova: "aprovada",
        });

        await appendLog({
          atorTipo: "admin",
          atorId: admin.id,
          ipOrigem,
          userAgent,
          acao: "aprovar_imagem",
          entidadeTipo: "imagem",
          entidadeId: id,
          detalhes: {
            imagemId: id,
            situacaoAnterior: img.situacao,
            situacaoNova: "aprovada",
          },
        });

        return NextResponse.json({ success: true, situacao: "aprovada" });
      }

      if (acao === "rejeitar") {
        await db
          .update(imagem)
          .set({ situacao: "rejeitada", justificativaRejeicao: justificativa })
          .where(eq(imagem.id, id));

        await db.insert(logImagem).values({
          atorTipo: "admin",
          atorId: admin.id,
          ipOrigem,
          userAgent,
          imagemId: id,
          acao: "rejeitar",
          situacaoAnterior: img.situacao,
          situacaoNova: "rejeitada",
          justificativa,
        });

        await appendLog({
          atorTipo: "admin",
          atorId: admin.id,
          ipOrigem,
          userAgent,
          acao: "rejeitar_imagem",
          entidadeTipo: "imagem",
          entidadeId: id,
          detalhes: {
            imagemId: id,
            situacaoAnterior: img.situacao,
            situacaoNova: "rejeitada",
            justificativa,
          },
        });

        return NextResponse.json({ success: true, situacao: "rejeitada" });
      }
    }

    if (tipo === "anexo") {
      const anexoRow = await db
        .select()
        .from(anexo)
        .where(eq(anexo.id, id))
        .limit(1);

      if (!anexoRow.length) {
        return NextResponse.json(
          { error: "Anexo não encontrado" },
          { status: 404 },
        );
      }

      const ax = anexoRow[0]!;

      if (acao === "aprovar") {
        await db
          .update(anexo)
          .set({ situacao: "disponivel" })
          .where(eq(anexo.id, id));

        await db.insert(logAnexo).values({
          atorTipo: "admin",
          atorId: admin.id,
          ipOrigem,
          userAgent,
          anexoId: id,
          acao: "disponibilizar",
          situacaoAnterior: ax.situacao,
          situacaoNova: "disponivel",
        });

        await appendLog({
          atorTipo: "admin",
          atorId: admin.id,
          ipOrigem,
          userAgent,
          acao: "aprovar_anexo",
          entidadeTipo: "anexo",
          entidadeId: id,
          detalhes: {
            anexoId: id,
            situacaoAnterior: ax.situacao,
            situacaoNova: "disponivel",
          },
        });

        return NextResponse.json({ success: true, situacao: "disponivel" });
      }

      if (acao === "rejeitar") {
        await db
          .update(anexo)
          .set({ situacao: "rejeitado" })
          .where(eq(anexo.id, id));

        await db.insert(logAnexo).values({
          atorTipo: "admin",
          atorId: admin.id,
          ipOrigem,
          userAgent,
          anexoId: id,
          acao: "rejeitar",
          situacaoAnterior: ax.situacao,
          situacaoNova: "rejeitado",
        });

        await appendLog({
          atorTipo: "admin",
          atorId: admin.id,
          ipOrigem,
          userAgent,
          acao: "rejeitar_anexo",
          entidadeTipo: "anexo",
          entidadeId: id,
          detalhes: {
            anexoId: id,
            situacaoAnterior: ax.situacao,
            situacaoNova: "rejeitado",
            justificativa,
          },
        });

        return NextResponse.json({ success: true, situacao: "rejeitado" });
      }

      if (acao === "promover") {
        const [novaImagem] = await db
          .insert(imagem)
          .values({
            negocioId: ax.solicitacaoId,
            solicitacaoId: ax.solicitacaoId,
            anexoOrigemId: ax.id,
            tipo: "foto",
            situacao: "pendente",
            url: ax.arquivoUrl,
          })
          .returning();

        await db
          .update(anexo)
          .set({ situacao: "promovido" })
          .where(eq(anexo.id, id));

        await db.insert(logAnexo).values({
          atorTipo: "admin",
          atorId: admin.id,
          ipOrigem,
          userAgent,
          anexoId: id,
          acao: "promover_a_imagem",
          situacaoAnterior: ax.situacao,
          situacaoNova: "promovido",
        });

        await db.insert(logImagem).values({
          atorTipo: "admin",
          atorId: admin.id,
          ipOrigem,
          userAgent,
          imagemId: novaImagem!.id,
          acao: "criar_via_promocao",
          situacaoAnterior: "novo",
          situacaoNova: "pendente",
        });

        await appendLog({
          atorTipo: "admin",
          atorId: admin.id,
          ipOrigem,
          userAgent,
          acao: "promover_anexo",
          entidadeTipo: "anexo",
          entidadeId: id,
          detalhes: { anexoId: id, novaImagemId: novaImagem!.id },
        });

        return NextResponse.json({
          success: true,
          novaImagemId: novaImagem!.id,
        });
      }
    }

    return NextResponse.json(
      { error: "Ação não implementada" },
      { status: 400 },
    );
  } catch (error: any) {
    console.error("[Moderar Mídia] Erro:", error);
    return NextResponse.json(
      { error: error.message ?? "Erro interno" },
      { status: 500 },
    );
  }
}
