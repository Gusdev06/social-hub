import { eq } from "drizzle-orm";
import { db } from "@/db";
import { socialAccounts } from "@/db/schema";
import { claudeConfigurado } from "@/lib/claude";
import { storageConfigured } from "@/lib/storage";
import { Replicador } from "./replicador";

export const dynamic = "force-dynamic";

export default async function Replicar() {
  const conta = await db.query.socialAccounts.findFirst({
    where: eq(socialAccounts.platform, "instagram"),
  });
  const handle = conta ? `@${conta.username}` : "@gustagoat.ia";

  return (
    <main className="mx-auto max-w-5xl px-6 py-12 space-y-8">
      <header>
        <h1 className="text-xl font-semibold">Replicar post</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Manda um post que já performou — de qualquer nicho. Eu extraio a estrutura que
          fez funcionar e transponho pro seu posicionamento.
        </p>
      </header>

      {!claudeConfigurado() ? (
        <div className="rounded-lg border border-amber-900/60 bg-amber-950/20 p-4 text-sm">
          <p className="font-medium text-amber-300">Falta a ANTHROPIC_API_KEY</p>
          <p className="mt-1 text-neutral-400">
            Pegue em console.anthropic.com → API Keys e coloque no <code>.env.local</code>.
            Sem ela o teardown não roda.
          </p>
        </div>
      ) : (
        <Replicador uploadOn={storageConfigured()} handle={handle} />
      )}
    </main>
  );
}
