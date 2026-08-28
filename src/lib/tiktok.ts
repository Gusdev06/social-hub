import { decrypt } from "./crypto";

const BASE = "https://open.tiktokapis.com/v2";

export class TikTokApiError extends Error {
  constructor(message: string, readonly code?: string) {
    super(message);
    this.name = "TikTokApiError";
  }
}

async function call<T>(path: string, token: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json; charset=UTF-8",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = (await res.json().catch(() => ({}))) as {
    data?: T;
    error?: { code?: string; message?: string };
  };
  if (json.error && json.error.code && json.error.code !== "ok") {
    throw new TikTokApiError(json.error.message ?? "erro do TikTok", json.error.code);
  }
  if (!res.ok) throw new TikTokApiError(`HTTP ${res.status}`);
  return json.data as T;
}

/**
 * OBRIGATÓRIO antes de cada post. A auditoria do TikTok verifica que o app
 * exibe nickname + avatar do criador na tela de publicação. Também devolve as
 * opções de privacidade permitidas e se comentário/duet/stitch estão off.
 */
export async function queryCreatorInfo(encryptedToken: string): Promise<{
  creator_avatar_url: string;
  creator_username: string;
  creator_nickname: string;
  privacy_level_options: string[];
  comment_disabled: boolean;
  max_video_post_duration_sec: number;
}> {
  return call("/post/publish/creator_info/query/", decrypt(encryptedToken));
}

/**
 * Direct Post (scope video.publish). ATENÇÃO: enquanto o app não passar na
 * auditoria, TODO conteúdo publicado fica em visibilidade PRIVADA e o teto é
 * de 5 usuários / 24h. Por isso a auditoria é o caminho crítico do TikTok.
 *
 * Alternativa sem auditoria: scope video.upload, que manda pro inbox do app
 * do usuário pra ele confirmar na mão.
 */
export async function publishVideo(opts: {
  encryptedToken: string;
  videoUrl: string;
  title: string;
  privacyLevel?: string;
  disableComment?: boolean;
}): Promise<{ publish_id: string }> {
  return call("/post/publish/video/init/", decrypt(opts.encryptedToken), {
    post_info: {
      title: opts.title.slice(0, 2200),
      privacy_level: opts.privacyLevel ?? "SELF_ONLY",
      disable_comment: opts.disableComment ?? false,
    },
    // PULL_FROM_URL exige que o domínio esteja verificado no portal do TikTok.
    source_info: { source: "PULL_FROM_URL", video_url: opts.videoUrl },
  });
}

export async function publishPhotos(opts: {
  encryptedToken: string;
  imageUrls: string[];
  title: string;
  description?: string;
  privacyLevel?: string;
}): Promise<{ publish_id: string }> {
  return call("/post/publish/content/init/", decrypt(opts.encryptedToken), {
    media_type: "PHOTO",
    post_mode: "DIRECT_POST",
    post_info: {
      title: opts.title.slice(0, 90),
      description: (opts.description ?? opts.title).slice(0, 4000),
      privacy_level: opts.privacyLevel ?? "SELF_ONLY",
    },
    source_info: { source: "PULL_FROM_URL", photo_images: opts.imageUrls },
  });
}

export async function getPublishStatus(
  encryptedToken: string,
  publishId: string,
): Promise<{ status: string; fail_reason?: string; publicaly_available_post_id?: string[] }> {
  return call("/post/publish/status/fetch/", decrypt(encryptedToken), { publish_id: publishId });
}

/** Access token do TikTok dura 24h — refresh token dura 365 dias. */
export async function refreshToken(encryptedRefreshToken: string): Promise<{
  access_token: string;
  expires_in: number;
  refresh_token: string;
}> {
  const res = await fetch(`${BASE}/oauth/token/`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: decrypt(encryptedRefreshToken),
    }),
  });
  const json = await res.json();
  if (!res.ok || json.error) throw new TikTokApiError(json.error_description ?? `HTTP ${res.status}`);
  return json;
}
