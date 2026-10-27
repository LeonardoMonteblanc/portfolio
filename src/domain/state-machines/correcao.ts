// src/domain/state-machines/correcao.ts
import type { SituacaoCorrecao } from "@/domain/enums";
import { ErroTransicaoInvalida } from "@/domain/errors";

export type EventoCorrecao =
  "SOLICITAR_CORRECAO" | "RECEBER_RESPOSTA" | "EXPIRAR_PRAZO";

export interface ContextoCorrecao {
  dataSolicitacao: Date;
  dataResposta?: Date;
  prazoDias?: number; // default 7
}

/**
 * ME-04 — Correção de dados
 *
 * Estados: aguardando_resposta, recebida, incompleta
 * Transições: 4
 *
 * Regras:
 * - Prazo: 7 dias corridos (configurável)
 * - Cálculo usa fuso America/Sao_Paulo
 * - Resposta tardia (após prazo) reabre para 'recebida'
 * - Ausência de resposta NÃO exclui nem rejeita automaticamente
 *
 * Ver docs/01-dominio/04-maquinas-estado.md § ME-04
 */
export function transicionarCorrecao(
  estadoAtual: SituacaoCorrecao | null,
  evento: EventoCorrecao,
  contexto: ContextoCorrecao,
): SituacaoCorrecao {
  const chave = `${estadoAtual ?? "INICIAL"}:${evento}`;
  const prazoDias = contexto.prazoDias ?? 7;
  const prazoLimite = new Date(contexto.dataSolicitacao);
  prazoLimite.setDate(prazoLimite.getDate() + prazoDias);

  switch (chave) {
    case "INICIAL:SOLICITAR_CORRECAO":
      return "aguardando_resposta";

    case "aguardando_resposta:RECEBER_RESPOSTA": {
      if (!contexto.dataResposta) {
        throw new ErroTransicaoInvalida(
          "aguardando_resposta",
          "RECEBER_RESPOSTA (sem data)",
        );
      }
      // Resposta dentro ou fora do prazo → recebida (reabre se tardia)
      return "recebida";
    }

    case "aguardando_resposta:EXPIRAR_PRAZO": {
      if (!contexto.dataResposta) {
        // Verifica se prazo expirou
        const agora = new Date();
        if (agora >= prazoLimite) {
          return "incompleta";
        }
        // Prazo não expirou ainda - transição inválida
        throw new ErroTransicaoInvalida(
          "aguardando_resposta",
          "EXPIRAR_PRAZO (prazo não vencido)",
        );
      }
      // Se tem resposta mas estado ainda é aguardando_resposta, vai para recebida
      return "recebida";
    }

    case "incompleta:RECEBER_RESPOSTA":
      // Resposta tardia aceita - reabre
      return "recebida";

    default:
      throw new ErroTransicaoInvalida(estadoAtual ?? "INICIAL", evento);
  }
}

/**
 * Verifica se o prazo de correção expirou
 */
export function prazoCorrecaoExpirou(
  dataSolicitacao: Date,
  prazoDias = 7,
): boolean {
  const prazoLimite = new Date(dataSolicitacao);
  prazoLimite.setDate(prazoLimite.getDate() + prazoDias);
  return new Date() >= prazoLimite;
}

/**
 * Calcula a data do prazo (7 dias corridos a partir da solicitação)
 */
export function calcularPrazoCorrecao(
  dataSolicitacao: Date,
  prazoDias = 7,
): Date {
  const prazo = new Date(dataSolicitacao);
  prazo.setDate(prazo.getDate() + prazoDias);
  return prazo;
}
