"use server";

import { db } from "@/db";
import { scheduledPosts, socialAccounts } from "@/db/schema";
import { requireDashboardAuth } from "@/lib/auth";
import {
  extrairDesign, fazerTeardown, gerarCarrossel,
  type Carrossel, type Estrutura, type PostGerado, type Teardown,
} from "@/lib/claude";
import { buscarPostProprio, shortcodeDaUrl } from "@/lib/instagram";
import { createSignedUpload, storageConfigured } from "@/lib/storage";
import { apifyConfigurado, buscarPostApify } from "@/lib/apify";

export type TeardownState =
  | { ok: true; teardown: Teardown; estrutura: Estrutura | null }
  | { ok: false; message: string }
  | null;

export async function analisarAction(
  _prev: TeardownState,
  form: FormData,
): Promise<TeardownState> {
  try {
    await requireDashboardAuth();
  } catch {
    return { ok: false, message: "Não autorizado." };
  }

  const imagens = JSON.parse(String(form.get("imagens") ?? "[]")) as string[];
  const legenda = String(form.get("legenda") ?? "").trim();
  const url = String(form.get("url") ?? "").trim();

  if (imagens.length === 0 && !legenda) {
    return { ok: false, message: "Suba pelo menos um print do post ou cole a legenda." };
  }

  try {
    // As duas leituras são independentes, então vão em paralelo — corta o tempo
    // de espera quase pela metade.
    const [teardown, estrutura] = await Promise.all([
      fazerTeardown({ imagens, legenda: legenda || undefined, url: url || undefined }),
      imagens.length ? extrairDesign(imagens).catch(() => null) : Promise.resolve(null),
    ]);
    return { ok: true, teardown, estrutura };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}

export type GerarState =
  | { ok: true; post: PostGerado; carrossel: Carrossel }
  | { ok: false; message: string }
  | null;

export async function gerarAction(_prev: GerarState, form: FormData): Promise<GerarState> {
  try {
    await requireDashboardAuth();
  } catch {
    return { ok: false, message: "Não autorizado." };
  }

  const teardown = JSON.parse(String(form.get("teardown") ?? "null")) as Teardown | null;
  if (!teardown) return { ok: false, message: "Faça o teardown primeiro." };

  const angulo = String(form.get("angulo") ?? "").trim();
  if (!angulo) return { ok: false, message: "Diga o ângulo que você quer." };

  const estrutura = JSON.parse(String(form.get("estrutura") ?? "null")) as Estrutura | null;
  const cta = String(form.get("cta") ?? "").trim() || "seguir o perfil";
  const observacoes = String(form.get("observacoes") ?? "").trim() || undefined;

  try {
    const carrossel = await gerarCarrossel({ teardown, estrutura, angulo, cta, observacoes });
    const post: PostGerado = {
      titulo: carrossel.titulo,
      slides: carrossel.slides.map((sl) => ({ titulo: sl.title, corpo: sl.text })),
      legenda: carrossel.legenda,
      primeiroComentario: carrossel.primeiroComentario,
      justificativa: carrossel.justificativa,
    };
    return { ok: true, post, carrossel };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}

/** Manda o post gerado pro fluxo de publicação como rascunho. */
export async function salvarRascunho(
  post: PostGerado,
  mediaUrls: string[] = [],
): Promise<{ ok: boolean; message: string }> {
  await requireDashboardAuth();

  const conta = await db.query.socialAccounts.findFirst();
  if (!conta) return { ok: false, message: "Nenhuma conta conectada." };

  const legendaCompleta = post.primeiroComentario
    ? `${post.legenda}\n\n---\n1º comentário: ${post.primeiroComentario}`
    : post.legenda;

  await db.insert(scheduledPosts).values({
    workspaceId: conta.workspaceId,
    caption: legendaCompleta,
    mediaUrls,
    mediaType: post.slides.length > 1 ? "carousel" : "image",
    scheduledFor: new Date(),
    status: "draft",
  });

  return {
    ok: true,
    message: mediaUrls.length
      ? `Rascunho salvo com ${mediaUrls.length} artes — abra Novo post pra publicar.`
      : "Salvo como rascunho — adicione as imagens em Novo post.",
  };
}

export type BuscaState =
  | { ok: true; imagens: string[]; legenda: string; meta: string }
  | { ok: false; message: string }
  | null;

/**
 * Tenta resolver a URL sozinho. Só funciona pra post da própria conta — a API
 * do Instagram não expõe mídia de terceiros, e o embed público virou muro de
 * login. Post de outra pessoa continua precisando de print.
 */
export async function buscarPorUrlAction(
  _prev: BuscaState,
  form: FormData,
): Promise<BuscaState> {
  try {
    await requireDashboardAuth();
  } catch {
    return { ok: false, message: "Não autorizado." };
  }

  const url = String(form.get("urlBusca") ?? "").trim();
  if (!shortcodeDaUrl(url)) {
    return { ok: false, message: "Isso não parece um link de post do Instagram." };
  }

  const conta = await db.query.socialAccounts.findFirst();
  if (!conta) return { ok: false, message: "Nenhuma conta conectada." };

  try {
    const post = await buscarPostProprio({
      igUserId: conta.externalId,
      encryptedToken: conta.accessTokenEnc,
      url,
    });

    // Post de outra pessoa: a API do Instagram não expõe. Cai pro Apify, que
    // mantém proxy e sessão e é atualizado por eles quando o IG muda.
    if (!post) {
      if (!apifyConfigurado()) {
        return {
          ok: false,
          message:
            "Não achei esse post na sua conta. Pra post de outra pessoa eu preciso do " +
            "APIFY_TOKEN configurado — sem ele, suba os prints dos slides.",
        };
      }
      try {
        const ap = await buscarPostApify(url);
        const salvas = await rehospedar(ap.imagens);
        return {
          ok: true,
          imagens: salvas,
          legenda: ap.legenda,
          meta: `@${ap.autor} · ${ap.tipo} · ${ap.likes} curtidas · ${ap.comentarios} comentários · via Apify`,
        };
      } catch (e) {
        return {
          ok: false,
          message: `Apify: ${e instanceof Error ? e.message : String(e)}`,
        };
      }
    }

    return {
      ok: true,
      imagens: post.imagens,
      legenda: post.caption,
      meta: `${post.mediaType} · ${post.likes} curtidas · ${post.comments} comentários`,
    };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}

/** Baixa e re-hospeda no nosso bucket. As URLs do CDN do IG expiram. */
async function rehospedar(urls: string[]): Promise<string[]> {
  const r = await importarUrlsAction(urls);
  return r?.ok ? r.urls : urls;
}

export type ImportState =
  | { ok: true; urls: string[]; avisos: string[] }
  | { ok: false; message: string }
  | null;

const MAX_BYTES = 15 * 1024 * 1024;

/**
 * Recebe URLs de imagem (arrastadas do post ou coladas), baixa no servidor e
 * re-hospeda no nosso bucket.
 *
 * Por que re-hospedar em vez de passar a URL do CDN direto pro Claude: as URLs
 * do scontent.cdninstagram.com são assinadas e EXPIRAM em algumas horas. Se o
 * teardown demorasse ou você voltasse ao rascunho depois, a imagem sumia.
 */
export async function importarUrlsAction(urls: string[]): Promise<ImportState> {
  try {
    await requireDashboardAuth();
  } catch {
    return { ok: false, message: "Não autorizado." };
  }
  if (!storageConfigured()) {
    return { ok: false, message: "Storage não configurado." };
  }

  const limpas = [...new Set(urls.map((u) => u.trim()).filter((u) => /^https?:\/\//i.test(u)))];
  if (!limpas.length) return { ok: false, message: "Nenhuma URL de imagem válida." };

  const salvas: string[] = [];
  const avisos: string[] = [];

  for (const [i, url] of limpas.entries()) {
    try {
      const r = await fetch(url, {
        headers: { "user-agent": "Mozilla/5.0", accept: "image/*,*/*" },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);

      const tipo = r.headers.get("content-type") ?? "";
      if (!tipo.startsWith("image/")) throw new Error(`não é imagem (${tipo || "sem tipo"})`);

      const bytes = new Uint8Array(await r.arrayBuffer());
      if (bytes.byteLength > MAX_BYTES) throw new Error("maior que 15 MB");

      const ext = tipo.includes("png") ? "png" : tipo.includes("webp") ? "webp" : "jpg";
      const { signedUrl, publicUrl } = await createSignedUpload(`ref-${i + 1}.${ext}`);

      const put = await fetch(signedUrl, {
        method: "PUT",
        body: bytes,
        headers: { "content-type": tipo },
      });
      if (!put.ok) throw new Error(`falha ao salvar (HTTP ${put.status})`);

      salvas.push(publicUrl);
    } catch (e) {
      avisos.push(`${url.slice(0, 50)}…: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  if (!salvas.length) {
    return { ok: false, message: `Nenhuma imagem baixou. ${avisos[0] ?? ""}` };
  }
  return { ok: true, urls: salvas, avisos };
}
