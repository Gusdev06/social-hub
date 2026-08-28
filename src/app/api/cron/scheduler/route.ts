import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { postTargets, scheduledPosts, socialAccounts } from "@/db/schema";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { publishMedia } from "@/lib/instagram";
import { publishPhotos, publishVideo } from "@/lib/tiktok";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_ATTEMPTS = 3;

/**
 * Fan-out: um post lógico vira N publicações, uma por perfil de destino.
 * Cada destino falha de forma isolada — se o TikTok recusar, o Instagram
 * ainda sobe, e só o alvo que falhou é retentado.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) return new NextResponse("não autorizado", { status: 401 });

  const due = await db
    .select()
    .from(scheduledPosts)
    .where(and(eq(scheduledPosts.status, "scheduled"), lte(scheduledPosts.scheduledFor, new Date())))
    .limit(10);

  let published = 0;
  let failed = 0;

  for (const post of due) {
    await db.update(scheduledPosts).set({ status: "publishing" }).where(eq(scheduledPosts.id, post.id));

    const targets = await db
      .select()
      .from(postTargets)
      .where(and(eq(postTargets.scheduledPostId, post.id), inArray(postTargets.status, ["pending"])));

    for (const target of targets) {
      const account = await db.query.socialAccounts.findFirst({
        where: eq(socialAccounts.id, target.accountId),
      });
      if (!account || !account.isActive) {
        await db
          .update(postTargets)
          .set({ status: "failed", lastError: "conta inativa" })
          .where(eq(postTargets.id, target.id));
        failed++;
        continue;
      }

      try {
        await db
          .update(postTargets)
          .set({ status: "publishing", attempts: sql`${postTargets.attempts} + 1` })
          .where(eq(postTargets.id, target.id));

        let externalId: string;

        if (account.platform === "instagram") {
          const r = await publishMedia({
            igUserId: account.externalId,
            encryptedToken: account.accessTokenEnc,
            caption: post.caption,
            mediaUrls: post.mediaUrls,
            mediaType: post.mediaType,
          });
          externalId = r.id;
        } else {
          const isVideo = post.mediaType === "video" || post.mediaType === "reel";
          const r = isVideo
            ? await publishVideo({
                encryptedToken: account.accessTokenEnc,
                videoUrl: post.mediaUrls[0],
                title: post.caption,
                privacyLevel: process.env.TIKTOK_PRIVACY_LEVEL ?? "SELF_ONLY",
              })
            : await publishPhotos({
                encryptedToken: account.accessTokenEnc,
                imageUrls: post.mediaUrls,
                title: post.caption,
                privacyLevel: process.env.TIKTOK_PRIVACY_LEVEL ?? "SELF_ONLY",
              });
          // publish_id: o post é assíncrono no TikTok. Consultar depois em
          // /post/publish/status/fetch/ pra saber se realmente foi ao ar.
          externalId = r.publish_id;
        }

        await db
          .update(postTargets)
          .set({ status: "done", externalPostId: externalId, publishedAt: new Date() })
          .where(eq(postTargets.id, target.id));
        published++;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const exhausted = target.attempts + 1 >= MAX_ATTEMPTS;
        await db
          .update(postTargets)
          .set({ status: exhausted ? "failed" : "pending", lastError: message })
          .where(eq(postTargets.id, target.id));
        if (exhausted) failed++;
      }
    }

    // O post só fecha quando nenhum destino está mais em aberto.
    const remaining = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(postTargets)
      .where(and(eq(postTargets.scheduledPostId, post.id), inArray(postTargets.status, ["pending", "publishing"])));

    if ((remaining[0]?.n ?? 0) === 0) {
      const anyFailed = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(postTargets)
        .where(and(eq(postTargets.scheduledPostId, post.id), eq(postTargets.status, "failed")));
      await db
        .update(scheduledPosts)
        .set({ status: (anyFailed[0]?.n ?? 0) > 0 ? "failed" : "done" })
        .where(eq(scheduledPosts.id, post.id));
    } else {
      await db.update(scheduledPosts).set({ status: "scheduled" }).where(eq(scheduledPosts.id, post.id));
    }
  }

  return NextResponse.json({ posts: due.length, published, failed });
}
