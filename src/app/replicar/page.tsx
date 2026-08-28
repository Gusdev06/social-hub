import { eq } from "drizzle-orm";
import { db } from "@/db";
import { socialAccounts } from "@/db/schema";
import { claudeConfigurado } from "@/lib/claude";
import { storageConfigured } from "@/lib/storage";
import { Replicador } from "./replicador";
import { PageDescription, PageHeader, PageShell, PageTitle } from "@/components/page-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const dynamic = "force-dynamic";

export default async function Replicar() {
  const conta = await db.query.socialAccounts.findFirst({
    where: eq(socialAccounts.platform, "instagram"),
  });
  const handle = conta ? `@${conta.username}` : "@gustagoat.ia";

  return (
    <PageShell>
      <PageHeader>
        <PageTitle className="text-xl">Replicar post</PageTitle>
        <PageDescription>
          Manda um post que já performou — de qualquer nicho. Eu extraio a estrutura que
          fez funcionar e transponho pro seu posicionamento.
        </PageDescription>
      </PageHeader>

      {!claudeConfigurado() ? (
        <Alert variant="warning">
          <AlertTitle>Falta a ANTHROPIC_API_KEY</AlertTitle>
          <AlertDescription>
            Pegue em console.anthropic.com → API Keys e coloque no <code>.env.local</code>.
            Sem ela o teardown não roda.
          </AlertDescription>
        </Alert>
      ) : (
        <Replicador uploadOn={storageConfigured()} handle={handle} />
      )}
    </PageShell>
  );
}
