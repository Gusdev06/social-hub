import { AutoRefresh } from "./auto-refresh";
import { JobCard } from "./job-card";
import { listarAvatares, listarJobs } from "./actions";
import { NovaRodada } from "./nova-rodada";
import { WorkerStatus } from "./worker-status";

export const dynamic = "force-dynamic";

export default async function Produzir() {
  const [jobs, avatares] = await Promise.all([listarJobs(), listarAvatares()]);
  const rodando = jobs.some((j) => ["pending", "running"].includes(j.status));

  return (
    <main className="mx-auto max-w-5xl px-6 py-12 space-y-8">
      <header>
        <h1 className="text-xl font-semibold">Produzir vídeo</h1>
        <a href="/videos" className="ml-3 align-middle text-xs font-normal text-neutral-400 underline hover:text-neutral-200">
          ver os vídeos produzidos
        </a>
        <p className="mt-1 text-sm text-neutral-500">
          Clona um criativo que já escalou trocando só o avatar. A estrutura de edição é medida
          do arquivo — faixas em pixel, cortes em segundo — não estimada no olho.
        </p>
      </header>

      <WorkerStatus temFila={rodando} />

      <NovaRodada avatares={avatares} />

      <AutoRefresh ativo={rodando} />

      <section className="space-y-4">
        {jobs.length === 0 ? (
          <p className="text-sm text-neutral-500">Nenhuma rodada ainda.</p>
        ) : (
          jobs.map((j) => <JobCard key={j.id} job={j} />)
        )}
      </section>
    </main>
  );
}
