import { desc } from "drizzle-orm";
import { db } from "@/db";
import { videos } from "@/db/schema";
import { requireDashboardAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

const dinheiro = (cents: number) => `US$ ${(cents / 100).toFixed(2)}`;

const quando = (d: Date) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
    .format(d);

/**
 * O acervo: tudo que a esteira já produziu.
 *
 * Lê da tabela `videos`, não de `render_jobs`. A fila é descartável — quando ela
 * é limpa, o histórico do que foi produzido ia junto e os arquivos ficavam no
 * Storage sem nada apontando pra eles.
 */
export default async function Videos() {
  await requireDashboardAuth();

  const acervo = await db.select().from(videos).orderBy(desc(videos.criadoEm)).limit(200);
  const total = acervo.reduce((s, v) => s + v.custoCents, 0);

  return (
    <main className="mx-auto max-w-6xl p-6 space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Vídeos produzidos</h1>
          <p className="mt-0.5 text-xs text-neutral-500">
            {acervo.length === 0
              ? "Nada por aqui ainda."
              : `${acervo.length} vídeo(s) · ${dinheiro(total)} gastos no total`}
          </p>
        </div>
        <a href="/produzir" className="text-xs text-neutral-400 underline hover:text-neutral-200">
          ir para a esteira
        </a>
      </header>

      {acervo.length === 0 ? (
        <p className="rounded-lg border border-neutral-900 p-8 text-center text-sm text-neutral-500">
          Os vídeos aparecem aqui assim que uma rodada chega no passo <code>compor</code>.
          <br />
          Eles ficam mesmo que a rodada seja apagada da fila.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {acervo.map((v) => (
            <figure key={v.id} className="rounded-lg border border-neutral-900 p-3">
              {/* `preload="none"` de propósito: são dezenas de MB cada, e uma
                  galeria que baixa tudo de uma vez trava o navegador. */}
              <video
                src={v.url}
                poster={v.previewUrl ?? undefined}
                controls
                preload="none"
                className="w-full rounded border border-neutral-800 bg-black"
              />
              <figcaption className="mt-2 space-y-1">
                <p className="truncate text-sm font-medium" title={v.nome}>{v.nome}</p>
                <p className="text-[11px] text-neutral-500">
                  {quando(v.criadoEm)}
                  {v.modelo && ` · ${v.modelo}`}
                  {v.custoCents > 0 && ` · ${dinheiro(v.custoCents)}`}
                </p>
                <div className="flex gap-3 pt-0.5 text-[11px]">
                  <a href={v.url} target="_blank" rel="noreferrer"
                     className="text-neutral-400 underline hover:text-neutral-200">
                    abrir
                  </a>
                  {v.refVideoUrl && (
                    <a href={v.refVideoUrl} target="_blank" rel="noreferrer"
                       className="text-neutral-600 underline hover:text-neutral-400">
                      ver a referência
                    </a>
                  )}
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </main>
  );
}
