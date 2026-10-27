// src/domain/state-machines/votacao.ts
import type { SituacaoVotacao, EscolhaVoto, EstadoVoto } from "@/domain/enums";
import {
  ErroTransicaoInvalida,
  VotoDuplicado,
  QuorumIncompleto,
} from "@/domain/errors";

export type EventoVotacao =
  | "ABRIR_VOTACAO"
  | "REGISTRAR_VOTO"
  | "CONCLUIR_VOTACAO"
  | "SUSPENDER_ADMIN"
  | "REATIVAR_ADMIN";

export interface VotoInfo {
  adminId: string;
  escolha: EscolhaVoto;
  estado: EstadoVoto;
  criadoEm: Date;
}

export interface ContextoVotacao {
  votos: VotoInfo[];
  adminsAtivos: Set<string>;
  adminId?: string;
  escolha?: EscolhaVoto;
}

/**
 * ME-03 — Votação
 *
 * Estados: em_andamento, aprovada, rejeitada, sem_aprovacao
 * Transições: 5
 *
 * Regras:
 * - Quórum = admins ativos no momento da apuração
 * - Um admin vota no máximo uma vez (voto 'ativo')
 * - Suspensão após votar → voto vira 'inativo', admin sai do quórum
 * - Reativação → admin volta ao quórum, precisa votar novamente (voto anterior 'inativo' → 'substituido')
 * - Maioria simples define; empate = 'sem_aprovacao'
 * - Quórum vazio: votação permanece 'em_andamento' sem tratamento especial
 * - Voto é fato histórico: suspensão posterior não invalida voto já contado na apuração
 *
 * Ver docs/01-dominio/04-maquinas-estado.md § ME-03
 */
export function transicionarVotacao(
  estadoAtual: SituacaoVotacao | null,
  evento: EventoVotacao,
  contexto: ContextoVotacao,
): SituacaoVotacao {
  const chave = `${estadoAtual ?? "INICIAL"}:${evento}`;

  switch (chave) {
    case "INICIAL:ABRIR_VOTACAO": {
      if (contexto.adminsAtivos.size === 0) {
        // Quórum vazio - permanece em_andamento sem tratamento especial
        return "em_andamento";
      }
      return "em_andamento";
    }

    case "em_andamento:REGISTRAR_VOTO": {
      if (!contexto.adminId || !contexto.escolha) {
        throw new ErroTransicaoInvalida(
          "em_andamento",
          "REGISTRAR_VOTO (sem adminId ou escolha)",
        );
      }
      // Verificar se admin está no quórum
      if (!contexto.adminsAtivos.has(contexto.adminId)) {
        throw new ErroTransicaoInvalida(
          "em_andamento",
          "REGISTRAR_VOTO (admin não está no quórum)",
        );
      }
      // Verificar voto duplicado (voto ativo existente)
      const votoExistente = contexto.votos.find(
        (v) => v.adminId === contexto.adminId && v.estado === "ativo",
      );
      if (votoExistente) {
        throw new VotoDuplicado();
      }
      // O voto em si é registrado na infraestrutura; aqui apenas validamos a transição
      return "em_andamento";
    }

    case "em_andamento:CONCLUIR_VOTACAO": {
      // Verificar se todos os admins ativos votaram
      const votosAtivos = contexto.votos.filter((v) => v.estado === "ativo");
      const adminsQueVotaram = new Set(votosAtivos.map((v) => v.adminId));

      // Verificar se todos os admins ativos votaram
      for (const adminId of contexto.adminsAtivos) {
        if (!adminsQueVotaram.has(adminId)) {
          throw new QuorumIncompleto();
        }
      }

      // Apurar: contar votos ativos
      const aprovacoes = votosAtivos.filter(
        (v) => v.escolha === "aprovacao",
      ).length;
      const rejeicoes = votosAtivos.filter(
        (v) => v.escolha === "rejeicao",
      ).length;

      if (aprovacoes > rejeicoes) return "aprovada";
      if (rejeicoes > aprovacoes) return "rejeitada";
      return "sem_aprovacao"; // empate
    }

    case "em_andamento:SUSPENDER_ADMIN": {
      if (!contexto.adminId) {
        throw new ErroTransicaoInvalida(
          "em_andamento",
          "SUSPENDER_ADMIN (sem adminId)",
        );
      }
      // A suspensão é tratada na infraestrutura (marca voto como 'inativo', remove do quórum)
      // Aqui apenas validamos que a transição de estado da votação continua 'em_andamento'
      return "em_andamento";
    }

    case "em_andamento:REATIVAR_ADMIN": {
      if (!contexto.adminId) {
        throw new ErroTransicaoInvalida(
          "em_andamento",
          "REATIVAR_ADMIN (sem adminId)",
        );
      }
      // Reativação: admin volta ao quórum, precisa votar novamente
      return "em_andamento";
    }

    default:
      throw new ErroTransicaoInvalida(estadoAtual ?? "INICIAL", evento);
  }
}

/**
 * Apura o resultado da votação baseado nos votos ativos
 */
export function apurarVotacao(
  votos: VotoInfo[],
  adminsAtivos: Set<string>,
): {
  situacao: SituacaoVotacao;
  aprovacoes: number;
  rejeicoes: number;
  quorumCompleto: boolean;
} {
  const votosAtivos = votos.filter((v) => v.estado === "ativo");
  const adminsQueVotaram = new Set(votosAtivos.map((v) => v.adminId));

  // Verificar quórum completo
  let quorumCompleto = true;
  for (const adminId of adminsAtivos) {
    if (!adminsQueVotaram.has(adminId)) {
      quorumCompleto = false;
      break;
    }
  }

  if (!quorumCompleto) {
    return {
      situacao: "em_andamento",
      aprovacoes: 0,
      rejeicoes: 0,
      quorumCompleto: false,
    };
  }

  const aprovacoes = votosAtivos.filter(
    (v) => v.escolha === "aprovacao",
  ).length;
  const rejeicoes = votosAtivos.filter((v) => v.escolha === "rejeicao").length;

  let situacao: SituacaoVotacao;
  if (aprovacoes > rejeicoes) situacao = "aprovada";
  else if (rejeicoes > aprovacoes) situacao = "rejeitada";
  else situacao = "sem_aprovacao";

  return { situacao, aprovacoes, rejeicoes, quorumCompleto: true };
}

/**
 * Aplica suspensão de admin: marca voto como 'inativo' se existir
 */
export function aplicarSuspensaoAdmin(
  votos: VotoInfo[],
  adminIdSuspenso: string,
): VotoInfo[] {
  return votos.map((voto) =>
    voto.adminId === adminIdSuspenso && voto.estado === "ativo"
      ? { ...voto, estado: "inativo" as EstadoVoto }
      : voto,
  );
}

/**
 * Aplica reativação de admin: voto anterior vira 'substituido', novo voto será 'ativo'
 */
export function aplicarReativacaoAdmin(
  votos: VotoInfo[],
  adminIdReativado: string,
): VotoInfo[] {
  return votos.map((voto) =>
    voto.adminId === adminIdReativado && voto.estado === "inativo"
      ? { ...voto, estado: "substituido" as EstadoVoto }
      : voto,
  );
}
