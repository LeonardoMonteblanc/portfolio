import type { EscolhaVoto, EstadoVoto } from "@/domain/enums";

export interface Voto {
  readonly id: string;
  votacaoId: string;
  adminId: string;
  escolha: EscolhaVoto;
  estado: EstadoVoto;
  criadoEm: Date;
}
