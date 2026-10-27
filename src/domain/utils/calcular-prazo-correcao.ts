export function calcularPrazoCorrecao(solicitadaEm: Date): Date {
  const prazo = new Date(solicitadaEm);
  prazo.setDate(prazo.getDate() + 7);
  return prazo;
}
