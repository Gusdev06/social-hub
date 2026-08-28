/**
 * Conecta UMA conta do Instagram ao Social Hub.
 *
 *   npm run connect:ig -- <ACCESS_TOKEN>
 *
 * O token vem de: Meta App Dashboard → Instagram → API setup with Instagram
 * login → Add an Instagram Account → (loga) → o token aparece ali.
 *
 * O script troca o token curto por um de 60 dias, descobre o user_id/username,
 * cifra e grava. Enquanto não existe o fluxo de OAuth, é assim que se conecta.
 */
import { eq } from "drizzle-orm";
import { db } from "../src/db/index";
import { socialAccounts, workspaces } from "../src/db/schema";
import { encrypt } from "../src/lib/crypto";

const BASE = process.env.IG_GRAPH_BASE ?? "https://graph.instagram.com";
const VERSION = process.env.IG_API_VERSION ?? "v23.0";

async function main() {
  const shortToken = process.argv[2];
  if (!shortToken) {
    console.error("uso: npm run connect:ig -- <ACCESS_TOKEN>");
    process.exit(1);
  }

  // 1. Consegue um token de 60 dias. Dois caminhos, nessa ordem:
  //    a) ig_exchange_token — quando o token recebido ainda e de curta duracao;
  //    b) ig_refresh_token  — quando ele JA e long-lived (o painel da Meta ja
  //       entrega assim). Nesse caso o exchange responde "Session key invalid",
  //       que nao e erro de verdade: so significa "ja trocado".
  let token = shortToken;
  let expiresAt: Date | null = null;

  const secret = encodeURIComponent(process.env.META_APP_SECRET ?? "");
  const exchange = await fetch(
    `${BASE}/access_token?grant_type=ig_exchange_token&client_secret=${secret}` +
      `&access_token=${encodeURIComponent(shortToken)}`,
  ).then((r) => r.json());

  if (exchange.access_token) {
    token = exchange.access_token;
    expiresAt = new Date(Date.now() + exchange.expires_in * 1000);
    console.log("\u2713 token curto trocado por long-lived");
  } else {
    const refreshed = await fetch(
      `${BASE}/refresh_access_token?grant_type=ig_refresh_token` +
        `&access_token=${encodeURIComponent(shortToken)}`,
    ).then((r) => r.json());

    if (refreshed.access_token) {
      token = refreshed.access_token;
      expiresAt = new Date(Date.now() + refreshed.expires_in * 1000);
      console.log("\u2713 token ja era long-lived, renovado");
      if (refreshed.permissions) console.log(`  permissoes: ${refreshed.permissions}`);
    } else {
      console.warn(`! nao foi possivel renovar: ${refreshed.error?.message ?? exchange.error?.message}`);
      console.warn("  seguindo com o token original — a expiracao ficara NULL.");
    }
  }

  if (expiresAt) {
    const dias = Math.round((expiresAt.getTime() - Date.now()) / 86400000);
    console.log(`  expira em ${expiresAt.toISOString().slice(0, 10)} (${dias} dias)`);
  }

  // 2. Descobre quem é a conta.
  const me = await fetch(
    `${BASE}/${VERSION}/me?fields=user_id,username,profile_picture_url&access_token=${encodeURIComponent(token)}`,
  ).then((r) => r.json());

  if (me.error) throw new Error(`falha ao ler /me: ${me.error.message}`);

  const externalId = String(me.user_id ?? me.id);
  console.log(`✓ conta: @${me.username} (${externalId})`);

  // 3. Workspace default (hoje só existe um).
  let ws = await db.query.workspaces.findFirst();
  if (!ws) {
    [ws] = await db.insert(workspaces).values({ name: "Gusta" }).returning();
    console.log("✓ workspace criado");
  }

  // 4. Upsert da conta — rodar de novo com token novo só atualiza.
  await db
    .insert(socialAccounts)
    .values({
      workspaceId: ws!.id,
      platform: "instagram",
      externalId,
      username: me.username,
      avatarUrl: me.profile_picture_url ?? null,
      accessTokenEnc: encrypt(token),
      tokenExpiresAt: expiresAt,
      scopes: [
        "instagram_business_basic",
        "instagram_business_manage_messages",
        "instagram_business_manage_comments",
        "instagram_business_content_publish",
      ],
    })
    .onConflictDoUpdate({
      target: [socialAccounts.platform, socialAccounts.externalId],
      set: {
        username: me.username,
        avatarUrl: me.profile_picture_url ?? null,
        accessTokenEnc: encrypt(token),
        tokenExpiresAt: expiresAt,
        isActive: true,
        updatedAt: new Date(),
      },
    });

  console.log(`\n✅ @${me.username} conectada. Rode 'npm run dev' pra ver no dashboard.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("❌", err.message);
  process.exit(1);
});
