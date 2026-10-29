export interface Contestacao {
  readonly id: string;
  decisaoContestadaId: string;
  solicitacaoId: string;
  motivo: string;
  criadoEm: Date;
}
