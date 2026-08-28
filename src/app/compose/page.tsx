import { eq } from "drizzle-orm";
import { db } from "@/db";
import { socialAccounts } from "@/db/schema";
import { storageConfigured } from "@/lib/storage";
import { ComposeForm } from "./form";
import { PageDescription, PageHeader, PageShell, PageTitle } from "@/components/page-shell";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";

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
    <PageShell largura="sm">
      <PageHeader>
        <PageTitle className="text-xl">Novo post</PageTitle>
        <PageDescription>
          Publica ou agenda o mesmo conteúdo em vários perfis de uma vez.
        </PageDescription>
      </PageHeader>

      {accounts.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Nenhuma conta ativa conectada</EmptyTitle>
            <EmptyDescription>Conecte um perfil antes de publicar.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ComposeForm accounts={accounts} uploadEnabled={storageConfigured()} />
      )}
    </PageShell>
  );
}
