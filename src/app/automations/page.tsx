import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { automations, socialAccounts } from "@/db/schema";
import { AutomationRows } from "./rows";

export const dynamic = "force-dynamic";

export default async function Automations({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string }>;
}) {
  const sp = await searchParams;

  const linhas = await db
    .select({
      id: automations.id,
      name: automations.name,
      isActive: automations.isActive,
      keywords: automations.keywords,
      triggerScope: automations.triggerScope,
      mediaIds: automations.mediaIds,
      executions: automations.executions,
      clicks: automations.clicks,
      createdAt: automations.createdAt,
      username: socialAccounts.username,
    })
    .from(automations)
    .innerJoin(socialAccounts, eq(automations.accountId, socialAccounts.id))
    .orderBy(desc(automations.createdAt));

  const filtradas = linhas.filter((a) => {
    if (sp.q && !a.name.toLowerCase().includes(sp.q.toLowerCase())) return false;
    if (sp.estado === "live" && !a.isActive) return false;
    if (sp.estado === "pausada" && a.isActive) return false;
    return true;
  });

  return (
    <main className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-2xl font-semibold">Minhas automações</h2>
        <Link
          href="/automations/new"
          className="shrink-0 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-500"
        >
          + Nova Automação
        </Link>
      </div>

      <form className="flex flex-wrap gap-3">
        <input
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="Pesquisar todas as automações"
          className="w-64 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
        />
        <select
          name="estado"
          defaultValue={sp.estado ?? ""}
          className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
        >
          <option value="">Estados variados do gatilho</option>
          <option value="live">Somente LIVE</option>
          <option value="pausada">Somente pausadas</option>
        </select>
        <button className="rounded-lg border border-neutral-800 px-3 py-2 text-sm text-neutral-300 hover:border-neutral-600">
          Filtrar
        </button>
      </form>

      {filtradas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-800 py-16 text-center">
          <p className="text-sm text-neutral-500">Nenhuma automação ainda.</p>
          <Link href="/automations/new" className="mt-2 inline-block text-sm text-blue-400 hover:underline">
            Criar a primeira
          </Link>
        </div>
      ) : (
        <AutomationRows linhas={filtradas.map((a) => ({
          ...a,
          createdAt: a.createdAt.toISOString(),
        }))} />
      )}
    </main>
  );
}
