"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { automations, socialAccounts } from "@/db/schema";
import { requireDashboardAuth } from "@/lib/auth";

export type SaveState = { ok: boolean; message: string } | null;

type Link = { title: string; url: string };

function parseKeywords(raw: string): string[] {
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

export async function saveAutomation(
  _prev: SaveState,
  form: FormData,
): Promise<SaveState> {
  try {
    await requireDashboardAuth();
  } catch {
    return { ok: false, message: "Não autorizado." };
  }

  const id = String(form.get("id") ?? "").trim();
  const accountId = String(form.get("accountId") ?? "").trim();
  const name = String(form.get("name") ?? "").trim() || "Automação sem nome";
  const triggerScope = String(form.get("triggerScope") ?? "specific") as
    | "specific" | "any" | "next";
  const mediaIds = JSON.parse(String(form.get("mediaIds") ?? "[]")) as string[];
  const keywordMode = String(form.get("keywordMode") ?? "specific");
  const keywords = keywordMode === "any" ? [] : parseKeywords(String(form.get("keywords") ?? ""));
  const replyToComments = form.get("replyToComments") === "on";
  const publicReply = String(form.get("publicReply") ?? "").trim() || null;
  const dmMessage = String(form.get("dmMessage") ?? "").trim();
  const welcomeButtonLabel = String(form.get("welcomeButtonLabel") ?? "").trim() || "Me envie o link";
  const followUpMessage = String(form.get("followUpMessage") ?? "").trim() || null;
  const followUpButtons = JSON.parse(String(form.get("followUpButtons") ?? "[]")) as Link[];
  const isActive = form.get("isActive") === "on";

  if (!accountId) return { ok: false, message: "Escolha uma conta." };
  if (!dmMessage) return { ok: false, message: "A mensagem de boas-vindas não pode ficar vazia." };
  if (keywordMode === "specific" && keywords.length === 0) {
    return { ok: false, message: "Informe ao menos uma palavra-chave (separe por vírgula)." };
  }
  if (triggerScope === "specific" && mediaIds.length === 0) {
    return { ok: false, message: "Selecione ao menos uma publicação." };
  }
  for (const b of followUpButtons) {
    if (!/^https?:\/\//i.test(b.url)) {
      return { ok: false, message: `Link inválido no botão "${b.title}".` };
    }
  }

  const acc = await db.query.socialAccounts.findFirst({
    where: eq(socialAccounts.id, accountId),
  });
  if (!acc) return { ok: false, message: "Conta não encontrada." };

  const dados = {
    workspaceId: acc.workspaceId,
    accountId: acc.id,
    name,
    triggerScope,
    mediaIds: triggerScope === "specific" ? mediaIds : [],
    mediaId: triggerScope === "specific" && mediaIds.length === 1 ? mediaIds[0] : null,
    activeFrom: triggerScope === "next" ? new Date() : null,
    keywords,
    matchMode: "contains" as const,
    dmMessage,
    welcomeButtonLabel,
    followUpMessage,
    followUpButtons,
    publicReply,
    replyToComments,
    isActive,
  };

  if (id) {
    await db.update(automations).set(dados).where(eq(automations.id, id));
  } else {
    await db.insert(automations).values(dados);
  }

  revalidatePath("/automations");
  redirect("/automations");
}

export async function toggleAutomation(id: string, ativar: boolean): Promise<void> {
  await requireDashboardAuth();
  await db.update(automations).set({ isActive: ativar }).where(eq(automations.id, id));
  revalidatePath("/automations");
}

export async function deleteAutomations(ids: string[]): Promise<void> {
  await requireDashboardAuth();
  if (!ids.length) return;
  await db.delete(automations).where(inArray(automations.id, ids));
  revalidatePath("/automations");
}
