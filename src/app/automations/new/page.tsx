import { eq } from "drizzle-orm";
import { db } from "@/db";
import { socialAccounts } from "@/db/schema";
import { listMedia, type IgMedia } from "@/lib/instagram";
import { Wizard } from "../wizard";

export const dynamic = "force-dynamic";

export default async function NovaAutomacao() {
  const contas = await db
    .select()
    .from(socialAccounts)
    .where(eq(socialAccounts.platform, "instagram"));

  const conta = contas[0];
  if (!conta) {
    return <p className="text-sm text-neutral-500">Conecte uma conta do Instagram primeiro.</p>;
  }

  let media: IgMedia[] = [];
  try {
    const r = await listMedia({
      igUserId: conta.externalId,
      encryptedToken: conta.accessTokenEnc,
      limit: 24,
    });
    media = r.data;
  } catch {
    media = [];
  }

  return (
    <Wizard
      contas={contas.map((c) => ({ id: c.id, username: c.username, avatarUrl: c.avatarUrl }))}
      media={media.map((m) => ({
        id: m.id,
        thumb: m.thumbnail_url ?? m.media_url ?? "",
        caption: m.caption ?? "",
        tipo: m.media_type,
        likes: m.like_count ?? 0,
        comments: m.comments_count ?? 0,
        timestamp: m.timestamp,
      }))}
    />
  );
}
