import { NextRequest, NextResponse } from "next/server";
import { and, eq, lt } from "drizzle-orm";
import { db } from "@/db";
import { commentEvents } from "@/db/schema";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { processCommentEvent } from "@/lib/process-comment";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Rede de segurança: pega eventos que ficaram pendentes ou travaram. */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) return new NextResponse("não autorizado", { status: 401 });

  const stuckBefore = new Date(Date.now() - 5 * 60 * 1000);

  // Reabre os que ficaram presos em "processing" (worker morreu no meio).
  await db
    .update(commentEvents)
    .set({ status: "pending" })
    .where(and(eq(commentEvents.status, "processing"), lt(commentEvents.receivedAt, stuckBefore)));

  const pending = await db
    .select({ id: commentEvents.id })
    .from(commentEvents)
    .where(eq(commentEvents.status, "pending"))
    .limit(100);

  for (const e of pending) await processCommentEvent(e.id).catch(() => undefined);

  return NextResponse.json({ processed: pending.length });
}
