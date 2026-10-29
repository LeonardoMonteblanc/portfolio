import type { SituacaoCorrecao } from "@/domain/enums";

export interface CorrecaoDados {
  readonly id: string;
  solicitacaoId: string;
  adminId: string;
  camposSolicitados: string;
  situacao: SituacaoCorrecao;
  solicitadaEm: Date;
  prazoEm: Date;
  respondidaEm: Date | null;
  resposta: string | null;
}
