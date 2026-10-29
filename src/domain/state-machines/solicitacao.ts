// src/domain/state-machines/solicitacao.ts
import type { SituacaoSolicitacao, TipoSolicitacao } from "@/domain/enums";
import {
  ErroTransicaoInvalida,
  AceiteObrigatorio,
  JustificativaObrigatoria,
  DadosIncompletos,
  DecisaoImutavel,
  ReaberturaNaoPermitida,
} from "@/domain/errors";

export type EventoSolicitacao =
  | "ENVIAR_SOLICITACAO"
  | "INICIAR_ANALISE"
  | "SOLICITAR_CORRECAO"
  | "RECEBER_CORRECAO"
  | "EXPIRAR_PRAZO_CORRECAO"
  | "REGISTRAR_DECISAO_APROVACAO"
  | "REGISTRAR_DECISAO_REJEICAO"
  | "ABRIR_CONTESTACAO"
  | "CONCLUIR_VOTACAO"
  | "REABRIR_POR_ERRO"
  | "LIBERAR_FILA"
  | "CANCELAR_POR_RESULTADO";

export interface ContextoSolicitacao {
  aceite?: boolean;
  dadosMinimos?: boolean;
  negocioEmContestacao?: boolean;
  votacaoAprovada?: boolean;
  dadosCompletos?: boolean;
  justificativa?: string;
  motivoErroAdmin?: boolean;
  descricaoErro?: string;
  resultadoVotacao?: "aprovada" | "rejeitada" | "sem_aprovacao";
  adminId?: string;
}

/**
 * ME-01 — Solicitação de participação
 *
 * Estados (12): recebida, em_analise, aguardando_correcao, incompleta,
 *               em_fila_contestacao, cancelada_por_contestacao,
 *               aprovada, rejeitada, em_votacao,
 *               votacao_aprovada, votacao_rejeitada, votacao_sem_aprovacao
 *
 * Transições: 16
 *
 * Estados terminais: votacao_aprovada, votacao_rejeitada, votacao_sem_aprovacao, cancelada_por_contestacao
 *
 * Ver docs/01-dominio/04-maquinas-estado.md § ME-01
 */
