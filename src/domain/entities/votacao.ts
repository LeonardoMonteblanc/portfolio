import type { SituacaoVotacao } from "@/domain/enums";

export interface Votacao {
  readonly id: string;
  contestacaoId: string;
  situacao: SituacaoVotacao;
  iniciadaEm: Date;
  concluidaEm: Date | null;
  quorumSnapshot: Record<string, unknown> | null;
  resultadoAprovacao: number | null;
  resultadoRejeicao: number | null;
}
