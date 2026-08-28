import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { automations, commentEvents, leads, socialAccounts } from "@/db/schema";
import { matchesKeywords } from "./matcher";
import { InstagramApiError, getMediaTimestamp, replyToComment, sendPrivateReply } from "./instagram";

/** A janela de private reply do IG é de 7 dias a partir do comentário. */
const PRIVATE_REPLY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_ATTEMPTS = 3;

/**
 * Processa UM comentário. Seguro pra rodar em paralelo com ele mesmo: o claim
 * é um UPDATE condicional em status, então só um worker pega cada evento.
 */
export async function processCommentEvent(eventId: string): Promise<void> {
  const claimed = await db
    .update(commentEvents)
    .set({ status: "processing", attempts: sql`${commentEvents.attempts} + 1` })
    .where(and(eq(commentEvents.id, eventId), eq(commentEvents.status, "pending")))
    .returning();

  const event = claimed[0];
  if (!event) return; // outro worker já pegou, ou não está mais pendente

  const finish = (
    status: "sent" | "skipped" | "failed",
    extra: { automationId?: string; lastError?: string } = {},
  ) =>
    db
      .update(commentEvents)
      .set({ status, processedAt: new Date(), ...extra })
      .where(eq(commentEvents.id, event.id));

  try {
    if (Date.now() - event.receivedAt.getTime() > PRIVATE_REPLY_WINDOW_MS) {
      await finish("skipped", { lastError: "fora da janela de 7 dias do private reply" });
      return;
    }

    const account = await db.query.socialAccounts.findFirst({
      where: eq(socialAccounts.id, event.accountId),
    });
    if (!account || !account.isActive) {
      await finish("skipped", { lastError: "conta inativa ou inexistente" });
      return;
    }

    // Nunca responder a si mesmo — senão a automação entra em loop com as
    // próprias respostas públicas.
    if (event.fromUserId === account.externalId) {
      await finish("skipped", { lastError: "comentário do próprio dono da conta" });
      return;
    }

    const todas = await db
      .select()
      .from(automations)
      .where(and(eq(automations.accountId, account.id), eq(automations.isActive, true)));

    // "next" só vale pra posts publicados depois que a regra foi criada — e isso
    // depende da data do POST, não do comentário. Só busca se for necessário.
    let postagemEm: Date | null = null;
    if (todas.some((a) => a.triggerScope === "next")) {
      postagemEm = await getMediaTimestamp(event.mediaId, account.accessTokenEnc).catch(() => null);
    }

    const noEscopo = todas.filter((a) => {
      if (a.triggerScope === "any") return true;
      if (a.triggerScope === "next") {
        if (!a.activeFrom || !postagemEm) return false;
        return postagemEm.getTime() >= a.activeFrom.getTime();
      }
      const alvos = a.mediaIds.length ? a.mediaIds : a.mediaId ? [a.mediaId] : [];
      return alvos.includes(event.mediaId);
    });

    // Mais específico ganha: post escolhido > próximos posts > qualquer post.
    const peso = { specific: 0, next: 1, any: 2 } as const;
    noEscopo.sort((a, b) => peso[a.triggerScope] - peso[b.triggerScope]);

    // keywords vazio = "qualquer palavra"
    const rule = noEscopo.find(
      (a) => a.keywords.length === 0 || matchesKeywords(event.text, a.keywords, a.matchMode),
    );
    if (!rule) {
      await finish("skipped", { lastError: "nenhuma automação casou" });
      return;
    }

    // Com followUpMessage, o botão é POSTBACK: o toque vira webhook e libera o
    // segundo DM (o do link). Sem ele, manda os botões de link direto.
    const doisPassos = Boolean(rule.followUpMessage?.trim());
    await sendPrivateReply({
      igUserId: account.externalId,
      encryptedToken: account.accessTokenEnc,
      commentId: event.commentId,
      text: rule.dmMessage,
      ...(doisPassos
        ? { postbackButton: { title: rule.welcomeButtonLabel, payload: `AUTO:${rule.id}` } }
        : { buttons: rule.dmButtons }),
    });

    await db
      .update(automations)
      .set({ executions: sql`${automations.executions} + 1` })
      .where(eq(automations.id, rule.id));

    // O contato capturado é o ativo real — grava antes de qualquer coisa opcional.
    await db
      .insert(leads)
      .values({
        workspaceId: rule.workspaceId,
        accountId: account.id,
        platform: "instagram",
        externalUserId: event.fromUserId,
        username: event.fromUsername,
        sourceAutomationId: rule.id,
        sourceMediaId: event.mediaId,
      })
      .onConflictDoUpdate({
        target: [leads.accountId, leads.externalUserId],
        set: {
          lastSeenAt: new Date(),
          touchCount: sql`${leads.touchCount} + 1`,
          username: event.fromUsername ?? sql`${leads.username}`,
        },
      });

    // Resposta pública é best-effort: se falhar, o DM já foi e isso é o que importa.
    if (rule.publicReply) {
      await replyToComment({
        encryptedToken: account.accessTokenEnc,
        commentId: event.commentId,
        message: rule.publicReply,
      }).catch(() => undefined);
    }

    await finish("sent", { automationId: rule.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    // 2534014 = já existe um private reply pra esse comentário. Não é falha:
    // é a confirmação de que a mensagem saiu (provavelmente num retry).
    if (err instanceof InstagramApiError && err.subcode === 2534014) {
      await finish("sent", { lastError: "private reply já existia (subcode 2534014)" });
      return;
    }

    if (event.attempts >= MAX_ATTEMPTS) {
      await finish("failed", { lastError: message });
      return;
    }
    // Volta pra pending: o cron de sweep tenta de novo.
    await db
      .update(commentEvents)
      .set({ status: "pending", lastError: message })
      .where(eq(commentEvents.id, event.id));
  }
}
