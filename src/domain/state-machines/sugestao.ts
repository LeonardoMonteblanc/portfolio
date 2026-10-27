// src/domain/state-machines/sugestao.ts
import type { SituacaoSugestao } from "@/domain/enums";
import {
  ErroTransicaoInvalida,
  JustificativaObrigatoria,
} from "@/domain/errors";

export type EventoSugestao =
  "REGISTRAR_SUGESTAO" | "ACEITAR_SUGESTAO" | "REJEITAR_SUGESTAO";

export interface ContextoSugestao {
  justificativa?: string;
  adminId?: string;
}

/**
 * ME-08 — Sugestão de categoria
 *
 * Estados: pendente, aceita, rejeitada
 * Transições: 3
 *
 * Ver docs/01-dominio/04-maquinas-estado.md § ME-08
 */
export function transicionarSugestao(
  estadoAtual: SituacaoSugestao | null,
  evento: EventoSugestao,
  contexto: ContextoSugestao = {},
): SituacaoSugestao {
  const chave = `${estadoAtual ?? "INICIAL"}:${evento}`;

  switch (chave) {
    case "INICIAL:REGISTRAR_SUGESTAO":
      return "pendente";

    case "pendente:ACEITAR_SUGESTAO":
      if (!contexto.adminId) {
        throw new ErroTransicaoInvalida(
          "pendente",
          "ACEITAR_SUGESTAO (sem admin)",
        );
      }
      return "aceita";

    case "pendente:REJEITAR_SUGESTAO":
      if (!contexto.justificativa?.trim()) {
        throw new JustificativaObrigatoria();
      }
      return "rejeitada";

    default:
      throw new ErroTransicaoInvalida(estadoAtual ?? "INICIAL", evento);
  }
}
