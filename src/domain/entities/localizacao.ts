export interface Localizacao {
  readonly id: string;
  negocioId: string;
  endereco: string | null;
  bairro: string | null;
  areaAtendimento: string | null;
}
