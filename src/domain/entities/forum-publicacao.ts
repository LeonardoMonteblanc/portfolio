import type { TipoForumPublicacao } from "@/domain/enums";

export interface ForumPublicacao {
  readonly id: string;
  solicitacaoId: string;
  adminId: string;
  comentarioPaiId: string | null;
  conteudo: string;
  tipo: TipoForumPublicacao;
  criadoEm: Date;
}
