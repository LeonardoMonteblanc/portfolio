// src/app/api/media/confirmar/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import { db } from "@/infrastructure/db/client";
import { anexo, imagem } from "@/infrastructure/db/schema";
import { enfileirarJob } from "@/infrastructure/queue/queue.service";
import { eq, sql } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdmin();

    if (!admin?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const {
      tipo,
      key,
      publicUrl,
      mimeType,
      tamanhoBytes,
      nomeOriginal,
      solicitacaoId,
      negocioId,
      anexoId,
    } = body;

    if (!tipo || !key || !publicUrl || !mimeType) {
      return NextResponse.json(
        { error: "tipo, key, publicUrl e mimeType são obrigatórios" },
        { status: 400 },
      );
    }

    if (tipo === "anexo") {
      if (!solicitacaoId) {
        return NextResponse.json(
          { error: "solicitacaoId é obrigatório para anexo" },
          { status: 400 },
        );
      }

      const [novoAnexo] = await db
        .insert(anexo)
        .values({
          solicitacaoId,
          arquivoUrl: publicUrl,
          nomeOriginal: nomeOriginal || "arquivo",
          mimeType,
          tamanhoBytes: tamanhoBytes || 0,
          situacao: "recebido",
        })
        .returning();

      await enfileirarJob({
        tipo: "processar_anexo",
        anexoId: novoAnexo!.id,
      });

      return NextResponse.json({
        success: true,
        anexo: novoAnexo,
      });
    }

    if (tipo === "imagem") {
      if (!negocioId && !solicitacaoId) {
        return NextResponse.json(
          { error: "negocioId ou solicitacaoId é obrigatório para imagem" },
          { status: 400 },
        );
      }

      let tipoImagem: "logo" | "foto" = "foto";
      if (negocioId) {
        const count = await db
          .select({ count: sql`count(*)` })
          .from(imagem)
          .where(eq(imagem.negocioId, negocioId));
        if (Number(count[0]?.count ?? 0) === 0) {
          tipoImagem = "logo";
        }
      }

      const [novaImagem] = await db
        .insert(imagem)
        .values({
          negocioId: negocioId || null,
          solicitacaoId: solicitacaoId || null,
          anexoOrigemId: anexoId || null,
          tipo: tipoImagem,
          situacao: "pendente",
          url: publicUrl,
        })
        .returning();

      await enfileirarJob({
        tipo: "processar_imagem",
        imagemId: novaImagem!.id,
      });

      return NextResponse.json({
        success: true,
        imagem: novaImagem,
      });
    }

    return NextResponse.json(
      { error: "Tipo inválido. Use 'imagem' ou 'anexo'" },
      { status: 400 },
    );
  } catch (error: any) {
    console.error("[Confirmar Upload] Erro:", error);
    return NextResponse.json(
      { error: error.message ?? "Erro interno" },
      { status: 500 },
    );
  }
}
