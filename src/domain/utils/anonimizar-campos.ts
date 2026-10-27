export const MARCADOR_ANONIMIZADO = "<anonimizado>";

export function anonimizarCampos<T extends Record<string, unknown>>(
  obj: T,
  campos: (keyof T)[],
): T {
  const copia = { ...obj };
  for (const campo of campos) {
    copia[campo] = MARCADOR_ANONIMIZADO as T[keyof T];
  }
  return copia;
}
