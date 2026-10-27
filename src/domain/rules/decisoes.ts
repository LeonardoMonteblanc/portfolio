// src/domain/rules/decisoes.ts
// RN12–RN25: Decisões, fórum e contestação

import { ErroDominio } from "@/domain/errors";

type ValidacaoOk = { ok: true };
type ValidacaoErro = { ok: false; erros: ErroDominio[] };
export type ResultadoValidacao = ValidacaoOk | ValidacaoErro;

/**
 * RN12: Admin aprova ou rejeita individualmente uma solicitação
 * RN13: Decisão registra responsável, data/hora e justificativa
 * RN14: Rejeitadas permanecem no painel para consulta
 */
export function validarDecisaoIndividual(dados: {
  resultado: "aprovacao" | "rejeicao";
  justificativa: string;
  adminId: string;
  motivoErroAdmin?: boolean;
  descricaoErro?: string;
}): ResultadoValidacao {
  const erros: ErroDominio[] = [];

  if (!dados.justificativa?.trim()) {
    erros.push(
      new (class extends ErroDominio {
        constructor() {
          super("JUSTIFICATIVA_OBRIGATORIA", "Justificativa é obrigatória");
        }
      })(),
    );
  }
  if (!dados.adminId) {
    erros.push(
      new (class extends ErroDominio {
        constructor() {
          super("ADMIN_OBRIGATORIO", "Admin responsável é obrigatório");
        }
      })(),
    );
  }
  if (dados.motivoErroAdmin && !dados.descricaoErro?.trim()) {
    erros.push(
      new (class extends ErroDominio {
        constructor() {
          super(
            "DESCRICAO_ERRO_OBRIGATORIA",
            "Descrição do erro é obrigatória quando motivo_erro_admin = true",
          );
        }
      })(),
    );
  }

  return erros.length === 0 ? { ok: true } : { ok: false, erros };
}

/**
 * RN15: Fórum permite comentários e manifestações
 * RN16: Concordância/discordância não altera decisão automaticamente
 * RN16: Concordância/discordância não inicia votação por si sós
 */
export function validarManifestacaoForum(
  tipo: "concordancia" | "discordancia",
): ResultadoValidacao {
  // Apenas validação de tipo - a regra RN16 é comportamental (não altera decisão)
  if (!["concordancia", "discordancia"].includes(tipo)) {
    return {
      ok: false,
      erros: [
        new (class extends ErroDominio {
          constructor() {
            super("TIPO_INVALIDO", "Tipo de manifestação inválido");
          }
        })(),
      ],
    };
  }
  return { ok: true };
}

/**
 * RN17: Contestação formal inicia votação coletiva
 * RN24: Decisão de votação não pode ser recontestada
 */
export function validarContestacao(dados: {
  decisaoOrigem: "individual" | "votacao";
  justificativa: string;
  adminId: string;
}): ResultadoValidacao {
  const erros: ErroDominio[] = [];

  if (dados.decisaoOrigem === "votacao") {
    erros.push(
      new (class extends ErroDominio {
        constructor() {
          super(
            "DECISAO_IMUTAVEL",
            "Decisão de votação não pode ser recontestada",
          );
        }
      })(),
    );
  }
  if (!dados.justificativa?.trim()) {
    erros.push(
      new (class extends ErroDominio {
        constructor() {
          super("JUSTIFICATIVA_OBRIGATORIA", "Justificativa é obrigatória");
        }
      })(),
    );
  }
  if (!dados.adminId) {
    erros.push(
      new (class extends ErroDominio {
        constructor() {
          super("ADMIN_OBRIGATORIO", "Admin responsável é obrigatório");
        }
      })(),
    );
  }

  return erros.length === 0 ? { ok: true } : { ok: false, erros };
}

/**
 * RN18: Todos os admins ativos devem votar
 * RN19: Resultado apurado e aplicado automaticamente
 * RN20: Maioria simples dos votos válidos define
 * RN21: Empate = sem aprovação
 */
export function validarVotacao(
  votos: Array<{
    adminId: string;
    escolha: "aprovacao" | "rejeicao";
    estado: string;
  }>,
  adminsAtivos: string[],
):
  | {
      ok: true;
      resultado: "aprovada" | "rejeitada" | "sem_aprovacao";
    }
  | {
      ok: false;
      erros: ErroDominio[];
      quorumCompleto: boolean;
    } {
  const votosAtivos = votos.filter((v) => v.estado === "ativo");
  const adminsQueVotaram = new Set(votosAtivos.map((v) => v.adminId));

  // RN18: Verificar quórum
  const quorumCompleto = adminsAtivos.every((id) => adminsQueVotaram.has(id));
  if (!quorumCompleto) {
    return {
      ok: false,
      erros: [
        new (class extends ErroDominio {
          constructor() {
            super("QUORUM_INCOMPLETO", "Nem todos os admins ativos votaram");
          }
        })(),
      ],
      quorumCompleto: false,
    };
  }

  // RN20/RN21: Apurar - maioria simples, empate = sem_aprovacao
  const aprovacoes = votosAtivos.filter(
    (v) => v.escolha === "aprovacao",
  ).length;
  const rejeicoes = votosAtivos.filter((v) => v.escolha === "rejeicao").length;

  let resultado: "aprovada" | "rejeitada" | "sem_aprovacao";
  if (aprovacoes > rejeicoes) resultado = "aprovada";
  else if (rejeicoes > aprovacoes) resultado = "rejeitada";
  else resultado = "sem_aprovacao";

  return { ok: true, resultado };
}

/**
 * RN22: Negócio publicado fica oculto durante votação
 * RN23: Negócio rejeitado permanece fora do catálogo
 */
export function aplicarOcultacaoVotacao(negocioPublicado: boolean): boolean {
  return negocioPublicado; // true = deve ocultar
}

/**
 * RN25: Histórico de decisões, justificativas, comentários, contestações e votos preservado
 * Imutabilidade garantida na camada de infraestrutura (append-only)
 */
export function validarImutabilidadeHistorico(): ResultadoValidacao {
  // Regra comportamental - implementada via constraints de banco (REVOKE UPDATE, DELETE)
  return { ok: true };
}
