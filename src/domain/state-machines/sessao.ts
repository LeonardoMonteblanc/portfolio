// src/domain/state-machines/sessao.ts
import { ErroTransicaoInvalida } from "@/domain/errors";

export type EstadoSessao = "ativa" | "encerrada" | "expirada" | "invalidada";

export type EventoSessao = "LOGIN" | "LOGOUT" | "EXPIRAR" | "INVALIDAR";

export interface ContextoSessao {
  adminId?: string;
  dataAtual?: Date;
  dataExpiracao?: Date;
}

/**
 * ME-07 — Sessão (conceitual)
 *
 * A implementação real usa JWT stateless com token_version (ADR-002).
 * Esta máquina serve como referência para testes unitários de domínio.
 *
 * Estados: ativa, encerrada, expirada, invalidada
 * Transições: 4
 *
 * Ver docs/01-dominio/04-maquinas-estado.md § ME-07
 */
export function transicionarSessao(
  estadoAtual: EstadoSessao | null,
  evento: EventoSessao,
  contexto: ContextoSessao = {},
): EstadoSessao {
  const chave = `${estadoAtual ?? "INICIAL"}:${evento}`;

  switch (chave) {
    case "INICIAL:LOGIN":
      if (!contexto.adminId) {
        throw new ErroTransicaoInvalida("INICIAL", "LOGIN (sem adminId)");
      }
      return "ativa";

    case "ativa:LOGOUT":
      return "encerrada";

    case "ativa:EXPIRAR":
      if (!contexto.dataAtual || !contexto.dataExpiracao) {
        throw new ErroTransicaoInvalida("ativa", "EXPIRAR (sem datas)");
      }
      return contexto.dataAtual >= contexto.dataExpiracao
        ? "expirada"
        : "ativa";

    case "ativa:INVALIDAR":
      return "invalidada";

    default:
      throw new ErroTransicaoInvalida(estadoAtual ?? "INICIAL", evento);
  }
}
