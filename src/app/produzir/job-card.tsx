import type { RenderEstrutura, RenderManifest } from "@/db/schema";
import { MODELOS_VIDEO, MODELO_PADRAO, custoClipe, modeloDe } from "@/lib/modelos-video";
import {
  ajustarEscalaAction, aprovarAction, cancelarAction, pedirTakeAction,
  regerarImagemAction, reprocessarAction, salvarPromptManualAction,
  salvarRoteiroAction, tentarComModeloAction, usarTakeAction,
} from "./actions";
import { Escala } from "./escala";
import { PromptManual } from "./prompt-manual";
import { RoteiroEditor } from "./roteiro-editor";

const CORES: Record<string, string> = {
  pending: "text-sky-300 border-sky-900/60 bg-sky-950/20",
  running: "text-amber-300 border-amber-900/60 bg-amber-950/20",
  waiting_approval: "text-violet-300 border-violet-900/60 bg-violet-950/20",
  done: "text-emerald-300 border-emerald-900/60 bg-emerald-950/20",
  failed: "text-red-300 border-red-900/60 bg-red-950/20",
  canceled: "text-neutral-400 border-neutral-800 bg-neutral-950",
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
    <div className="space-y-3">
      <p className="text-xs text-neutral-500">
        {e.largura}×{e.altura} · {e.fps.toFixed(0)}fps · {e.duracao.toFixed(2)}s · cortes de layout:{" "}
        <span className="text-neutral-300">
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
            <div key={i} className="rounded border border-neutral-900 p-3">
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
                    className="h-32 rounded border border-neutral-800 object-cover"
                  />
                )}
                <div className="flex-1 space-y-1">
                  {s.faixas.map((f, j) => (
                    <div key={j} className="text-[11px] text-neutral-400 font-mono">
                      <span className="text-neutral-200">
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

      <p className="text-xs text-neutral-500">
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
    <div className="rounded-lg border border-neutral-900 p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold">
            {job.name}
            {/* Qual modelo gerou os clipes. Sem isso, comparar duas rodadas do
                mesmo criativo não diz nada — é o dado do teste. */}
            <span className="ml-2 rounded border border-neutral-800 px-1.5 py-0.5 align-middle text-[10px] font-normal text-neutral-400">
              {modeloDe(m.modeloVideo).rotulo}
            </span>
          </h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            passo <span className="text-neutral-300">{job.step}</span>
            {job.costCents > 0 && ` · US$ ${(job.costCents / 100).toFixed(2)}`}
            {ultimo && ` · ${ultimo.msg}`}
          </p>
        </div>
        <span className={`shrink-0 rounded border px-2 py-0.5 text-xs ${CORES[job.status]}`}>
          {ROTULO[job.status] ?? job.status}
        </span>
      </div>

      {job.lastError && (
        <p className="rounded border border-red-900/60 bg-red-950/20 p-3 text-xs text-red-300">
          {job.lastError}
          {recusaDePrompt && (
            <span className="mt-1 block text-red-400/80">
              Trocar de modelo de vídeo não é oferecido aqui porque nenhum chegaria
              a ser chamado — corrija a fala em “corrigir o roteiro”.
            </span>
          )}
        </p>
      )}

      {m.estrutura && <Estrutura e={m.estrutura} frames={m.frames} />}

      {m.roteiro && (
        <div className="space-y-1">
          {m.roteiro.map((c) => (
            <div key={c.n} className="text-xs text-neutral-400">
              <p>
                <span className="text-neutral-600 font-mono">
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
          <img
            src={m.imagemBaseUrl}
            alt="avatar"
            className="h-48 rounded border border-neutral-800"
          />
          <div className="flex-1 space-y-2">
            {m.casting?.nota && (
              <pre className="whitespace-pre-wrap text-[11px] leading-relaxed text-neutral-400 font-mono">
                {m.casting.nota}
              </pre>
            )}
            {(m.imagensDescartadas?.length ?? 0) > 0 && (
              <p className="text-[11px] text-neutral-600">
                {m.imagensDescartadas!.length} rosto(s) descartado(s)
              </p>
            )}
          </div>
        </div>
      )}

      {job.status === "running" && (
        <p className="text-[11px] text-neutral-500">
          passo em andamento — os botões voltam quando ele terminar
        </p>
      )}

      {m.takePedido && (
        <p className="rounded border border-amber-900/60 bg-amber-950/20 p-2 text-xs text-amber-300">
          gerando take do clipe {m.takePedido.n} no {modeloDe(m.takePedido.modelo).rotulo} — leva alguns minutos
        </p>
      )}

      {(m.clipes?.length ?? 0) > 0 && (
        <div className="space-y-3">
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
              <div key={c.n} className="rounded border border-neutral-900 p-3">
                <p className="text-[11px] text-neutral-500">clipe {c.n} · {dur}s</p>

                <div className="mt-2 flex flex-wrap items-start gap-3">
                  <figure>
                    <video src={c.url} controls className="h-32 rounded border border-neutral-500" />
                    <figcaption className="mt-1 text-[11px] text-neutral-300">
                      {modeloDe(emUso).rotulo} · em uso
                    </figcaption>
                  </figure>

                  {takes.map((t) => (
                    <figure key={t.modelo}>
                      <video src={t.url} controls className="h-32 rounded border border-neutral-800" />
                      <figcaption className="mt-1 flex items-center gap-2 text-[11px] text-neutral-400">
                        {modeloDe(t.modelo).rotulo}
                        <form action={usarTakeAction.bind(null, job.id, t.n, t.modelo)}>
                          <button className="rounded border border-neutral-700 px-1.5 py-0.5 hover:border-neutral-500">
                            usar este
                          </button>
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
                    <span className="text-[11px] text-neutral-600">gerar o mesmo take em:</span>
                    {aOferecer.map(([k, mv]) => (
                      <form key={k} action={pedirTakeAction.bind(null, job.id, c.n, k)}>
                        <button className="rounded border border-neutral-800 px-2 py-0.5 text-[11px] text-neutral-300 hover:border-neutral-600">
                          {mv.rotulo} · US$ {(custoClipe(mv, dur) / 100).toFixed(2)}
                        </button>
                      </form>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {(m.compostoUrl || m.versaoBUrl) && (
        <div className="flex gap-4">
          <video
            src={m.compostoUrl ?? m.versaoBUrl}
            controls
            className="h-64 rounded border border-neutral-800"
          />
          {m.previewUrl && (
            <div className="space-y-2">
              {/* Referência à esquerda, composto à direita. O que se compara é o
                  TAMANHO DA CABEÇA — é o erro mais comum e o mais barato de achar. */}
              <img src={m.previewUrl} alt="preview" className="h-48 rounded border border-neutral-800" />
              {m.edicao && <Escala id={job.id} escala={m.edicao.escala} acao={ajustarEscalaAction} />}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2">
        {job.status === "waiting_approval" && (
          <form action={aprovarAction.bind(null, job.id)}>
            <button className="rounded bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-950">
              Confirmei — seguir
            </button>
          </form>
        )}
        {job.status === "waiting_approval" && job.step === "clipes" && !noPortaoDePrompt && (
          <form action={regerarImagemAction.bind(null, job.id)}>
            <button className="rounded border border-neutral-800 px-3 py-1.5 text-xs hover:border-neutral-700">
              Outro rosto
            </button>
          </form>
        )}
        {/* Cancelado também volta: o manifesto guarda tudo que já foi pago, e
            retomar cai no mesmo passo em vez de refazer a rodada. */}
        {["failed", "canceled"].includes(job.status) && (
          <form action={reprocessarAction.bind(null, job.id)}>
            <button className="rounded border border-neutral-800 px-3 py-1.5 text-xs hover:border-neutral-700">
              {job.status === "canceled" ? "Retomar" : "Tentar de novo"}
            </button>
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
                <button className="rounded border border-neutral-800 px-3 py-1.5 text-xs text-neutral-300 hover:border-neutral-600">
                  Tentar no {mv.rotulo}
                </button>
              </form>
            ))}
        {!["done", "canceled"].includes(job.status) && (
          <form action={cancelarAction.bind(null, job.id)}>
            <button className="rounded border border-neutral-900 px-3 py-1.5 text-xs text-neutral-500 hover:text-neutral-300">
              Cancelar
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
