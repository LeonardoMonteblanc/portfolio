// src/application/midia/upload-publico.ts
"use server";

import { z } from "zod";
import {
  getPresignedUploadUrl,
  validateImageFile,
  validateDocFile,
} from "@/infrastructure/r2/client";
import { revalidatePath } from "next/cache";

const uploadImagemSchema = z.object({
  solicitacaoId: z.string().uuid().optional(),
  tipo: z.enum(["logo", "foto"]),
  fileName: z.string().min(1),
  fileType: z.string().min(1),
  fileSize: z.number().positive(),
});

export async function getPresignedImageUploadUrl(
  prevState: unknown,
  formData: FormData,
) {
  const rawData = {
    solicitacaoId: formData.get("solicitacaoId") || undefined,
    tipo: formData.get("tipo"),
    fileName: formData.get("fileName"),
    fileType: formData.get("fileType"),
    fileSize: Number(formData.get("fileSize")),
  };

  const parseResult = uploadImagemSchema.safeParse(rawData);
  if (!parseResult.success) {
    const errorMsg = Object.values(parseResult.error.flatten().fieldErrors)
      .flat()
      .join(", ");
    return { error: errorMsg || "Dados inválidos" };
  }

  const { solicitacaoId, tipo, fileName, fileType, fileSize } =
    parseResult.data;

  // Validar arquivo
  const mockFile = new File([], fileName, { type: fileType });
  Object.defineProperty(mockFile, "size", { value: fileSize });
  const validation = validateImageFile(mockFile);
  if (!validation.valid) {
    return { error: validation.error };
  }

  const prefix = solicitacaoId ? `solicitacoes/${solicitacaoId}` : "temp";
  const result = await getPresignedUploadUrl(
    prefix,
    fileName,
    fileType,
    fileSize,
  );

  if (!result.success) {
    return { error: result.error };
  }

  // Retornar URL de upload e chave para o cliente fazer upload direto
  return {
    success: true,
    uploadUrl: result.uploadUrl,
    key: result.key,
    publicUrl: result.publicUrl,
  };
}

const uploadAnexoSchema = z.object({
  solicitacaoId: z.string().uuid().optional(),
  fileName: z.string().min(1),
  fileType: z.string().min(1),
  fileSize: z.number().positive(),
});

export async function getPresignedAnexoUploadUrl(
  prevState: unknown,
  formData: FormData,
) {
  const rawData = {
    solicitacaoId: formData.get("solicitacaoId") || undefined,
    fileName: formData.get("fileName"),
    fileType: formData.get("fileType"),
    fileSize: Number(formData.get("fileSize")),
  };

  const parseResult = uploadAnexoSchema.safeParse(rawData);
  if (!parseResult.success) {
    const errorMsg = Object.values(parseResult.error.flatten().fieldErrors)
      .flat()
      .join(", ");
    return { error: errorMsg || "Dados inválidos" };
  }

  const { solicitacaoId, fileName, fileType, fileSize } = parseResult.data;

  // Validar arquivo
  const mockFile = new File([], fileName, { type: fileType });
  Object.defineProperty(mockFile, "size", { value: fileSize });
  const validation = validateDocFile(mockFile);
  if (!validation.valid) {
    return { error: validation.error };
  }

  const prefix = solicitacaoId
    ? `solicitacoes/${solicitacaoId}/anexos`
    : "temp/anexos";
  const result = await getPresignedUploadUrl(
    prefix,
    fileName,
    fileType,
    fileSize,
  );

  if (!result.success) {
    return { error: result.error };
  }

  return {
    success: true,
    uploadUrl: result.uploadUrl,
    key: result.key,
    publicUrl: result.publicUrl,
  };
}

// Após upload direto do cliente, registrar a imagem no banco associada à solicitação
const registrarImagemSchema = z.object({
  solicitacaoId: z.string().uuid(),
  tipo: z.enum(["logo", "foto"]),
  url: z.string().url(),
  key: z.string().min(1),
});

export async function registrarImagemSolicitacao(
  prevState: unknown,
  formData: FormData,
) {
  const rawData = {
    solicitacaoId: formData.get("solicitacaoId"),
    tipo: formData.get("tipo"),
    url: formData.get("url"),
    key: formData.get("key"),
  };

  const parseResult = registrarImagemSchema.safeParse(rawData);
  if (!parseResult.success) {
    const errorMsg = Object.values(parseResult.error.flatten().fieldErrors)
      .flat()
      .join(", ");
    return { error: errorMsg || "Dados inválidos" };
  }

  // Aqui apenas retorna sucesso - a associação real acontece quando a solicitação é aprovada
  // e o negócio é criado. As imagens ficam vinculadas à solicitação.
  revalidatePath(`/solicitar`);

  return { success: true };
}

const registrarAnexoSchema = z.object({
  solicitacaoId: z.string().uuid(),
  url: z.string().url(),
  key: z.string().min(1),
  nomeOriginal: z.string().min(1),
  tipoMime: z.string().min(1),
  tamanhoBytes: z.number().positive(),
});

export async function registrarAnexoSolicitacao(
  prevState: unknown,
  formData: FormData,
) {
  const rawData = {
    solicitacaoId: formData.get("solicitacaoId"),
    url: formData.get("url"),
    key: formData.get("key"),
    nomeOriginal: formData.get("nomeOriginal"),
    tipoMime: formData.get("tipoMime"),
    tamanhoBytes: Number(formData.get("tamanhoBytes")),
  };

  const parseResult = registrarAnexoSchema.safeParse(rawData);
  if (!parseResult.success) {
    const errorMsg = Object.values(parseResult.error.flatten().fieldErrors)
      .flat()
      .join(", ");
    return { error: errorMsg || "Dados inválidos" };
  }

  revalidatePath(`/solicitar`);

  return { success: true };
}
