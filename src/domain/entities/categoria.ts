export interface Categoria {
  readonly id: string;
  slug: string;
  nome: string;
  descricao: string | null;
  ativa: boolean;
  criadoEm: Date;
}
