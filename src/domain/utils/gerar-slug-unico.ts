export function gerarSlugUnico(base: string, existentes: Set<string>): string {
  if (!existentes.has(base)) return base;
  let i = 2;
  while (existentes.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}
