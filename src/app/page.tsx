import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { automations, commentEvents, leads, socialAccounts } from "@/db/schema";

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
    <main className="mx-auto max-w-5xl px-6 py-12 space-y-10">
      <header>
        <h1 className="text-2xl font-semibold">Social Hub</h1>
        <p className="text-neutral-400 text-sm mt-1">
          {accounts.length} perfis · {rules.length} automações ativas
        </p>
      </header>

      <section className="grid grid-cols-3 gap-4">
        <Stat label="Leads capturados" value={leadCount[0]?.n ?? 0} />
        <Stat label="DMs enviados (24h)" value={sentToday[0]?.n ?? 0} />
        <Stat label="Perfis conectados" value={accounts.length} />
      </section>

      <section>
        <h2 className="text-sm uppercase tracking-wide text-neutral-500 mb-3">Perfis</h2>
        <div className="space-y-2">
          {accounts.length === 0 && <Empty>Nenhum perfil conectado ainda.</Empty>}
          {accounts.map((a) => (
            <div key={a.id} className="flex items-center gap-3 rounded-lg border border-neutral-800 p-3">
              {/* avatar + username: requisito duro da auditoria do TikTok */}
              {a.avatarUrl && <img src={a.avatarUrl} alt="" className="size-8 rounded-full" />}
              <span className="font-medium">@{a.username}</span>
              <span className="text-xs text-neutral-500">{a.platform}</span>
              {!a.isActive && <span className="text-xs text-amber-500">inativo</span>}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm uppercase tracking-wide text-neutral-500 mb-3">Comentários recentes</h2>
        <div className="space-y-1">
          {recent.length === 0 && <Empty>Nada recebido ainda — confira o webhook.</Empty>}
          {recent.map((e) => (
            <div key={e.id} className="flex items-center gap-3 rounded border border-neutral-900 px-3 py-2 text-sm">
              <StatusDot status={e.status} />
              <span className="text-neutral-400 shrink-0">@{e.fromUsername ?? e.fromUserId}</span>
              <span className="truncate text-neutral-300">{e.text}</span>
              {e.lastError && <span className="ml-auto shrink-0 text-xs text-neutral-600">{e.lastError}</span>}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-neutral-800 p-4">
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-neutral-500 mt-1">{label}</div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-neutral-600">{children}</p>;
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "sent" ? "bg-emerald-500"
    : status === "failed" ? "bg-red-500"
    : status === "skipped" ? "bg-neutral-600"
    : "bg-amber-500";
  return <span className={`size-2 rounded-full shrink-0 ${color}`} title={status} />;
}