export function transicionarSolicitacao(
  estadoAtual: SituacaoSolicitacao | null,
  evento: EventoSolicitacao,
  contexto: ContextoSolicitacao = {},
): SituacaoSolicitacao {
  const chave = `${estadoAtual ?? "INICIAL"}:${evento}`;

  switch (chave) {
    // #1, #1a, #1b - Envio de solicitação
    case "INICIAL:ENVIAR_SOLICITACAO": {
      if (!contexto.aceite) throw new AceiteObrigatorio();
      if (!contexto.dadosMinimos)
        throw new DadosIncompletos(["dados mínimos da solicitação"]);

      // #1a - Se negócio relacionado está em oculto_contestacao, entra na fila
      if (contexto.negocioEmContestacao) {
        return "em_fila_contestacao";
      }
      return "recebida";
    }

    // #1b - Liberar fila após votação aprovada
    case "em_fila_contestacao:LIBERAR_FILA": {
      if (!contexto.votacaoAprovada) {
        throw new ErroTransicaoInvalida(
          "em_fila_contestacao",
          "LIBERAR_FILA (votacao não aprovada)",
        );
      }
      return "recebida";
    }

    // #2 - Iniciar análise
    case "recebida:INICIAR_ANALISE": {
      if (!contexto.adminId) {
        throw new ErroTransicaoInvalida(
          "recebida",
          "INICIAR_ANALISE (sem adminId)",
        );
      }
      return "em_analise";
    }

    // #3 - Solicitar correção
    case "em_analise:SOLICITAR_CORRECAO": {
      if (!contexto.justificativa?.trim()) throw new JustificativaObrigatoria();
      return "aguardando_correcao";
    }

    // #4 - Receber correção dentro do prazo
    case "aguardando_correcao:RECEBER_CORRECAO": {
      if (!contexto.dadosCompletos) throw new DadosIncompletos(["correção"]);
      return "em_analise";
    }

    // #5 - Expirar prazo de correção (7 dias sem resposta)
    case "aguardando_correcao:EXPIRAR_PRAZO_CORRECAO":
      return "incompleta";

    // #6 - Receber correção tardia (em incompleta)
    case "incompleta:RECEBER_CORRECAO": {
      if (!contexto.dadosCompletos)
        throw new DadosIncompletos(["correção tardia"]);
      return "em_analise";
    }

    // #7 - Registrar decisão de rejeição (de incompleta)
    case "incompleta:REGISTRAR_DECISAO_REJEICAO": {
      if (!contexto.justificativa?.trim()) throw new JustificativaObrigatoria();
      return "rejeitada";
    }

    // #8 - Registrar decisão de aprovação (de em_analise)
    case "em_analise:REGISTRAR_DECISAO_APROVACAO": {
      if (!contexto.dadosCompletos)
        throw new DadosIncompletos(["dados para aprovação"]);
      if (!contexto.justificativa?.trim()) throw new JustificativaObrigatoria();
      return "aprovada";
    }

    // #9 - Registrar decisão de rejeição (de em_analise)
    case "em_analise:REGISTRAR_DECISAO_REJEICAO": {
      if (!contexto.justificativa?.trim()) throw new JustificativaObrigatoria();
      return "rejeitada";
    }

    // #10 - Abrir contestação sobre decisão de aprovação
    case "aprovada:ABRIR_CONTESTACAO": {
      if (!contexto.justificativa?.trim()) throw new JustificativaObrigatoria();
      // Guarda: só permite contestar decisão individual (verificada na aplicação)
      return "em_votacao";
    }

    // #11 - Abrir contestação sobre decisão de rejeição
    case "rejeitada:ABRIR_CONTESTACAO": {
      if (!contexto.justificativa?.trim()) throw new JustificativaObrigatoria();
      return "em_votacao";
    }

    // #12 - Concluir votação com aprovação
    case "em_votacao:CONCLUIR_VOTACAO": {
      if (contexto.resultadoVotacao === "aprovada") return "votacao_aprovada";
      if (contexto.resultadoVotacao === "rejeitada") return "votacao_rejeitada";
      if (contexto.resultadoVotacao === "sem_aprovacao")
        return "votacao_sem_aprovacao";
      throw new ErroTransicaoInvalida(
        "em_votacao",
        "CONCLUIR_VOTACAO (resultado inválido)",
      );
    }

    // #15 - Reabrir por erro do admin (só de rejeitada com motivo_erro_admin = true)
    case "rejeitada:REABRIR_POR_ERRO": {
      if (!contexto.motivoErroAdmin) throw new ReaberturaNaoPermitida();
      if (!contexto.descricaoErro?.trim()) throw new JustificativaObrigatoria();
      return "em_analise";
    }

    // #16 - Cancelar por resultado de votação (rejeitada/empate)
    case "em_fila_contestacao:CANCELAR_POR_RESULTADO": {
      if (contexto.resultadoVotacao === "aprovada") {
        throw new ErroTransicaoInvalida(
          "em_fila_contestacao",
          "CANCELAR_POR_RESULTADO (votacao aprovada)",
        );
      }
      return "cancelada_por_contestacao";
    }

    default:
      // Verificar se é tentativa de transição a partir de estado terminal
      if (estadoAtual && isEstadoTerminal(estadoAtual)) {
        throw new ErroTransicaoInvalida(estadoAtual, evento);
      }
      throw new ErroTransicaoInvalida(estadoAtual ?? "INICIAL", evento);
  }
}

/**
 * Verifica se um estado é terminal (não aceita transições de saída)
 */
export function isEstadoTerminal(estado: SituacaoSolicitacao): boolean {
  return [
    "votacao_aprovada",
    "votacao_rejeitada",
    "votacao_sem_aprovacao",
    "cancelada_por_contestacao",
  ].includes(estado);
}

/**
 * Verifica se uma solicitação pode ser contestada
 * RN24: Decisão de votação não pode ser recontestada
 */
export function podeContestar(
  estado: SituacaoSolicitacao,
  origemDecisao: "individual" | "votacao",
): boolean {
  if (origemDecisao === "votacao") return false;
  return estado === "aprovada" || estado === "rejeitada";
}

/**
 * Verifica se uma solicitação está em estado que permite análise
 */
export function podeAnalisar(estado: SituacaoSolicitacao): boolean {
  return ["recebida", "em_fila_contestacao"].includes(estado);
}

/**
 * Verifica se uma solicitação está aguardando correção
 */
export function estaAguardandoCorrecao(estado: SituacaoSolicitacao): boolean {
  return estado === "aguardando_correcao";
}

/**
 * Verifica se uma solicitação está incompleta (prazo vencido)
 */
export function estaIncompleta(estado: SituacaoSolicitacao): boolean {
  return estado === "incompleta";
}
