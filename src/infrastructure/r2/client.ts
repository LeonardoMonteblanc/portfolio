// src/infrastructure/r2/client.ts
"use server";

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/shared/env";

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET = env.R2_BUCKET_NAME;
const PUBLIC_URL = env.R2_PUBLIC_URL;

export interface UploadResult {
  success: boolean;
  url?: string;
  key?: string;
  error?: string;
}

export interface PresignedUploadResult {
  success: boolean;
  uploadUrl?: string;
  key?: string;
  publicUrl?: string;
  error?: string;
}

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_DOC_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_DOC_SIZE = 10 * 1024 * 1024; // 10 MB

export function validateImageFile(file: File): {
  valid: boolean;
  error?: string;
} {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { valid: false, error: "Formato inválido. Use JPEG, PNG ou WebP." };
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return { valid: false, error: "Arquivo muito grande. Máximo 5 MB." };
  }
  return { valid: true };
}

export function validateDocFile(file: File): {
  valid: boolean;
  error?: string;
} {
  if (!ALLOWED_DOC_TYPES.includes(file.type)) {
    return { valid: false, error: "Formato inválido. Use PDF, DOC ou DOCX." };
  }
  if (file.size > MAX_DOC_SIZE) {
    return { valid: false, error: "Arquivo muito grande. Máximo 10 MB." };
  }
  return { valid: true };
}

function generateKey(prefix: string, fileName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  const ext = fileName.split(".").pop()?.toLowerCase() || "bin";
  return `${prefix}/${timestamp}-${random}.${ext}`;
}

export async function getPresignedUploadUrl(
  prefix: string,
  fileName: string,
  contentType: string,
  maxSize: number,
): Promise<PresignedUploadResult> {
  try {
    const key = generateKey(prefix, fileName);
    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
      ContentLength: maxSize,
    });

    const uploadUrl = await getSignedUrl(r2Client, command, {
      expiresIn: 3600,
    }); // 1 hour
    const publicUrl = PUBLIC_URL ? `${PUBLIC_URL}/${key}` : "";

    return {
      success: true,
      uploadUrl,
      key,
      publicUrl,
    };
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    return { success: false, error: "Falha ao gerar URL de upload" };
  }
}

export async function uploadFileDirect(
  key: string,
  body: Buffer | Uint8Array | ReadableStream,
  contentType: string,
): Promise<UploadResult> {
  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body as any,
      ContentType: contentType,
    });

    await r2Client.send(command);
    const publicUrl = PUBLIC_URL ? `${PUBLIC_URL}/${key}` : "";

    return { success: true, url: publicUrl, key };
  } catch (error) {
    console.error("Error uploading file:", error);
    return { success: false, error: "Falha ao fazer upload" };
  }
}

export async function deleteFile(
  key: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    });
    await r2Client.send(command);
    return { success: true };
  } catch (error) {
    console.error("Error deleting file:", error);
    return { success: false, error: "Falha ao excluir arquivo" };
  }
}

export async function getPresignedDownloadUrl(
  key: string,
  expiresIn = 3600,
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  return getSignedUrl(r2Client, command, { expiresIn });
}
