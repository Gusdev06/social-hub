import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { automations, commentEvents, leads, socialAccounts } from "@/db/schema";
import { PageDescription, PageHeader, PageShell, PageTitle } from "@/components/page-shell";
import { SectionLabel } from "@/components/section-label";
import { StatusDot } from "@/components/status-dot";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Item, ItemContent, ItemMedia, ItemTitle } from "@/components/ui/item";

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
    <PageShell className="gap-10 py-12">
      <PageHeader>
        <PageTitle>Social Hub</PageTitle>
        <PageDescription>
          {accounts.length} perfis · {rules.length} automações ativas
        </PageDescription>
      </PageHeader>

      <section className="grid grid-cols-3 gap-4">
        <Stat label="Leads capturados" value={leadCount[0]?.n ?? 0} />
        <Stat label="DMs enviados (24h)" value={sentToday[0]?.n ?? 0} />
        <Stat label="Perfis conectados" value={accounts.length} />
      </section>

      <section className="flex flex-col gap-3">
        <SectionLabel>Perfis</SectionLabel>
        {accounts.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>Nenhum perfil conectado ainda</EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="flex flex-col gap-2">
            {accounts.map((a) => (
              <Item key={a.id} variant="outline">
                {/* avatar + username: requisito duro da auditoria do TikTok */}
                <ItemMedia>
                  <Avatar className="size-8">
                    <AvatarImage src={a.avatarUrl ?? undefined} alt="" />
                    <AvatarFallback>{a.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>@{a.username}</ItemTitle>
                </ItemContent>
                <Badge variant="outline">{a.platform}</Badge>
                {!a.isActive && <Badge variant="secondary">inativo</Badge>}
              </Item>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <SectionLabel>Comentários recentes</SectionLabel>
        {recent.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>Nada recebido ainda — confira o webhook</EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="flex flex-col gap-1">
            {recent.map((e) => (
              <div key={e.id} className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm">
                <StatusDot status={e.status} />
                <span className="shrink-0 text-muted-foreground">
                  @{e.fromUsername ?? e.fromUserId}
                </span>
                <span className="truncate">{e.text}</span>
                {e.lastError && (
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">{e.lastError}</span>
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
    <Card>
      <CardContent className="flex flex-col gap-1">
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
        <CardDescription className="text-xs">{label}</CardDescription>
      </CardContent>
    </Card>
  );
}
