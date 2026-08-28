import type { RenderEstrutura, RenderManifest } from "@/db/schema";
import { MODELOS_VIDEO, MODELO_PADRAO, custoClipe, modeloDe } from "@/lib/modelos-video";
import {
  ajustarEscalaAction, aprovarAction, cancelarAction, marcarRecorteAction, pedirTakeAction,
  regerarImagemAction, reprocessarAction, salvarAvatarAction, salvarPromptManualAction,
  salvarRoteiroAction, tentarComModeloAction, usarTakeAction,
} from "./actions";
import { Escala } from "./escala";
import { MarcarRecorte } from "./marcar-recorte";
import { PromptManual } from "./prompt-manual";
import { SalvarAvatar } from "./salvar-avatar";
import { RoteiroEditor } from "./roteiro-editor";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge, type badgeVariants } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";

type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];

/**
 * Cada status ganha a variante que diz o que ele pede de quem olha: o que
 * espera ação vira primário, o que falhou vira destrutivo, e os intermediários
 * ficam discretos.
 */
const VARIANTE: Record<string, BadgeVariant> = {
  pending: "outline",
  running: "outline",
  waiting_approval: "default",
  done: "outline",
  failed: "destructive",
  canceled: "secondary",
};

const TOM: Record<string, string> = {
  running: "border-warning/40 text-warning",
  done: "border-success/40 text-success",
};

const ROTULO: Record<string, string> = {
  pending: "na fila",
  running: "rodando",
  waiting_approval: "aguardando você",
  done: "pronto",
  failed: "falhou",
  canceled: "cancelado",
};

