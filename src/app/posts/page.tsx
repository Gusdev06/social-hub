import { eq } from "drizzle-orm";
import { db } from "@/db";
import { socialAccounts } from "@/db/schema";
import { listMedia, type IgMedia } from "@/lib/instagram";
import { PageDescription, PageHeader, PageShell, PageTitle } from "@/components/page-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";

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
      <PageShell>
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Nenhuma conta do Instagram conectada</EmptyTitle>
            <EmptyDescription>
              Rode <code>npm run connect:ig</code> para conectar um perfil.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </PageShell>
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
    <PageShell>
      <PageHeader className="flex-row items-baseline justify-between gap-4">
        <div className="flex flex-col gap-1">
          <PageTitle className="text-xl">Publicações</PageTitle>
          <PageDescription>@{active.username}</PageDescription>
        </div>
        {accounts.length > 1 && (
          <div className="flex gap-2">
            {accounts.map((a) => (
              <Button
                key={a.id}
                size="sm"
                variant={a.id === active.id ? "secondary" : "outline"}
                render={<a href={`/posts?conta=${a.id}`} />}
                nativeButton={false}
              >
                @{a.username}
              </Button>
            ))}
          </div>
        )}
      </PageHeader>

      {erro && (
        <Alert variant="destructive">
          <AlertTitle>Não deu pra carregar as publicações</AlertTitle>
          <AlertDescription>
            <p>{erro}</p>
            <p>
              Se falar em token, rode <code>npm run connect:ig</code> com um token novo.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {!erro && media.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Nenhuma publicação encontrada</EmptyTitle>
          </EmptyHeader>
        </Empty>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {media.map((m) => (
          <a key={m.id} href={m.permalink} target="_blank" rel="noreferrer" className="group">
            <Card className="gap-0 overflow-hidden p-0 transition-colors group-hover:border-ring">
              <AspectRatio ratio={1} className="relative bg-muted">
                {/* video usa thumbnail_url; imagem e carrossel usam media_url */}
                <img
                  src={m.thumbnail_url ?? m.media_url}
                  alt=""
                  className="size-full object-cover"
                  loading="lazy"
                />
                {m.media_type !== "IMAGE" && (
                  <Badge variant="secondary" className="absolute top-2 right-2">
                    {m.media_type === "VIDEO" ? "vídeo" : "carrossel"}
                  </Badge>
                )}
              </AspectRatio>
              <div className="flex flex-col gap-1 p-2">
                <p className="text-[11px] tabular-nums text-muted-foreground">
                  {new Date(m.timestamp).toLocaleDateString("pt-BR")}
                  {typeof m.like_count === "number" && <> · {m.like_count} curtidas</>}
                  {typeof m.comments_count === "number" && <> · {m.comments_count} coment.</>}
                </p>
                <p className="line-clamp-2 text-xs leading-snug">
                  {m.caption ?? <span className="text-muted-foreground">sem legenda</span>}
                </p>
              </div>
            </Card>
          </a>
        ))}
      </div>

      {nextCursor && (
        <Button
          variant="outline"
          className="self-start"
          render={<a href={`/posts?conta=${active.id}&after=${nextCursor}`} />}
          nativeButton={false}
        >
          Carregar mais
        </Button>
      )}
    </PageShell>
  );
}
