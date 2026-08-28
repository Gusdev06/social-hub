import { desc } from "drizzle-orm";
import { db } from "@/db";
import { workerHeartbeat } from "@/db/schema";

/** Duas voltas de folga do loop de 5s — abaixo disso é oscilação, não queda. */
const LIMITE_MS = 30_000;

/**
 * O executor da esteira roda na máquina do Gusta, não num container. Quando ele
 * está fora, uma rodada nova fica parada em "na fila" — e sem este aviso o
 * painel estaria mentindo pra quem criou a rodada do celular.
 */
export async function WorkerStatus({ temFila }: { temFila: boolean }) {
  const [ponto] = await db
    .select()
    .from(workerHeartbeat)
    .orderBy(desc(workerHeartbeat.lastSeenAt))
    .limit(1);

  const idade = ponto ? Date.now() - new Date(ponto.lastSeenAt).getTime() : Infinity;
  const online = idade < LIMITE_MS;

  if (online) {
    return (
      <p className="text-xs text-emerald-400">
        ● worker de pé{ponto?.ultimoPasso ? ` · último passo: ${ponto.ultimoPasso}` : ""}
      </p>
    );
  }

  return (
    <div
      className={`rounded-lg border p-4 text-sm ${
        temFila
          ? "border-amber-900/60 bg-amber-950/20"
          : "border-neutral-900 bg-neutral-950"
      }`}
    >
      <p className={temFila ? "font-medium text-amber-300" : "text-neutral-400"}>
        {temFila
          ? "Tem rodada esperando e o worker está fora — nada vai andar."
          : "Worker fora do ar."}
      </p>
      <p className="mt-1 text-neutral-400">
        A esteira roda na sua máquina. Abra o terminal na pasta do projeto e rode{" "}
        <code className="rounded bg-neutral-900 px-1.5 py-0.5 text-neutral-200">npm run worker</code>.
        Ele retoma sozinho de onde parou.
      </p>
    </div>
  );
}
