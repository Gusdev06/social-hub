/**
 * Busca um post do Instagram por URL usando o Apify.
 *
 * Por que Apify e não fetch direto: o Instagram fechou todo acesso não
 * autenticado à página do post — /embed/, __a=1, api/v1 e GraphQL respondem
 * 404/401. O Apify mantém proxy e sessão, e é o trabalho deles manter isso
 * funcionando quando o Instagram muda. Só o CDN de imagem segue público, e é
 * por isso que a gente consegue re-hospedar o que ele devolve.
 */

const ATOR = process.env.APIFY_ACTOR ?? "apify~instagram-scraper";

export function apifyConfigurado(): boolean {
  return Boolean(process.env.APIFY_TOKEN);
}

export type PostApify = {
  url: string;
  autor: string;
  legenda: string;
  tipo: string;
  imagens: string[];
  likes: number;
  comentarios: number;
};

type ItemApify = {
  url?: string;
  ownerUsername?: string;
  caption?: string;
  type?: string;
  displayUrl?: string;
  images?: string[];
  childPosts?: { displayUrl?: string; type?: string }[];
  likesCount?: number;
  commentsCount?: number;
  error?: string;
  errorDescription?: string;
};

export async function buscarPostApify(url: string): Promise<PostApify> {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error("APIFY_TOKEN não configurado.");

  const endpoint =
    `https://api.apify.com/v2/acts/${ATOR}/run-sync-get-dataset-items` +
    `?token=${encodeURIComponent(token)}&timeout=120`;

  const r = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      directUrls: [url],
      resultsType: "posts",
      resultsLimit: 1,
      addParentData: false,
    }),
  });

  if (!r.ok) {
    const corpo = await r.text().catch(() => "");
    throw new Error(`Apify respondeu HTTP ${r.status}. ${corpo.slice(0, 160)}`);
  }

  const itens = (await r.json()) as ItemApify[];
  const item = itens?.[0];
  if (!item) throw new Error("O Apify não devolveu nada pra essa URL.");
  if (item.error) throw new Error(`${item.error}: ${item.errorDescription ?? ""}`);

  // Carrossel vem em childPosts; post único vem em displayUrl/images.
  const imagens = [
    ...(item.childPosts?.map((c) => c.displayUrl).filter(Boolean) ?? []),
    ...(item.images ?? []),
    ...(item.displayUrl ? [item.displayUrl] : []),
  ].filter((u, i, a): u is string => Boolean(u) && a.indexOf(u) === i);

  if (!imagens.length) {
    throw new Error("O Apify achou o post mas não devolveu imagem — pode ser conta privada.");
  }

  return {
    url: item.url ?? url,
    autor: item.ownerUsername ?? "",
    legenda: item.caption ?? "",
    tipo: item.type ?? "",
    imagens,
    likes: item.likesCount ?? 0,
    comentarios: item.commentsCount ?? 0,
  };
}
