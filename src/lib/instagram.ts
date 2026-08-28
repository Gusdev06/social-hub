import { decrypt } from "./crypto";

const BASE = process.env.IG_GRAPH_BASE ?? "https://graph.instagram.com";
const VERSION = process.env.IG_API_VERSION ?? "v23.0";

/** IG devolve erro no corpo com 200 em alguns casos — sempre inspecionar. */
export class InstagramApiError extends Error {
  constructor(message: string, readonly code?: number, readonly subcode?: number) {
    super(message);
    this.name = "InstagramApiError";
  }
}

async function call<T>(path: string, init: RequestInit & { token: string }): Promise<T> {
  const { token, ...rest } = init;
  const url = `${BASE}/${VERSION}/${path}`;
  const res = await fetch(url, {
    ...rest,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      ...(rest.headers ?? {}),
    },
  });

  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  const err = body.error as { message?: string; code?: number; error_subcode?: number } | undefined;
  if (!res.ok || err) {
    throw new InstagramApiError(err?.message ?? `HTTP ${res.status}`, err?.code, err?.error_subcode);
  }
  return body as T;
}

/**
 * O private reply: único jeito sancionado de mandar o PRIMEIRO DM pra quem
 * comentou. Janela de 7 dias, e EXATAMENTE UM por comentário — a segunda
 * tentativa volta com subcode 2534014, por isso comment_id é UNIQUE no banco.
 */
export async function sendPrivateReply(opts: {
  igUserId: string;
  encryptedToken: string;
  commentId: string;
  text: string;
  /** Botão de POSTBACK — a pessoa toca e a gente recebe um webhook `messaging`.
   *  É assim que o segundo DM (o do link) fica autorizado: o Instagram não
   *  deixa mandar link sem interação, e o toque é a interação. */
  postbackButton?: { title: string; payload: string };
  /** Botões de link direto, quando não há fluxo de dois passos. */
  buttons?: { title: string; url: string }[];
}): Promise<{ message_id?: string }> {
  const token = decrypt(opts.encryptedToken);

  let message: unknown;
  if (opts.postbackButton) {
    message = {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text: opts.text,
          buttons: [{
            type: "postback",
            title: opts.postbackButton.title.slice(0, 20),
            payload: opts.postbackButton.payload,
          }],
        },
      },
    };
  } else if (opts.buttons?.length) {
    message = {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text: opts.text,
          buttons: opts.buttons.slice(0, 3).map((b) => ({
            type: "web_url", url: b.url, title: b.title.slice(0, 20),
          })),
        },
      },
    };
  } else {
    message = { text: opts.text };
  }

  return call(`${opts.igUserId}/messages`, {
    method: "POST",
    token,
    body: JSON.stringify({ recipient: { comment_id: opts.commentId }, message }),
  });
}

/**
 * Manda DM direto pra um usuário. Só funciona dentro da janela de 24h desde a
 * última mensagem dele — o toque no botão de postback conta como mensagem, é
 * o que autoriza este envio.
 */
export async function sendDirectMessage(opts: {
  igUserId: string;
  encryptedToken: string;
  recipientId: string;
  text: string;
  buttons?: { title: string; url: string }[];
}): Promise<{ message_id?: string }> {
  const message = opts.buttons?.length
    ? {
        attachment: {
          type: "template",
          payload: {
            template_type: "button",
            text: opts.text,
            buttons: opts.buttons.slice(0, 3).map((b) => ({
              type: "web_url", url: b.url, title: b.title.slice(0, 20),
            })),
          },
        },
      }
    : { text: opts.text };

  return call(`${opts.igUserId}/messages`, {
    method: "POST",
    token: decrypt(opts.encryptedToken),
    body: JSON.stringify({ recipient: { id: opts.recipientId }, message }),
  });
}

