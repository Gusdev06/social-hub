"use server";

import { inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { postTargets, scheduledPosts, socialAccounts } from "@/db/schema";
import { requireDashboardAuth } from "@/lib/auth";
import { publishMedia } from "@/lib/instagram";
import { createSignedUpload, storageConfigured } from "@/lib/storage";

export type PublishState = { ok: boolean; message: string } | null;

export async function publishAction(
  _prev: PublishState,
  form: FormData,
): Promise<PublishState> {
  try {
    await requireDashboardAuth();
  } catch {
    return { ok: false, message: "Não autorizado." };
  }

  const accountIds = form.getAll("contas").map(String).filter(Boolean);
  const caption = String(form.get("caption") ?? "").trim();
  const mediaType = String(form.get("mediaType") ?? "image") as
    | "image" | "video" | "carousel" | "reel";
  const scheduledForRaw = String(form.get("scheduledFor") ?? "").trim();

  const mediaUrls = String(form.get("mediaUrls") ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  if (accountIds.length === 0) return { ok: false, message: "Escolha ao menos uma conta." };
  if (mediaUrls.length === 0) return { ok: false, message: "Informe ao menos uma URL de mídia." };
  if (mediaType === "carousel" && mediaUrls.length < 2) {
    return { ok: false, message: "Carrossel precisa de pelo menos 2 URLs." };
  }
  for (const u of mediaUrls) {
    if (!/^https:\/\//i.test(u)) {
      return { ok: false, message: `URL inválida: ${u} — a API do Instagram só aceita https público.` };
    }
  }

  const accounts = await db
    .select()
    .from(socialAccounts)
    .where(inArray(socialAccounts.id, accountIds));

  if (accounts.length === 0) return { ok: false, message: "Conta não encontrada." };

  const workspaceId = accounts[0].workspaceId;
  const agendar = scheduledForRaw.length > 0;
  const scheduledFor = agendar ? new Date(scheduledForRaw) : new Date();

  if (agendar && Number.isNaN(scheduledFor.getTime())) {
    return { ok: false, message: "Data de agendamento inválida." };
  }

  // Registra o post e os alvos sempre — o historico vale tanto pro agendado
  // quanto pro imediato.
  const [post] = await db
    .insert(scheduledPosts)
    .values({
      workspaceId,
      caption,
      mediaUrls,
      mediaType,
      scheduledFor,
      status: agendar ? "scheduled" : "publishing",
    })
    .returning();

  await db.insert(postTargets).values(
    accounts.map((a) => ({ scheduledPostId: post.id, accountId: a.id })),
  );

  if (agendar) {
    revalidatePath("/");
    return {
      ok: true,
      message: `Agendado para ${scheduledFor.toLocaleString("pt-BR")} em ${accounts.length} perfil(is). O cron publica no horário.`,
    };
  }

  // Publicacao imediata: cada conta falha de forma isolada.
  const ok: string[] = [];
  const falhas: string[] = [];

  for (const a of accounts) {
    const target = await db
      .select()
      .from(postTargets)
      .where(inArray(postTargets.accountId, [a.id]));
    const t = target.find((x) => x.scheduledPostId === post.id);

    try {
      const r = await publishMedia({
        igUserId: a.externalId,
        encryptedToken: a.accessTokenEnc,
        caption,
        mediaUrls,
        mediaType,
      });
      if (t) {
        await db
          .update(postTargets)
          .set({ status: "done", externalPostId: r.id, publishedAt: new Date(), attempts: 1 })
          .where(inArray(postTargets.id, [t.id]));
      }
      ok.push(`@${a.username}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (t) {
        await db
          .update(postTargets)
          .set({ status: "failed", lastError: msg, attempts: 1 })
          .where(inArray(postTargets.id, [t.id]));
      }
      falhas.push(`@${a.username}: ${msg}`);
    }
  }

  await db
    .update(scheduledPosts)
    .set({ status: falhas.length ? "failed" : "done" })
    .where(inArray(scheduledPosts.id, [post.id]));

  revalidatePath("/");
  revalidatePath("/posts");

  if (falhas.length === 0) return { ok: true, message: `Publicado em ${ok.join(", ")}.` };
  if (ok.length === 0) return { ok: false, message: `Falhou. ${falhas.join(" | ")}` };
  return { ok: false, message: `Publicado em ${ok.join(", ")}, mas falhou em — ${falhas.join(" | ")}` };
}

export type SignResult =
  | { ok: true; signedUrl: string; publicUrl: string }
  | { ok: false; message: string };

/**
 * Assina um upload. Só devolve a URL assinada pra quem passou no basic auth —
 * senão qualquer um encheria o bucket.
 */
export async function signUploadAction(fileName: string): Promise<SignResult> {
  try {
    await requireDashboardAuth();
  } catch {
    return { ok: false, message: "Não autorizado." };
  }

  if (!storageConfigured()) {
    return {
      ok: false,
      message: "Upload indisponível: falta SUPABASE_SERVICE_ROLE_KEY no ambiente.",
    };
  }

  try {
    const { signedUrl, publicUrl } = await createSignedUpload(fileName);
    return { ok: true, signedUrl, publicUrl };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}
