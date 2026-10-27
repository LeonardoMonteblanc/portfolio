// src/domain/utils/date.ts

/**
 * Adiciona dias a uma data e retorna uma nova instância.
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Verifica se uma data já passou em relação a uma data de referência.
 * Útil para prazos de correção e votações.
 */
export function isExpired(
  date: Date,
  referenceDate: Date = new Date(),
): boolean {
  return date.getTime() < referenceDate.getTime();
}