/** Resposta pública no próprio comentário ("te mandei no DM 👀"). Opcional. */
export async function replyToComment(opts: {
  encryptedToken: string;
  commentId: string;
  message: string;
}): Promise<{ id: string }> {
  return call(`${opts.commentId}/replies`, {
    method: "POST",
    token: decrypt(opts.encryptedToken),
    body: JSON.stringify({ message: opts.message }),
  });
}

/**
 * Publicação em 2 passos: cria o container, depois publica.
 * Limite ~50 posts / 24h por conta. Mídia precisa de URL PÚBLICA.
 */
export async function publishMedia(opts: {
  igUserId: string;
  encryptedToken: string;
  caption: string;
  mediaUrls: string[];
  mediaType: "image" | "video" | "carousel" | "reel";
}): Promise<{ id: string }> {
  const token = decrypt(opts.encryptedToken);

  let creationId: string;

  if (opts.mediaType === "carousel") {
    const children = await Promise.all(
      opts.mediaUrls.map(async (url) => {
        const c = await call<{ id: string }>(`${opts.igUserId}/media`, {
          method: "POST",
          token,
          body: JSON.stringify({ image_url: url, is_carousel_item: true }),
        });
        // Cada filho tambem precisa terminar de ser baixado pela Meta.
        await waitForContainer(c.id, token, "slide do carrossel");
        return c.id;
      }),
    );
    const container = await call<{ id: string }>(`${opts.igUserId}/media`, {
      method: "POST",
      token,
      body: JSON.stringify({ media_type: "CAROUSEL", children, caption: opts.caption }),
    });
    creationId = container.id;
  } else {
    const isVideo = opts.mediaType === "video" || opts.mediaType === "reel";
    const payload: Record<string, unknown> = { caption: opts.caption };
    if (isVideo) {
      payload.media_type = "REELS";
      payload.video_url = opts.mediaUrls[0];
    } else {
      payload.image_url = opts.mediaUrls[0];
    }
    const container = await call<{ id: string }>(`${opts.igUserId}/media`, {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    });
    creationId = container.id;
  }

  // Vale pra TODOS os tipos, nao so video. A Meta baixa a midia da URL de forma
  // assincrona; publicar antes de FINISHED devolve "Media ID is not available".
  await waitForContainer(creationId, token, "publicacao");

  return call<{ id: string }>(`${opts.igUserId}/media_publish`, {
    method: "POST",
    token,
    body: JSON.stringify({ creation_id: creationId }),
  });
}

async function waitForContainer(
  id: string,
  token: string,
  rotulo: string,
  maxTries = 30,
): Promise<void> {
  for (let i = 0; i < maxTries; i++) {
    const r = await call<{ status_code?: string; status?: string }>(
      `${id}?fields=status_code,status`,
      { method: "GET", token },
    );
    if (r.status_code === "FINISHED") return;
    if (r.status_code === "ERROR") {
      throw new InstagramApiError(`${rotulo}: a Meta rejeitou a midia — ${r.status ?? "sem detalhe"}`);
    }
    // EXPIRED = container passou de 24h sem publicar
    if (r.status_code === "EXPIRED") {
      throw new InstagramApiError(`${rotulo}: container expirou antes de publicar`);
    }
    await new Promise((res) => setTimeout(res, 2000));
  }
  throw new InstagramApiError(
    `${rotulo}: a Meta nao terminou de processar em 60s. Costuma ser URL inacessivel ou formato recusado.`,
  );
}

