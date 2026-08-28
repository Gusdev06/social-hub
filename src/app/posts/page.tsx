import { eq } from "drizzle-orm";
import { db } from "@/db";
import { socialAccounts } from "@/db/schema";
import { listMedia, type IgMedia } from "@/lib/instagram";

export const dynamic = "force-dynamic";

export default async function Posts({
  searchParams,
}: {
  searchParams: Promise<{ conta?: string; after?: string }>;
}) {
  const sp = await searchParams;

  const accounts = await db
    .select()
    .from(socialAccounts)
    .where(eq(socialAccounts.platform, "instagram"));

  const active = accounts.find((a) => a.id === sp.conta) ?? accounts[0];

  if (!active) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-12">
        <p className="text-sm text-neutral-500">Nenhuma conta do Instagram conectada.</p>
      </main>
    );
  }

  let media: IgMedia[] = [];
  let nextCursor: string | undefined;
  let erro: string | null = null;

  try {
    const r = await listMedia({
      igUserId: active.externalId,
      encryptedToken: active.accessTokenEnc,
      limit: 24,
      after: sp.after,
    });
    media = r.data;
    nextCursor = r.nextCursor;
  } catch (e) {
    erro = e instanceof Error ? e.message : String(e);
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-12 space-y-8">
      <header className="flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Publicações</h1>
          <p className="text-sm text-neutral-500 mt-1">@{active.username}</p>
        </div>
        {accounts.length > 1 && (
          <div className="flex gap-2 text-sm">
            {accounts.map((a) => (
              <a
                key={a.id}
                href={`/posts?conta=${a.id}`}
                className={`rounded px-2 py-1 border ${
                  a.id === active.id
                    ? "border-neutral-600 text-neutral-100"
                    : "border-neutral-800 text-neutral-500"
                }`}
              >
                @{a.username}
              </a>
            ))}
          </div>
        )}
      </header>

      {erro && (
        <div className="rounded-lg border border-red-900/60 bg-red-950/30 p-4 text-sm">
          <p className="font-medium text-red-300">Não deu pra carregar as publicações</p>
          <p className="text-neutral-400 mt-1">{erro}</p>
          <p className="text-neutral-500 mt-2 text-xs">
            Se falar em token, rode <code>npm run connect:ig</code> com um token novo.
          </p>
        </div>
      )}

      {!erro && media.length === 0 && (
        <p className="text-sm text-neutral-600">Nenhuma publicação encontrada.</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {media.map((m) => (
          <a
            key={m.id}
            href={m.permalink}
            target="_blank"
            rel="noreferrer"
            className="group rounded-lg overflow-hidden border border-neutral-900 hover:border-neutral-700 transition"
          >
            <div className="aspect-square bg-neutral-900 relative">
              {/* video usa thumbnail_url; imagem e carrossel usam media_url */}
              <img
                src={m.thumbnail_url ?? m.media_url}
                alt=""
                className="size-full object-cover"
                loading="lazy"
              />
              {m.media_type !== "IMAGE" && (
                <span className="absolute top-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-neutral-200">
                  {m.media_type === "VIDEO" ? "vídeo" : "carrossel"}
                </span>
              )}
            </div>
            <div className="p-2 space-y-1">
              <p className="text-[11px] text-neutral-500 tabular-nums">
                {new Date(m.timestamp).toLocaleDateString("pt-BR")}
                {typeof m.like_count === "number" && <> · {m.like_count} curtidas</>}
                {typeof m.comments_count === "number" && <> · {m.comments_count} coment.</>}
              </p>
              <p className="text-xs text-neutral-400 line-clamp-2 leading-snug">
                {m.caption ?? <span className="text-neutral-700">sem legenda</span>}
              </p>
            </div>
          </a>
        ))}
      </div>

      {nextCursor && (
        <a
          href={`/posts?conta=${active.id}&after=${nextCursor}`}
          className="inline-block rounded border border-neutral-800 px-3 py-1.5 text-sm text-neutral-300 hover:border-neutral-600"
        >
          Carregar mais
        </a>
      )}
    </main>
  );
}
