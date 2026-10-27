import type { SituacaoPublicacao } from "@/domain/enums";

export type MotivoNaoElegivel =
  | "aprovacao_ausente"
  | "dados_incompletos"
  | "categoria_removida"
  | "contato_invalido";

export interface Negocio {
  readonly id: string;
  slug: string;
  nome: string;
  descricao: string;
  situacaoPublicacao: SituacaoPublicacao;
  motivoNaoElegivel: MotivoNaoElegivel | null;
  aprovacaoVigenteId: string | null;
  criadoEm: Date;
  atualizadoEm: Date;
}
