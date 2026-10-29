import type { TipoImagem, SituacaoImagem } from "@/domain/enums";

export interface Imagem {
  readonly id: string;
  negocioId: string;
  solicitacaoId: string | null;
  anexoOrigemId: string | null;
  tipo: TipoImagem;
  situacao: SituacaoImagem;
  url: string;
  justificativaRejeicao: string | null;
  criadoEm: Date;
}
