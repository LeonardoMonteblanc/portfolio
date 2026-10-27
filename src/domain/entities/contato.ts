import type { TipoContato } from "@/domain/enums";

export interface Contato {
  readonly id: string;
  negocioId: string;
  tipo: TipoContato;
  valor: string;
  ordem: number;
  valido: boolean;
  criadoEm: Date;
}
