// src/infrastructure/auth/hash.ts
import { hash, verify } from "@node-rs/argon2";

const OPCOES_ARGON2 = {
  memoryCost: 19456, // 19 MiB
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
};

export async function hashSenha(senha: string): Promise<string> {
  return hash(senha, OPCOES_ARGON2);
}

export async function verificarSenha(
  senha: string,
  hashArmazenado: string,
): Promise<boolean> {
  return verify(hashArmazenado, senha);
}
