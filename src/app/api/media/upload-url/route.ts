// src/app/api/media/upload-url/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import {
  gerarUrlUploadAssinada,
  gerarChaveArmazenamento,
  extensaoDoMimeType,
  validarMimeType,
  validarTamanho,
} from "@/infrastructure/media/media.service";

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdmin();

    if (!admin?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const { tipo, mimeType, tamanhoBytes, nomeOriginal } = body;

    if (!tipo || !mimeType || !tamanhoBytes) {
      return NextResponse.json(
        { error: "tipo, mimeType e tamanhoBytes são obrigatórios" },
        { status: 400 },
      );
    }

    if (!validarMimeType(mimeType, tipo)) {
      return NextResponse.json(
        { error: `MIME type ${mimeType} não permitido para ${tipo}` },
        { status: 400 },
      );
    }

    if (!validarTamanho(tamanhoBytes, tipo)) {
      const limite = tipo === "imagem" ? "5MB" : "10MB";
      return NextResponse.json(
        { error: `Arquivo excede limite de ${limite} para ${tipo}` },
        { status: 400 },
      );
    }

    const extensao = extensaoDoMimeType(mimeType);
    const prefixo = tipo === "imagem" ? "imagens" : "anexos";
    const key = gerarChaveArmazenamento(
      prefixo as "imagens" | "anexos",
      extensao,
    );

    const { uploadUrl, publicUrl } = await gerarUrlUploadAssinada(
      key,
      mimeType,
    );

    return NextResponse.json({
      uploadUrl,
      publicUrl,
      key,
      expiresIn: 3600,
    });
  } catch (error: any) {
    console.error("[Upload URL] Erro:", error);
    return NextResponse.json(
      { error: error.message ?? "Erro interno" },
      { status: 500 },
    );
  }
}
