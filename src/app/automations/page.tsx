import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { automations, socialAccounts } from "@/db/schema";
import { AutomationRows } from "./rows";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const dynamic = "force-dynamic";

const ESTADOS = [
  { label: "Estados variados do gatilho", value: null },
  { label: "Somente LIVE", value: "live" },
  { label: "Somente pausadas", value: "pausada" },
];

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
    <main className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-2xl font-semibold">Minhas automações</h2>
        <Button size="lg" className="shrink-0" render={<Link href="/automations/new" />} nativeButton={false}>
          + Nova Automação
        </Button>
      </div>

      <form className="flex flex-wrap items-center gap-3">
        <Input
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="Pesquisar todas as automações"
          className="w-64"
        />
        <Select items={ESTADOS} name="estado" defaultValue={sp.estado ?? null}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {ESTADOS.map((e) => (
                <SelectItem key={e.label} value={e.value}>
                  {e.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
      </form>

      {filtradas.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyTitle>Nenhuma automação ainda</EmptyTitle>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="link" render={<Link href="/automations/new" />} nativeButton={false}>
              Criar a primeira
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <AutomationRows
          linhas={filtradas.map((a) => ({
            ...a,
            createdAt: a.createdAt.toISOString(),
          }))}
        />
      )}
    </main>
  );
}
