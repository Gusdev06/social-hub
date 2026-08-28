import { NextRequest, NextResponse, after } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { commentEvents, socialAccounts } from "@/db/schema";
import { verifyMetaSignature } from "@/lib/crypto";
import { processCommentEvent } from "@/lib/process-comment";
import { processPostback } from "@/lib/process-postback";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Handshake de verificação do webhook (a Meta chama uma vez, no cadastro). */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  if (
    p.get("hub.mode") === "subscribe" &&
    p.get("hub.verify_token") === process.env.META_WEBHOOK_VERIFY_TOKEN
  ) {
    return new NextResponse(p.get("hub.challenge") ?? "", { status: 200 });
  }
  return new NextResponse("forbidden", { status: 403 });
}

/**
 * Regra de ouro: responder 200 RÁPIDO. A Meta desativa a subscription se o
 * endpoint demora ou falha seguidamente. Então: valida, grava, responde — e só
 * DEPOIS da resposta processa, via after().
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();

  if (!verifyMetaSignature(raw, req.headers.get("x-hub-signature-256"))) {
    return new NextResponse("assinatura inválida", { status: 401 });
  }

  let payload: InstagramWebhookPayload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new NextResponse("json inválido", { status: 400 });
  }

  const queuedIds: string[] = [];
  const postbacks: { igUserId: string; senderId: string; payload: string }[] = [];

  for (const entry of payload.entry ?? []) {
    const account = await db.query.socialAccounts.findFirst({
      where: eq(socialAccounts.externalId, entry.id),
    });
    if (!account) continue;

    // Toques em botão chegam em `messaging`, não em `changes`.
    for (const m of entry.messaging ?? []) {
      const payload = m.postback?.payload;
      if (payload && m.sender?.id) {
        postbacks.push({ igUserId: entry.id, senderId: m.sender.id, payload });
      }
    }

    for (const change of entry.changes ?? []) {
      if (change.field !== "comments") continue;
      const v = change.value;
      if (!v?.id || !v.media?.id || !v.from?.id) continue;

      // commentId é UNIQUE: se a Meta reentregar o mesmo evento (ela reentrega),
      // o insert simplesmente não faz nada e não geramos DM duplicado.
      const inserted = await db
        .insert(commentEvents)
        .values({
          accountId: account.id,
          commentId: v.id,
          mediaId: v.media.id,
          fromUserId: v.from.id,
          fromUsername: v.from.username ?? null,
          text: v.text ?? "",
        })
        .onConflictDoNothing({ target: commentEvents.commentId })
        .returning({ id: commentEvents.id });

      if (inserted[0]) queuedIds.push(inserted[0].id);
    }
  }

  // Processa depois de responder. Se o processo morrer aqui, o evento continua
  // "pending" no banco e o cron de sweep recupera.
  after(async () => {
    for (const id of queuedIds) {
      await processCommentEvent(id).catch(() => undefined);
    }
    for (const p of postbacks) {
      await processPostback(p).catch(() => undefined);
    }
  });

  return NextResponse.json({ received: queuedIds.length + postbacks.length });
}

type InstagramWebhookPayload = {
  object?: string;
  entry?: {
    id: string;
    time?: number;
    messaging?: {
      sender?: { id?: string };
      recipient?: { id?: string };
      postback?: { payload?: string; title?: string; mid?: string };
    }[];
    changes?: {
      field: string;
      value?: {
        id?: string;
        text?: string;
        media?: { id?: string };
        from?: { id?: string; username?: string };
      };
    }[];
  }[];
};