/** Long-lived token dura 60 dias. Renovar bem antes — o cron cuida disso. */
export async function refreshLongLivedToken(encryptedToken: string): Promise<{
  access_token: string;
  expires_in: number;
}> {
  const token = decrypt(encryptedToken);
  const url = `${BASE}/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url);
  const body = await res.json();
  if (!res.ok || body.error) throw new InstagramApiError(body.error?.message ?? `HTTP ${res.status}`);
  return body;
}

export type IgMedia = {
  id: string;
  caption?: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
};

/** Lista as publicacoes da conta, da mais recente pra mais antiga. */
export async function listMedia(opts: {
  igUserId: string;
  encryptedToken: string;
  limit?: number;
  after?: string;
}): Promise<{ data: IgMedia[]; nextCursor?: string }> {
  const fields = [
    "id", "caption", "media_type", "media_url", "thumbnail_url",
    "permalink", "timestamp", "like_count", "comments_count",
  ].join(",");

  const params = new URLSearchParams({ fields, limit: String(opts.limit ?? 24) });
  if (opts.after) params.set("after", opts.after);

  const r = await call<{ data: IgMedia[]; paging?: { cursors?: { after?: string }; next?: string } }>(
    `${opts.igUserId}/media?${params}`,
    { method: "GET", token: decrypt(opts.encryptedToken) },
  );

  return {
    data: r.data ?? [],
    // so devolve cursor se existe proxima pagina de verdade
    nextCursor: r.paging?.next ? r.paging?.cursors?.after : undefined,
  };
}

/** Data de publicação de uma mídia — usada pelo escopo "próxima publicação". */
export async function getMediaTimestamp(
  mediaId: string,
  encryptedToken: string,
): Promise<Date | null> {
  const r = await call<{ timestamp?: string }>(`${mediaId}?fields=timestamp`, {
    method: "GET",
    token: decrypt(encryptedToken),
  });
  return r.timestamp ? new Date(r.timestamp) : null;
}

/** Extrai o shortcode de qualquer formato de URL do Instagram. */
export function shortcodeDaUrl(url: string): string | null {
  return url.match(/instagram\.com\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/)?.[1] ?? null;
}

export type PostProprio = {
  id: string;
  caption: string;
  permalink: string;
  mediaType: string;
  imagens: string[];
  likes: number;
  comments: number;
  timestamp: string;
};

/**
 * Acha um post DA PRÓPRIA CONTA pela URL e devolve legenda + todas as imagens.
 * Só funciona pros posts do dono do token — a API do Instagram não expõe mídia
 * de terceiros, e é por isso que post de outra pessoa ainda precisa de print.
 */
export async function buscarPostProprio(opts: {
  igUserId: string;
  encryptedToken: string;
  url: string;
  maxPaginas?: number;
}): Promise<PostProprio | null> {
  const shortcode = shortcodeDaUrl(opts.url);
  if (!shortcode) return null;

  const token = decrypt(opts.encryptedToken);
  const fields = [
    "id", "caption", "permalink", "media_type", "media_url", "thumbnail_url",
    "like_count", "comments_count", "timestamp",
    "children{media_url,thumbnail_url,media_type}",
  ].join(",");

  let path: string | null = `${opts.igUserId}/media?fields=${fields}&limit=50`;

  for (let pagina = 0; pagina < (opts.maxPaginas ?? 6) && path; pagina++) {
    const r: {
      data?: Record<string, unknown>[];
      paging?: { cursors?: { after?: string }; next?: string };
    } = await call(path, { method: "GET", token });

    for (const m of r.data ?? []) {
      const permalink = String(m.permalink ?? "");
      if (!permalink.includes(`/${shortcode}`)) continue;

      const filhos = (m.children as { data?: { media_url?: string; thumbnail_url?: string }[] } | undefined)?.data;
      const imagens = filhos?.length
        ? filhos.map((c) => c.thumbnail_url ?? c.media_url ?? "").filter(Boolean)
        : [String(m.thumbnail_url ?? m.media_url ?? "")].filter(Boolean);

      return {
        id: String(m.id),
        caption: String(m.caption ?? ""),
        permalink,
        mediaType: String(m.media_type ?? ""),
        imagens,
        likes: Number(m.like_count ?? 0),
        comments: Number(m.comments_count ?? 0),
        timestamp: String(m.timestamp ?? ""),
      };
    }

    path = r.paging?.next && r.paging.cursors?.after
      ? `${opts.igUserId}/media?fields=${fields}&limit=50&after=${r.paging.cursors.after}`
      : null;
  }

  return null;
}
