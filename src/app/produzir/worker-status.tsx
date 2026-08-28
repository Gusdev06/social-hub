import { desc } from "drizzle-orm";
import { CircleIcon, TriangleAlertIcon } from "lucide-react";
import { db } from "@/db";
import { workerHeartbeat } from "@/db/schema";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
      <p className="flex items-center gap-1.5 text-xs text-success">
        <CircleIcon className="size-2 fill-current" />
        worker de pé{ponto?.ultimoPasso ? ` · último passo: ${ponto.ultimoPasso}` : ""}
      </p>
    );
  }

  return (
    <Alert variant={temFila ? "warning" : "default"}>
      <TriangleAlertIcon />
      <AlertTitle>
        {temFila
          ? "Tem rodada esperando e o worker está fora — nada vai andar."
          : "Worker fora do ar."}
      </AlertTitle>
      <AlertDescription>
        A esteira roda na sua máquina. Abra o terminal na pasta do projeto e rode{" "}
        <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">npm run worker</code>. Ele
        retoma sozinho de onde parou.
      </AlertDescription>
    </Alert>
  );
}
