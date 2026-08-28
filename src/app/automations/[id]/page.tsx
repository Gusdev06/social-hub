import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { automations, socialAccounts } from "@/db/schema";
import { listMedia, type IgMedia } from "@/lib/instagram";
import { Wizard } from "../wizard";
import { PageDescription, PageHeader, PageShell, PageTitle } from "@/components/page-shell";

export const dynamic = "force-dynamic";

export default async function EditarAutomacao({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const regra = await db.query.automations.findFirst({ where: eq(automations.id, id) });
  if (!regra) notFound();

  const contas = await db
    .select()
    .from(socialAccounts)
    .where(eq(socialAccounts.platform, "instagram"));

  const conta = contas.find((c) => c.id === regra.accountId) ?? contas[0];
  if (!conta) notFound();

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

  // Regras antigas guardavam um único mediaId; normaliza pro formato de lista.
  const mediaIds = regra.mediaIds.length
    ? regra.mediaIds
    : regra.mediaId ? [regra.mediaId] : [];

  return (
    <PageShell largura="lg">
      <PageHeader>
        <PageTitle>Editar automação</PageTitle>
        <PageDescription>As mudanças valem para os próximos comentários.</PageDescription>
      </PageHeader>
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
      inicial={{
        id: regra.id,
        name: regra.name,
        accountId: regra.accountId,
        triggerScope: regra.triggerScope,
        mediaIds,
        keywords: regra.keywords,
        publicReply: regra.publicReply,
        replyToComments: regra.replyToComments,
        dmMessage: regra.dmMessage,
        welcomeButtonLabel: regra.welcomeButtonLabel,
        followUpMessage: regra.followUpMessage,
        followUpButtons: regra.followUpButtons,
      }}
    />
    </PageShell>
  );
}
