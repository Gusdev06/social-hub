import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { automations, commentEvents, leads, socialAccounts } from "@/db/schema";
import { PageDescription, PageHeader, PageShell, PageTitle } from "@/components/page-shell";
import { SectionLabel } from "@/components/section-label";
import { StatusDot } from "@/components/status-dot";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const [accounts, rules, recent, leadCount, sentToday] = await Promise.all([
    db.select().from(socialAccounts).orderBy(socialAccounts.platform, socialAccounts.username),
    db.select().from(automations).where(eq(automations.isActive, true)),
    db.select().from(commentEvents).orderBy(desc(commentEvents.receivedAt)).limit(20),
    db.select({ n: sql<number>`count(*)::int` }).from(leads),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(commentEvents)
      .where(sql`${commentEvents.status} = 'sent' and ${commentEvents.processedAt} > now() - interval '24 hours'`),
  ]);

  return (
    <PageShell largura="lg">
      <PageHeader>
        <PageTitle>Painel</PageTitle>
        <PageDescription>
          {accounts.length} perfis conectados · {rules.length} automações no ar
        </PageDescription>
      </PageHeader>

      {/* Números lado a lado separados por fio, não três caixas. Numa tela densa
          a caixa cobra atenção que o número já tem sozinho. */}
      <section className="grid grid-cols-1 divide-y divide-hairline border-b sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <Stat label="Leads capturados" value={leadCount[0]?.n ?? 0} />
        <Stat label="DMs enviados (24h)" value={sentToday[0]?.n ?? 0} />
        <Stat label="Perfis conectados" value={accounts.length} />
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-4">
          <SectionLabel>Perfis</SectionLabel>
          <span data-numeric className="text-xs text-ash">{accounts.length}</span>
        </div>
        {accounts.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>Nenhum perfil conectado ainda</EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="stagger flex flex-col divide-y divide-hairline-soft overflow-hidden rounded-lg border bg-card">
            {accounts.map((a) => (
              <div key={a.id} className="cmd-row rounded-none px-4 py-2.5">
                {/* avatar + username: requisito duro da auditoria do TikTok */}
                <Avatar className="size-6">
                  <AvatarImage src={a.avatarUrl ?? undefined} alt="" />
                  <AvatarFallback className="text-[10px]">
                    {a.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate font-medium">@{a.username}</span>
                <span className="text-xs text-ash">{a.platform}</span>
                {!a.isActive && (
                  <Badge variant="outline" className="ml-auto text-ash">
                    inativo
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-4">
          <SectionLabel>Comentários recentes</SectionLabel>
          <span data-numeric className="text-xs text-ash">últimos {recent.length}</span>
        </div>
        {recent.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>Nada recebido ainda — confira o webhook</EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="stagger flex flex-col divide-y divide-hairline-soft overflow-hidden rounded-lg border bg-card">
            {recent.map((e) => (
              <div key={e.id} className="cmd-row rounded-none px-4 py-2.5 text-muted-foreground">
                <StatusDot status={e.status} />
                <span className="shrink-0 text-foreground">
                  @{e.fromUsername ?? e.fromUserId}
                </span>
                <span className="truncate">{e.text}</span>
                {e.lastError && (
                  <span
                    className={cn(
                      "ml-auto shrink-0 text-xs",
                      e.status === "failed" ? "text-accent-red" : "text-ash",
                    )}
                  >
                    {e.lastError}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </PageShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-0.5 px-1 py-4 sm:px-5 sm:first:pl-1">
      <span data-numeric className="text-2xl font-medium tracking-tight">
        {value}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
