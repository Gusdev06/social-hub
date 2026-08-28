import { eq } from "drizzle-orm";
import { db } from "@/db";
import { socialAccounts } from "@/db/schema";
import { storageConfigured } from "@/lib/storage";
import { ComposeForm } from "./form";

export const dynamic = "force-dynamic";

export default async function Compose() {
  const accounts = await db
    .select({
      id: socialAccounts.id,
      username: socialAccounts.username,
      platform: socialAccounts.platform,
      avatarUrl: socialAccounts.avatarUrl,
    })
    .from(socialAccounts)
    .where(eq(socialAccounts.isActive, true));

  return (
    <main className="mx-auto max-w-xl px-6 py-12 space-y-8">
      <header>
        <h1 className="text-xl font-semibold">Novo post</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Publica ou agenda o mesmo conteúdo em vários perfis de uma vez.
        </p>
      </header>

      {accounts.length === 0 ? (
        <p className="text-sm text-neutral-600">Nenhuma conta ativa conectada.</p>
      ) : (
        <ComposeForm accounts={accounts} uploadEnabled={storageConfigured()} />
      )}
    </main>
  );
}
