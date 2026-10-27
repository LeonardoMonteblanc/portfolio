export interface Administrador {
  readonly id: string;
  nome: string;
  email: string;
  senhaHash: string;
  tokenVersion: number;
  ativo: boolean;
  criadoEm: Date;
  ultimaTrocaSenha: Date | null;
}
