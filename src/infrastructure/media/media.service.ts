// src/infrastructure/media/media.service.ts
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";

// Cliente R2 (S3-compatible)
const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME!;
const PUBLIC_URL = process.env.R2_PUBLIC_URL!;

/**
 * Gera URL assinada para upload direto do frontend
 */
export async function gerarUrlUploadAssinada(
  key: string,
  contentType: string,
  expiresIn = 3600, // 1 hora
): Promise<{ uploadUrl: string; publicUrl: string }> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn });
  const publicUrl = `${PUBLIC_URL}/${key}`;

  return { uploadUrl, publicUrl };
}

/**
 * Processa imagem com Sharp: comprime, redimensiona, converte para WebP
 */
export async function processarImagem(
  buffer: Buffer,
  opcoes: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    formato?: "webp" | "jpeg" | "png";
  } = {},
): Promise<{
  buffer: Buffer;
  mimeType: string;
  width: number;
  height: number;
}> {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 80,
    formato = "webp",
  } = opcoes;

  let pipeline = sharp(buffer)
    .rotate() // Auto-orient baseado em EXIF
    .resize(maxWidth, maxHeight, {
      fit: "inside",
      withoutEnlargement: true,
    });

  let mimeType: string;
  switch (formato) {
    case "webp":
      pipeline = pipeline.webp({ quality });
      mimeType = "image/webp";
      break;
    case "jpeg":
      pipeline = pipeline.jpeg({ quality });
      mimeType = "image/jpeg";
      break;
    case "png":
      pipeline = pipeline.png({ quality });
      mimeType = "image/png";
      break;
  }

  const processedBuffer = await pipeline.toBuffer();
  const metadata = await sharp(processedBuffer).metadata();

  return {
    buffer: processedBuffer,
    mimeType,
    width: metadata.width ?? 0,
    height: metadata.height ?? 0,
  };
}

/**
 * Gera thumbnail
 */
export async function gerarThumbnail(
  buffer: Buffer,
  size = 300,
): Promise<Buffer> {
  return sharp(buffer)
    .resize(size, size, { fit: "cover", position: "center" })
    .webp({ quality: 70 })
    .toBuffer();
}

/**
 * Faz upload do buffer processado para R2
 */
export async function uploadParaR2(
  key: string,
  buffer: Buffer,
  contentType: string,
): Promise<void> {
  await r2Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
}

/**
 * Gera chave única para armazenamento
 */
export function gerarChaveArmazenamento(
  prefixo: "imagens" | "anexos" | "thumbnails",
  extensao: string,
): string {
  const timestamp = Date.now();
  const uuid = uuidv4().slice(0, 8);
  return `${prefixo}/${timestamp}-${uuid}.${extensao}`;
}

/**
 * Extrai extensão do MIME type
 */
export function extensaoDoMimeType(mimeType: string): string {
  const mapa: Record<string, string> = {
    "image/webp": "webp",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      "docx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  };
  return mapa[mimeType] || "bin";
}

/**
 * Valida MIME type permitido
 */
export function validarMimeType(
  mimeType: string,
  tipo: "imagem" | "anexo",
): boolean {
  const permitidosImagem = [
    "image/webp",
    "image/jpeg",
    "image/png",
    "image/gif",
  ];
  const permitidosAnexo = [
    ...permitidosImagem,
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];

  if (tipo === "imagem") {
    return permitidosImagem.includes(mimeType);
  }
  return permitidosAnexo.includes(mimeType);
}

/**
 * Valida tamanho do arquivo
 */
export function validarTamanho(
  tamanhoBytes: number,
  tipo: "imagem" | "anexo",
): boolean {
  const limiteImagem = 5 * 1024 * 1024; // 5MB
  const limiteAnexo = 10 * 1024 * 1024; // 10MB

  if (tipo === "imagem") {
    return tamanhoBytes <= limiteImagem;
  }
  return tamanhoBytes <= limiteAnexo;
}