/** A estrutura medida, do jeito que o script devolve — em pixels e segundos. */
function Estrutura({ e, frames }: { e: RenderEstrutura; frames: RenderManifest["frames"] }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        {e.largura}×{e.altura} · {e.fps.toFixed(0)}fps · {e.duracao.toFixed(2)}s · cortes de layout:{" "}
        <span className="text-foreground">
          {e.cortes.map((c) => `${c.toFixed(2)}s`).join(", ") || "nenhum"}
        </span>
        {e.cortes_de_conteudo_descartados.length > 0 && (
          <>
            {" · "}descartados como troca de conteúdo:{" "}
            {e.cortes_de_conteudo_descartados.map((c) => `${c.toFixed(2)}s`).join(", ")}
          </>
        )}
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {e.segmentos.map((s, i) => {
          const frame = frames?.find((f) => f.segmento === i + 1);
          return (
            <div key={i} className="rounded-md border p-3">
              <p className="text-xs font-medium">
                Segmento {i + 1} · {s.inicio.toFixed(2)}s → {s.fim.toFixed(2)}s · {s.layout}
              </p>
              <div className="mt-2 flex gap-3">
                {/* O frame ao lado da régua: é olhando os dois juntos que dá pra
                    dizer se "barra de caption" é barra de caption mesmo. */}
                {frame && (
                  <img
                    src={frame.url}
                    alt={`segmento ${i + 1}`}
                    className="h-32 rounded-md border object-cover"
                  />
                )}
                <div className="flex flex-1 flex-col gap-1">
                  {s.faixas.map((f, j) => (
                    <div key={j} className="font-mono text-[11px] text-muted-foreground">
                      <span className="text-foreground">
                        y {String(f.y0).padStart(4)}–{String(f.y1).padEnd(4)}
                      </span>{" "}
                      ({(f.fracao * 100).toFixed(1)}%) {f.papel}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Os papéis das faixas são palpite estatístico — os limites em pixel são medidos.
        Confira no frame antes de aprovar: o resto da esteira corta em cima desses números.
      </p>
    </div>
  );
}

type Job = {
  id: string; name: string; step: string; status: string;
  manifest: RenderManifest; costCents: number; lastError: string | null;
  refVideoUrl: string; createdAt: Date;
  /** A descrição do avatar, usada como nome sugerido ao salvar no acervo. */
  castingBrief: string | null;
};

export function JobCard({ job }: { job: Job }) {
  const m = job.manifest ?? {};
  const ultimo = m.log?.at(-1);
  // A recusa vem do escritor de prompt, um passo ANTES do vídeo — os três
  // modelos parariam no mesmo lugar. Oferecer troca aqui seria vender uma saída
  // que cobra e não funciona.
  const recusaDePrompt = job.lastError?.includes("recusou escrever o prompt") ?? false;

  // O passo `clipes` para em dois momentos diferentes com o MESMO status/step:
  // logo depois da imagem-base (aprovar o rosto) e agora antes de cada geração
  // (conferir o prompt). O que separa os dois é já existir prompt pro próximo
  // clipe — sem isso a tela mostraria "Outro rosto" no portão errado.
  const proximoClipe = m.roteiro?.find((r) => !m.clipes?.some((c) => c.n === r.n && c.url))?.n;
  const noPortaoDePrompt =
    job.status === "waiting_approval" &&
    job.step === "clipes" &&
    proximoClipe != null &&
    Boolean(m.prompts?.find((p) => p.n === proximoClipe)?.prompt);

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              {job.name}
              {/* Qual modelo gerou os clipes. Sem isso, comparar duas rodadas do
                  mesmo criativo não diz nada — é o dado do teste. */}
              <Badge variant="outline" className="font-normal">
                {modeloDe(m.modeloVideo).rotulo}
              </Badge>
            </h3>
            <p className="text-xs text-muted-foreground">
              passo <span className="text-foreground">{job.step}</span>
              {job.costCents > 0 && ` · US$ ${(job.costCents / 100).toFixed(2)}`}
              {ultimo && ` · ${ultimo.msg}`}
            </p>
          </div>
          <Badge
            variant={VARIANTE[job.status] ?? "outline"}
            className={cn("shrink-0", TOM[job.status])}
          >
            {ROTULO[job.status] ?? job.status}
          </Badge>
        </div>

        {job.lastError && (
          <Alert variant="destructive">
            <AlertDescription>
              <p>{job.lastError}</p>
              {recusaDePrompt && (
                <p>
                  Trocar de modelo de vídeo não é oferecido aqui porque nenhum chegaria
                  a ser chamado — corrija a fala em “corrigir o roteiro”.
                </p>
              )}
            </AlertDescription>
          </Alert>
        )}

        {m.estrutura && <Estrutura e={m.estrutura} frames={m.frames} />}

        {m.roteiro && (
          <div className="flex flex-col gap-1">
            {m.roteiro.map((c) => (
              <div key={c.n} className="flex flex-col gap-1 text-xs text-muted-foreground">
                <p>
                  <span className="font-mono text-muted-foreground">
                    {c.n} · {c.duracao}s · {c.silabas}sil
                  </span>{" "}
                  {c.texto}
                </p>
                <PromptManual
                  id={job.id}
                  n={c.n}
                  prompt={m.prompts?.find((p) => p.n === c.n)?.prompt ?? ""}
                  origem={m.prompts?.find((p) => p.n === c.n)?.origem}
                  enviado={m.prompts?.find((p) => p.n === c.n)?.enviado}
                  portao={noPortaoDePrompt && c.n === proximoClipe}
                  acao={salvarPromptManualAction}
                />
              </div>
            ))}
            {m.roteiroTexto && (
              <RoteiroEditor id={job.id} texto={m.roteiroTexto} acao={salvarRoteiroAction} />
            )}
          </div>
        )}

        {m.imagemBaseUrl && (
          <div className="flex gap-4">
            <img src={m.imagemBaseUrl} alt="avatar" className="h-48 rounded-md border" />
            <div className="flex flex-1 flex-col gap-2">
              {m.casting?.nota && (
                <pre className="font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-muted-foreground">
                  {m.casting.nota}
                </pre>
              )}
              {(m.imagensDescartadas?.length ?? 0) > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  {m.imagensDescartadas!.length} rosto(s) descartado(s)
                </p>
              )}
              {m.casting?.nota && (
                <SalvarAvatar
                  id={job.id}
                  sugestao={job.castingBrief?.slice(0, 40) ?? job.name}
                  acao={salvarAvatarAction}
                />
              )}
            </div>
          </div>
        )}

        {job.status === "running" && (
          <p className="text-[11px] text-muted-foreground">
            passo em andamento — os botões voltam quando ele terminar
          </p>
        )}

        {m.takePedido && (
          <Alert variant="warning">
            <AlertDescription>
              gerando take do clipe {m.takePedido.n} no {modeloDe(m.takePedido.modelo).rotulo} — leva
              alguns minutos
            </AlertDescription>
          </Alert>
        )}

        {(m.clipes?.length ?? 0) > 0 && (
          <div className="flex flex-col gap-3">
            {m.clipes!.filter((c) => c.url).map((c) => {
              const emUso = c.modelo ?? m.modeloVideo ?? MODELO_PADRAO;
              const dur = m.roteiro?.find((r) => r.n === c.n)?.duracao ?? 5;
              const takes = (m.takes ?? []).filter((t) => t.n === c.n);
              // Só oferece o que ainda não existe pra este clipe — nem o modelo em
              // uso, nem um take já gerado. Repetir custa dinheiro e não compara nada.
              const aOferecer = Object.entries(MODELOS_VIDEO).filter(
                ([k]) => k !== emUso && !takes.some((t) => t.modelo === k),
              );

              return (
                <div key={c.n} className="rounded-md border p-3">
                  <p className="text-[11px] text-muted-foreground">clipe {c.n} · {dur}s</p>

                  <div className="mt-2 flex flex-wrap items-start gap-3">
                    <figure>
                      <video src={c.url} controls className="h-32 rounded-md border border-ring" />
                      <figcaption className="mt-1 text-[11px]">
                        {modeloDe(emUso).rotulo} · em uso
                      </figcaption>
                    </figure>

                    {takes.map((t) => (
                      <figure key={t.modelo}>
                        <video src={t.url} controls className="h-32 rounded-md border" />
                        <figcaption className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                          {modeloDe(t.modelo).rotulo}
                          <form action={usarTakeAction.bind(null, job.id, t.n, t.modelo)}>
                            <Button type="submit" size="xs" variant="outline">
                              usar este
                            </Button>
                          </form>
                        </figcaption>
                      </figure>
                    ))}
                  </div>

                  {/* Nada de pedir take com o worker no meio de um passo: a ação é
                      recusada no servidor, e oferecer um botão que vai falhar é pior
                      que não oferecer. */}
                  {aOferecer.length > 0 && !m.takePedido && job.status !== "running" && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="text-[11px] text-muted-foreground">
                        gerar o mesmo take em:
                      </span>
                      {aOferecer.map(([k, mv]) => (
                        <form key={k} action={pedirTakeAction.bind(null, job.id, c.n, k)}>
                          <Button type="submit" size="xs" variant="outline">
                            {mv.rotulo} · US$ {(custoClipe(mv, dur) / 100).toFixed(2)}
                          </Button>
                        </form>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* A receita de remontagem, trecho a trecho. É aqui que se conserta uma
            edição que a análise não enxergou — ela mede por linha de pixel, então
            recorte flutuante no meio da tela é invisível pra ela. */}
        {m.edicao?.trechos && m.estrutura && (
          <Accordion className="rounded-md border px-3">
            <AccordionItem value="remontagem">
              <AccordionTrigger className="text-xs text-muted-foreground">
                Como o original vai ser remontado · {m.edicao.trechos.length} trecho(s)
              </AccordionTrigger>
              <AccordionContent className="flex flex-col gap-3">
                {m.edicao.trechos.map((t, i) => {
                  const cs = t.camadas ?? (t.faixas ?? []).map((f) => ({
                    fonte: f.fonte,
                    para: { x0: 0, y0: f.y0, x1: m.estrutura!.largura, y1: f.y1 },
                    de: undefined as { x0: number; y0: number; x1: number; y1: number } | undefined,
                  }));
                  const recorte = t.camadas?.find((c) => c.fonte === "ref" && c.de
                    && (c.de.x0 > 0 || c.de.x1 < m.estrutura!.largura))?.de;
                  const frame = m.frames?.find((f) => f.t >= t.ini_ref && f.t <= t.fim_ref) ?? m.frames?.[i];

                  return (
                    <div key={i} className="flex flex-col gap-1 border-l pl-3">
                      <p className="text-[11px] text-muted-foreground">
                        {t.ini_av.toFixed(2)}s → {t.fim_av.toFixed(2)}s
                      </p>
                      <p className="font-mono text-[10px] text-muted-foreground">
                        {cs.map((c) =>
                          `${c.fonte} x${c.para.x0}-${c.para.x1} y${c.para.y0}-${c.para.y1}`,
                        ).join("  ·  ")}
                      </p>
                      {frame && (
                        <MarcarRecorte
                          id={job.id}
                          trecho={i}
                          frameUrl={frame.url}
                          largura={m.estrutura!.largura}
                          altura={m.estrutura!.altura}
                          atual={recorte}
                          acao={marcarRecorteAction}
                        />
                      )}
                    </div>
                  );
                })}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        {(m.compostoUrl || m.versaoBUrl) && (
          <div className="flex gap-4">
            <video src={m.compostoUrl ?? m.versaoBUrl} controls className="h-64 rounded-md border" />
            {m.previewUrl && (
              <div className="flex flex-col gap-2">
                {/* Referência à esquerda, composto à direita. O que se compara é o
                    TAMANHO DA CABEÇA — é o erro mais comum e o mais barato de achar. */}
                <img src={m.previewUrl} alt="preview" className="h-48 rounded-md border" />
                {m.edicao && <Escala id={job.id} escala={m.edicao.escala} acao={ajustarEscalaAction} />}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {job.status === "waiting_approval" && (
            <form action={aprovarAction.bind(null, job.id)}>
              <Button type="submit" size="sm" variant="secondary">
                Confirmei — seguir
              </Button>
            </form>
          )}
          {job.status === "waiting_approval" && job.step === "clipes" && !noPortaoDePrompt && (
            <form action={regerarImagemAction.bind(null, job.id)}>
              <Button type="submit" size="sm" variant="outline">
                Outro rosto
              </Button>
            </form>
          )}
          {/* Cancelado também volta: o manifesto guarda tudo que já foi pago, e
              retomar cai no mesmo passo em vez de refazer a rodada. */}
          {["failed", "canceled"].includes(job.status) && (
            <form action={reprocessarAction.bind(null, job.id)}>
              <Button type="submit" size="sm" variant="outline">
                {job.status === "canceled" ? "Retomar" : "Tentar de novo"}
              </Button>
            </form>
          )}
          {/* Insistir no mesmo modelo costuma quebrar igual. O atalho pro outro
              modelo fica AO LADO do "tentar de novo", que é onde a decisão é
              tomada — não escondido embaixo de um clipe que a falha impediu de
              existir. */}
          {job.status === "failed" && !recusaDePrompt &&
            Object.entries(MODELOS_VIDEO)
              .filter(([k]) => k !== (m.modeloVideo ?? MODELO_PADRAO))
              .map(([k, mv]) => (
                <form key={k} action={tentarComModeloAction.bind(null, job.id, k)}>
                  <Button type="submit" size="sm" variant="outline">
                    Tentar no {mv.rotulo}
                  </Button>
                </form>
              ))}
          {!["done", "canceled"].includes(job.status) && (
            <form action={cancelarAction.bind(null, job.id)}>
              <Button type="submit" size="sm" variant="ghost" className="text-muted-foreground">
                Cancelar
              </Button>
            </form>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
