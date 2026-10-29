import type { SituacaoAnexo } from "@/domain/enums";

export interface Anexo {
  readonly id: string;
  solicitacaoId: string;
  arquivoUrl: string;
  nomeOriginal: string;
  mimeType: string;
  tamanhoBytes: number;
  situacao: SituacaoAnexo;
  criadoEm: Date;
}
