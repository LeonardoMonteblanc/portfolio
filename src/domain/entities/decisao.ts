import type { ResultadoDecisao, OrigemDecisao } from "@/domain/enums";

export interface Decisao {
  readonly id: string;
  solicitacaoId: string;
  adminId: string;
  resultado: ResultadoDecisao;
  origem: OrigemDecisao;
  justificativa: string;
  motivoErroAdmin: boolean;
  descricaoErro: string | null;
  criadoEm: Date;
  contestacaoId: string | null;
}
