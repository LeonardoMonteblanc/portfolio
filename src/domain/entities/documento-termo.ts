import type { TipoDocumentoTermo } from "@/domain/enums";

export interface DocumentoTermo {
  readonly id: string;
  tipo: TipoDocumentoTermo;
  versao: string;
  conteudo: string;
  vigente: boolean;
  criadoEm: Date;
}
