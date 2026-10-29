export interface Solicitante {
  readonly id: string;
  nome: string;
  email: string;
  telefone: string;
  criadoEm: Date;
  anonimizadoEm: Date | null;
}
