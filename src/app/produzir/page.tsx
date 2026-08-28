import { AutoRefresh } from "./auto-refresh";
import { JobCard } from "./job-card";
import { listarAvatares, listarJobs } from "./actions";
import { NovaRodada } from "./nova-rodada";
import { WorkerStatus } from "./worker-status";
import { PageDescription, PageHeader, PageShell, PageTitle } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";

export const dynamic = "force-dynamic";

export default async function Produzir() {
  const [jobs, avatares] = await Promise.all([listarJobs(), listarAvatares()]);
  const rodando = jobs.some((j) => ["pending", "running"].includes(j.status));

  return (
    <PageShell>
      <PageHeader>
        <div className="flex items-baseline gap-3">
          <PageTitle className="text-xl">Produzir vídeo</PageTitle>
          <Button variant="link" size="sm" render={<a href="/videos" />} nativeButton={false}>
            ver os vídeos produzidos
          </Button>
        </div>
        <PageDescription>
          Clona um criativo que já escalou trocando só o avatar. A estrutura de edição é medida
          do arquivo — faixas em pixel, cortes em segundo — não estimada no olho.
        </PageDescription>
      </PageHeader>

      <WorkerStatus temFila={rodando} />

      <NovaRodada avatares={avatares} />

      <AutoRefresh ativo={rodando} />

      <section className="flex flex-col gap-4">
        {jobs.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>Nenhuma rodada ainda</EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : (
          jobs.map((j) => <JobCard key={j.id} job={j} />)
        )}
      </section>
    </PageShell>
  );
}
