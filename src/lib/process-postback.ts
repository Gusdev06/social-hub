import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { automations, leads, socialAccounts } from "@/db/schema";
import { sendDirectMessage } from "./instagram";

/**
 * Chamado quando a pessoa toca no botão da mensagem de boas-vindas.
 * O toque abre a janela de 24h — é o que autoriza mandar o link.
 */
export async function processPostback(opts: {
  igUserId: string;
  senderId: string;
  payload: string;
}): Promise<void> {
  if (!opts.payload.startsWith("AUTO:")) return;
  const automationId = opts.payload.slice(5);

  const account = await db.query.socialAccounts.findFirst({
    where: eq(socialAccounts.externalId, opts.igUserId),
  });
  if (!account || !account.isActive) return;

  // Nunca reagir ao próprio eco da conta.
  if (opts.senderId === account.externalId) return;

  const rule = await db.query.automations.findFirst({
    where: eq(automations.id, automationId),
  });
  if (!rule || !rule.isActive || !rule.followUpMessage?.trim()) return;

  await sendDirectMessage({
    igUserId: account.externalId,
    encryptedToken: account.accessTokenEnc,
    recipientId: opts.senderId,
    text: rule.followUpMessage,
    buttons: rule.followUpButtons,
  });

  // clicks alimenta o CTR da lista.
  await db
    .update(automations)
    .set({ clicks: sql`${automations.clicks} + 1` })
    .where(eq(automations.id, rule.id));

  await db
    .insert(leads)
    .values({
      workspaceId: rule.workspaceId,
      accountId: account.id,
      platform: "instagram",
      externalUserId: opts.senderId,
      sourceAutomationId: rule.id,
    })
    .onConflictDoUpdate({
      target: [leads.accountId, leads.externalUserId],
      set: { lastSeenAt: new Date(), touchCount: sql`${leads.touchCount} + 1` },
    });
}
