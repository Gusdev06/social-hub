import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull, lt, or } from "drizzle-orm";
import { db } from "@/db";
import { socialAccounts } from "@/db/schema";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { encrypt } from "@/lib/crypto";
import { refreshLongLivedToken } from "@/lib/instagram";
import { refreshToken as refreshTikTok } from "@/lib/tiktok";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * IG: long-lived token dura 60 dias — renovamos com 10 dias de folga.
 * TikTok: access token dura 24h — renovamos sempre que faltar < 6h.
 * Token expirado é a causa nº1 de automação que "para do nada".
 */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) return new NextResponse("não autorizado", { status: 401 });

  const results: { account: string; ok: boolean; error?: string }[] = [];

  const igThreshold = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
  const igAccounts = await db
    .select()
    .from(socialAccounts)
    .where(
      and(
        eq(socialAccounts.platform, "instagram"),
        eq(socialAccounts.isActive, true),
        // NULL = conta gravada sem troca por long-lived. Sem o isNull ela ficaria
        // invisivel pro cron e o token morreria em silencio.
        or(isNull(socialAccounts.tokenExpiresAt), lt(socialAccounts.tokenExpiresAt, igThreshold)),
      ),
    );

  for (const acc of igAccounts) {
    try {
      const r = await refreshLongLivedToken(acc.accessTokenEnc);
      await db
        .update(socialAccounts)
        .set({
          accessTokenEnc: encrypt(r.access_token),
          tokenExpiresAt: new Date(Date.now() + r.expires_in * 1000),
          updatedAt: new Date(),
        })
        .where(eq(socialAccounts.id, acc.id));
      results.push({ account: acc.username, ok: true });
    } catch (err) {
      results.push({ account: acc.username, ok: false, error: (err as Error).message });
    }
  }

  const ttThreshold = new Date(Date.now() + 6 * 60 * 60 * 1000);
  const ttAccounts = await db
    .select()
    .from(socialAccounts)
    .where(
      and(
        eq(socialAccounts.platform, "tiktok"),
        eq(socialAccounts.isActive, true),
        or(isNull(socialAccounts.tokenExpiresAt), lt(socialAccounts.tokenExpiresAt, ttThreshold)),
      ),
    );

  for (const acc of ttAccounts) {
    try {
      if (!acc.refreshTokenEnc) throw new Error("sem refresh token");
      const r = await refreshTikTok(acc.refreshTokenEnc);
      await db
        .update(socialAccounts)
        .set({
          accessTokenEnc: encrypt(r.access_token),
          refreshTokenEnc: encrypt(r.refresh_token),
          tokenExpiresAt: new Date(Date.now() + r.expires_in * 1000),
          updatedAt: new Date(),
        })
        .where(eq(socialAccounts.id, acc.id));
      results.push({ account: acc.username, ok: true });
    } catch (err) {
      results.push({ account: acc.username, ok: false, error: (err as Error).message });
    }
  }

  return NextResponse.json({ refreshed: results });
}
