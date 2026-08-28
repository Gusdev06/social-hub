"use client";

import { useActionState, useEffect, useState } from "react";
import { Artes } from "./artes";
import { CarrosselEditor } from "./carrossel-editor";
import { DropZone } from "./dropzone";
import {
  analisarAction, buscarPorUrlAction, gerarAction,
  type BuscaState, type GerarState, type TeardownState,
} from "./actions";

export function Replicador({ uploadOn, handle }: { uploadOn: boolean; handle: string }) {
  const [teardownState, analisar, analisando] =
    useActionState<TeardownState, FormData>(analisarAction, null);
  const [gerarState, gerar, gerando] =
    useActionState<GerarState, FormData>(gerarAction, null);

  const [buscaState, buscar, buscando] =
    useActionState<BuscaState, FormData>(buscarPorUrlAction, null);
  const [imagens, setImagens] = useState<string[]>([]);
  const [legenda, setLegenda] = useState("");

  // quando a busca por URL dá certo, preenche prints e legenda sozinha
  useEffect(() => {
    if (buscaState?.ok) {
      setImagens(buscaState.imagens);
      setLegenda(buscaState.legenda);
    }
  }, [buscaState]);

  const teardown = teardownState?.ok ? teardownState.teardown : null;
  const estrutura = teardownState?.ok ? teardownState.estrutura : null;
  const carrossel = gerarState?.ok ? gerarState.carrossel : null;
  const [modoFiel, setModoFiel] = useState(true);
  const post = gerarState?.ok ? gerarState.post : null;

  return (
    <div className="space-y-10">
      {/* ── 0. tentar resolver pela URL ── */}
      <form action={buscar} className="rounded-xl border border-neutral-800 p-4 space-y-3">
        <p className="text-sm font-medium">Cole o link do post</p>
        <div className="flex gap-2">
          <input name="urlBusca" placeholder="https://instagram.com/p/..."
            className="flex-1 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm" />
          <button disabled={buscando}
            className="shrink-0 rounded-lg border border-neutral-700 px-4 py-2 text-sm disabled:opacity-40">
            {buscando ? "Buscando…" : "Buscar"}
          </button>
        </div>
        {buscaState?.ok && (
          <p className="text-sm text-emerald-400">
            Achei — {buscaState.meta} · {buscaState.imagens.length} imagem(ns) carregada(s) abaixo.
          </p>
        )}
        {buscaState && !buscaState.ok && (
          <p className="text-sm text-amber-400">{buscaState.message}</p>
        )}
        <p className="text-xs text-neutral-600">
          Funciona direto pros seus posts. Post de outra pessoa o Instagram não libera por
          URL — nesse caso suba os prints abaixo.
        </p>
      </form>

      {/* ── 1. o post-fonte ── */}
      <form action={analisar} className="space-y-4">
        <input type="hidden" name="imagens" value={JSON.stringify(imagens)} />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          1 · O post que performou
        </h2>

        {uploadOn && <DropZone imagens={imagens} onImagens={setImagens} />}

        <input name="url" placeholder="URL do post (opcional — ajuda o contexto)"
          className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm" />
        <textarea name="legenda" rows={4} value={legenda} onChange={(e) => setLegenda(e.target.value)}
          placeholder="Cole a legenda do post (opcional, mas ajuda muito)"
          className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm" />

        <button disabled={analisando}
          className="rounded-lg bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900 disabled:opacity-40">
          {analisando ? "Analisando…" : "Fazer o teardown"}
        </button>
        {teardownState && !teardownState.ok && (
          <p className="text-sm text-red-400">{teardownState.message}</p>
        )}
      </form>

      {/* ── 2. teardown + interrogatório ── */}
      {teardown && (
        <div className="space-y-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            2 · O que fez funcionar
          </h2>

          <div className="grid gap-3 sm:grid-cols-2">
            <Card titulo="Gancho">{teardown.gancho}</Card>
            <Card titulo="Mecanismo">{teardown.mecanismo}</Card>
            <Card titulo="Por que performou">{teardown.porQuePerformou}</Card>
            <Card titulo="Identidade visual">{teardown.identidadeVisual}</Card>
            <Card titulo="Público original">{teardown.publicoOriginal}</Card>
            {teardown.cta && <Card titulo="CTA">{teardown.cta}</Card>}
          </div>

          <details className="rounded-lg border border-neutral-800 p-4">
            <summary className="cursor-pointer text-sm text-neutral-400">
              Slides do original ({teardown.slides.length})
            </summary>
            <ol className="mt-3 space-y-2 text-sm">
              {teardown.slides.map((s, i) => (
                <li key={i} className="rounded bg-neutral-900/60 p-3">
                  <p className="font-medium">{i + 1}. {s.titulo}</p>
                  {s.corpo && <p className="mt-1 text-neutral-400">{s.corpo}</p>}
                </li>
              ))}
            </ol>
          </details>

          <form action={gerar} className="space-y-4 rounded-xl border border-neutral-800 p-5">
            <input type="hidden" name="teardown" value={JSON.stringify(teardown)} />
            <input type="hidden" name="estrutura" value={JSON.stringify(estrutura)} />
            <h3 className="font-medium">Agora o seu</h3>
            {estrutura && (
              <p className="rounded-lg bg-emerald-950/30 px-3 py-2 text-xs text-emerald-400">
                Li o design do original — cores, tipografia e a ordem dos blocos. As artes
                vão sair no mesmo layout, só com o seu conteúdo.
              </p>
            )}

            <Campo label="Ângulo" dica="Sobre o que É o seu post. Ex: 'por que eu parei de vender curso e fui pra microsaas'">
              <input name="angulo" required
                className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm" />
            </Campo>

            <div className="grid gap-4 sm:grid-cols-2">
              <Campo label="Formato">
                <select name="formato"
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm">
                  <option value="carrossel">Carrossel</option>
                  <option value="post-unico">Post único</option>
                </select>
              </Campo>
              <Campo label="CTA">
                <input name="cta" placeholder="comenta QUERO / segue o perfil / link na bio"
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm" />
              </Campo>
            </div>

            <Campo label="Observações" dica="Números reais, contexto, o que não pode faltar">
              <textarea name="observacoes" rows={3}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm" />
            </Campo>

            <button disabled={gerando}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40">
              {gerando ? "Escrevendo…" : "Gerar o post"}
            </button>
            {gerarState && !gerarState.ok && (
              <p className="text-sm text-red-400">{gerarState.message}</p>
            )}
          </form>
        </div>
      )}

      {/* ── 3. resultado ── */}
      {post && (
        <div className="space-y-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            3 · {post.titulo}
          </h2>

          <div className="flex gap-3 overflow-x-auto pb-2">
            {post.slides.map((s, i) => (
              <div key={i}
                className="flex aspect-square w-56 shrink-0 flex-col justify-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 p-5">
                <span className="text-[10px] text-neutral-600">{i + 1}/{post.slides.length}</span>
                <p className="text-base font-semibold leading-tight">{s.titulo}</p>
                {s.corpo && <p className="text-xs leading-snug text-neutral-400">{s.corpo}</p>}
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-neutral-800 p-4">
            <p className="mb-2 text-xs uppercase tracking-wide text-neutral-500">Legenda</p>
            <p className="whitespace-pre-wrap text-sm">{post.legenda}</p>
            {post.primeiroComentario && (
              <>
                <p className="mb-2 mt-4 text-xs uppercase tracking-wide text-neutral-500">1º comentário</p>
                <p className="whitespace-pre-wrap text-sm text-neutral-300">{post.primeiroComentario}</p>
              </>
            )}
          </div>

          <div className="rounded-xl border border-neutral-900 bg-neutral-900/40 p-4">
            <p className="mb-1 text-xs uppercase tracking-wide text-neutral-500">O que foi transposto</p>
            <p className="text-sm text-neutral-400">{post.justificativa}</p>
          </div>

          <div className="flex gap-2">
            <button onClick={() => setModoFiel(true)}
              className={`rounded-lg border px-3 py-1.5 text-xs ${
                modoFiel ? "border-neutral-500 text-neutral-100" : "border-neutral-800 text-neutral-500"
              }`}>Sistema de design</button>
            <button onClick={() => setModoFiel(false)}
              className={`rounded-lg border px-3 py-1.5 text-xs ${
                !modoFiel ? "border-neutral-500 text-neutral-100" : "border-neutral-800 text-neutral-500"
              }`}>Layout livre (imagem + overlay)</button>
          </div>

          {carrossel && modoFiel ? (
            <CarrosselEditor carrossel={carrossel} handle={handle} />
          ) : (
            <Artes post={post} handle={handle} referencias={imagens} />
          )}

          <p className="text-xs text-neutral-600">
            Se aparecer <code>[NÚMERO]</code> em algum slide, é proposital — eu não invento
            faturamento nem preço. Preencha antes de publicar.
          </p>
        </div>
      )}
    </div>
  );
}

function Card({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-neutral-800 p-4">
      <p className="mb-1 text-xs uppercase tracking-wide text-neutral-500">{titulo}</p>
      <p className="text-sm text-neutral-300">{children}</p>
    </div>
  );
}

function Campo({ label, dica, children }: { label: string; dica?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      {dica && <p className="mb-2 text-xs text-neutral-600">{dica}</p>}
      {children}
    </div>
  );
}
