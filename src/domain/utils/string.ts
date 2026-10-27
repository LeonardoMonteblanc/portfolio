// src/domain/utils/string.ts

/**
 * Remove acentos e converte para minúsculo, ideal para comparações de busca.
 */
export function normalizeSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Gera um slug amigável para URL a partir de um texto.
 * Exemplo: "Padaria do João!" vira "padaria-do-joao".
 */
export function generateSlug(text: string): string {
  return normalizeSearch(text)
    .replace(/[^a-z0-9]+/g, "-") // Substitui caracteres não alfanuméricos por hífen
    .replace(/^-+|-+$/g, "") // Remove hífens do início e do fim
    .replace(/-+/g, "-"); // Remove hífens duplicados
}
