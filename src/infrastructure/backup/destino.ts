// src/infrastructure/backup/destino.ts
import { mkdir, readdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { env } from "@/shared/env";

/**
 * Destino do backup diário (F9-11 / RF-068).
 *
 * Existem dois destinos porque o mesmo código roda em lugares com filesystems
 * muito diferentes:
 *   - `r2`: produção (Vercel não tem disco e o /tmp some a cada execução);
 *   - `diretorio`: desenvolvimento, drill de restauração e o teste de integração.
 *
 * O backup NUNCA vai para o bucket público de imagens: os nomes de chave são
 * previsíveis (`backups/AAAA-MM-DD/...`), então qualquer pessoa com a URL
 * pública leria a base inteira. Por isso `R2_BACKUP_BUCKET` é uma variável
 * separada e a falta dela é erro, não fallback silencioso.
 */

export interface ArquivoBackup {
  /** Caminho relativo ao destino (ex.: `backups/2026-02-04/manifesto.json`). */
  chave: string;
  conteudo: Buffer;
  contentType: string;
}

export interface DestinoBackup {
  readonly nome: "r2" | "diretorio";
  readonly descricao: string;
  enviar(arquivo: ArquivoBackup): Promise<void>;
  /** Lê um arquivo do backup (usado no drill de restauração). */
  ler(chave: string): Promise<Buffer>;
  /** Chaves existentes sob um prefixo (usado pela retenção). */
  listar(prefixo: string): Promise<string[]>;
  remover(chaves: string[]): Promise<void>;
}

export class ErroDestinoBackup extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ErroDestinoBackup";
  }
}

/** Bucket privado do Cloudflare R2. */
export function destinoR2(
  bucket: string | undefined = env.R2_BACKUP_BUCKET,
): DestinoBackup {
  if (!bucket) {
    throw new ErroDestinoBackup(
      "R2_BACKUP_BUCKET não configurado: o backup não pode ir para o bucket público de imagens.",
    );
  }

  const cliente = new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });

  return {
    nome: "r2",
    descricao: `r2://${bucket}`,
    async enviar({ chave, conteudo, contentType }) {
      await cliente.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: chave,
          Body: conteudo,
          ContentType: contentType,
        }),
      );
    },
    async ler(chave) {
      const objeto = await cliente.send(
        new GetObjectCommand({ Bucket: bucket, Key: chave }),
      );
      const corpo = objeto.Body;
      if (!corpo) throw new ErroDestinoBackup(`Objeto vazio: ${chave}`);
      return Buffer.from(await corpo.transformToByteArray());
    },
    async listar(prefixo) {
      const chaves: string[] = [];
      let continuacao: string | undefined;

      do {
        const resposta = await cliente.send(
          new ListObjectsV2Command({
            Bucket: bucket,
            Prefix: prefixo,
            ContinuationToken: continuacao,
          }),
        );
        for (const objeto of resposta.Contents ?? []) {
          if (objeto.Key) chaves.push(objeto.Key);
        }
        continuacao = resposta.IsTruncated
          ? resposta.NextContinuationToken
          : undefined;
      } while (continuacao);

      return chaves;
    },
    async remover(chaves) {
      // A API apaga no máximo 1000 objetos por chamada.
      for (let i = 0; i < chaves.length; i += 1000) {
        await cliente.send(
          new DeleteObjectsCommand({
            Bucket: bucket,
            Delete: {
              Objects: chaves.slice(i, i + 1000).map((Key) => ({ Key })),
            },
          }),
        );
      }
    },
  };
}

/** Diretório local — dev, drill de restauração e testes. */
export function destinoDiretorio(raiz: string): DestinoBackup {
  // `resolve` (e não `join`) porque `--dir C:\\backups` precisa continuar absoluto.
  const absoluto = resolve(process.cwd(), raiz);

  return {
    nome: "diretorio",
    descricao: absoluto,
    async enviar({ chave, conteudo }) {
      const alvo = join(absoluto, chave);
      await mkdir(dirname(alvo), { recursive: true });
      await writeFile(alvo, conteudo);
    },
    async ler(chave) {
      return readFile(join(absoluto, chave));
    },
    async listar(prefixo) {
      const chaves: string[] = [];

      const percorrer = async (relativo: string): Promise<void> => {
        let entradas;
        try {
          entradas = await readdir(join(absoluto, relativo), {
            withFileTypes: true,
          });
        } catch {
          return; // diretório ainda não existe
        }
        for (const entrada of entradas) {
          const caminho = relativo
            ? `${relativo}/${entrada.name}`
            : entrada.name;
          if (entrada.isDirectory()) {
            await percorrer(caminho);
          } else if (caminho.startsWith(prefixo)) {
            chaves.push(caminho);
          }
        }
      };

      await percorrer("");
      return chaves;
    },
    async remover(chaves) {
      for (const chave of chaves) {
        try {
          await unlink(join(absoluto, chave));
        } catch {
          // já removido: retenção é idempotente
        }
      }
    },
  };
}
