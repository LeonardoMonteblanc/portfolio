import type { SituacaoSugestao } from "@/domain/enums";

export interface SugestaoCategoria {
  readonly id: string;
  solicitacaoId: string;
  texto: string;
  situacao: SituacaoSugestao;
  categoriaCriadaId: string | null;
  adminId: string | null;
  justificativaInterna: string | null;
  criadaEm: Date;
  triadaEm: Date | null;
}
