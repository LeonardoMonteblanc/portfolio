import type { TipoSolicitacao, SituacaoSolicitacao } from "@/domain/enums";

export interface Solicitacao {
  readonly id: string;
  solicitanteId: string;
  negocioId: string | null;
  tipo: TipoSolicitacao;
  situacao: SituacaoSolicitacao;
  declaracaoVinculo: string;
  dadosNegocioProposto: Record<string, unknown>;
  duplicataDetectada: boolean;
  motivoIncompleta: string | null;
  criadoEm: Date;
  atualizadoEm: Date;
}
