import { desc } from "drizzle-orm";
import { db } from "@/db";
import { videos } from "@/db/schema";
import { requireDashboardAuth } from "@/lib/auth";
import { PageDescription, PageHeader, PageShell, PageTitle } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";

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
    <PageShell largura="lg">
      <PageHeader className="flex-row items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <PageTitle className="text-lg">Vídeos produzidos</PageTitle>
          <PageDescription className="text-xs">
            {acervo.length === 0
              ? "Nada por aqui ainda."
              : `${acervo.length} vídeo(s) · ${dinheiro(total)} gastos no total`}
          </PageDescription>
        </div>
        <Button variant="link" size="sm" render={<a href="/produzir" />} nativeButton={false}>
          ir para a esteira
        </Button>
      </PageHeader>

      {acervo.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Nenhum vídeo produzido</EmptyTitle>
            <EmptyDescription>
              Os vídeos aparecem aqui assim que uma rodada chega no passo <code>compor</code>. Eles
              ficam mesmo que a rodada seja apagada da fila.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {acervo.map((v) => (
            <Card key={v.id} className="gap-3 p-3">
              <CardContent className="px-0">
                {/* `preload="none"` de propósito: são dezenas de MB cada, e uma
                    galeria que baixa tudo de uma vez trava o navegador. */}
                <video
                  src={v.url}
                  poster={v.previewUrl ?? undefined}
                  controls
                  preload="none"
                  className="w-full rounded-md border bg-black"
                />
              </CardContent>
              <CardFooter className="flex-col items-start gap-1 px-0">
                <p className="w-full truncate text-sm font-medium" title={v.nome}>
                  {v.nome}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {quando(v.criadoEm)}
                  {v.modelo && ` · ${v.modelo}`}
                  {v.custoCents > 0 && ` · ${dinheiro(v.custoCents)}`}
                </p>
                <div className="flex gap-2 pt-0.5">
                  <Button variant="link" size="xs" render={<a href={v.url} target="_blank" rel="noreferrer" />} nativeButton={false}>
                    abrir
                  </Button>
                  {v.refVideoUrl && (
                    <Button
                      variant="link"
                      size="xs"
                      className="text-muted-foreground"
                      render={<a href={v.refVideoUrl} target="_blank" rel="noreferrer" />}
                      nativeButton={false}
                    >
                      ver a referência
                    </Button>
                  )}
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  );
}
