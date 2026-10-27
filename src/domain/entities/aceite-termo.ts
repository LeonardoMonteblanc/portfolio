export interface AceiteTermo {
  readonly id: string;
  solicitanteId: string;
  documentoTermoId: string;
  aceitoEm: Date;
  ipOrigem: string | null;
}
