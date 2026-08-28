/** Normaliza pra casar keyword sem depender de acento, emoji ou caixa. */
export function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // acentos
    .replace(/[^\p{L}\p{N}\s]/gu, " ") // pontuação e emoji
    .replace(/\s+/g, " ")
    .trim();
}

export function matchesKeywords(
  commentText: string,
  keywords: string[],
  mode: "exact" | "contains",
): boolean {
  const text = normalize(commentText);
  if (!text) return false;

  return keywords.some((raw) => {
    const kw = normalize(raw);
    if (!kw) return false;
    if (mode === "exact") return text === kw;
    // Palavra inteira, pra "IA" não casar dentro de "familia".
    return new RegExp(`(^|\\s)${escapeRegex(kw)}($|\\s)`, "u").test(text);
  });
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
