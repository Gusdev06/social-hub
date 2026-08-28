"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { signUploadAction } from "../compose/actions";
import { salvarRascunho } from "./actions";
import { canvasParaBlob, desenharSlide, TEMAS, type Slide } from "@/lib/slides";
import type { PostGerado } from "@/lib/claude";

export function Artes({
  post, handle, referencias,
}: {
  post: PostGerado;
  handle: string;
  referencias: string[];
}) {
  const [slides, setSlides] = useState<Slide[]>(post.slides);
  const [temaId, setTemaId] = useState<keyof typeof TEMAS>("escuro");
  const [ativo, setAtivo] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [urls, setUrls] = useState<string[]>([]);
  const [salvando, startSalvar] = useTransition();
  const previewRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const tema = TEMAS[temaId];
  const s = slides[ativo];

  useEffect(() => {
    if (previewRef.current && s) {
      void desenharSlide(previewRef.current, s, {
        indice: ativo, total: slides.length, tema, handle,
      });
    }
  }, [slides, ativo, tema, handle, s]);

  function editar(campo: keyof Slide, valor: string | number | undefined) {
    setSlides((arr) => arr.map((sl, j) => (j === ativo ? { ...sl, [campo]: valor } : sl)));
  }

  async function subirFundo(f: File) {
    setStatus("Enviando imagem…");
    const sig = await signUploadAction(f.name);
    if (!sig.ok) { setStatus(sig.message); return; }
    const r = await fetch(sig.signedUrl, {
      method: "PUT", body: f, headers: { "content-type": f.type },
    });
    if (!r.ok) { setStatus(`upload falhou (HTTP ${r.status})`); return; }
    editar("imagem", sig.publicUrl);
    setStatus(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function gerarESubir() {
    setStatus("Renderizando…");
    setUrls([]);
    const feitas: string[] = [];
    try {
      for (let i = 0; i < slides.length; i++) {
        const canvas = document.createElement("canvas");
        await desenharSlide(canvas, slides[i], { indice: i, total: slides.length, tema, handle });
        const blob = await canvasParaBlob(canvas);
        setStatus(`Enviando ${i + 1}/${slides.length}…`);
        const sig = await signUploadAction(`slide-${i + 1}.jpg`);
        if (!sig.ok) throw new Error(sig.message);
        const r = await fetch(sig.signedUrl, {
          method: "PUT", body: blob, headers: { "content-type": "image/jpeg" },
        });
        if (!r.ok) throw new Error(`slide ${i + 1}: HTTP ${r.status}`);
        feitas.push(sig.publicUrl);
      }
      setUrls(feitas);
      setStatus(`${feitas.length} artes prontas.`);
    } catch (e) {
      setStatus(`Erro: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">4 · Artes</h2>
        <div className="flex gap-2">
          {(Object.keys(TEMAS) as (keyof typeof TEMAS)[]).map((k) => (
            <button key={k} onClick={() => setTemaId(k)}
              className={`rounded-lg border px-3 py-1.5 text-xs ${
                k === temaId ? "border-neutral-500 text-neutral-100" : "border-neutral-800 text-neutral-500"
              }`}>{TEMAS[k].nome}</button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-6">
        {/* preview + navegação */}
        <div className="w-[300px] shrink-0 space-y-3">
          <canvas ref={previewRef} className="w-full rounded-xl border border-neutral-800" />
          <div className="flex flex-wrap gap-1">
            {slides.map((_, i) => (
              <button key={i} onClick={() => setAtivo(i)}
                className={`size-8 rounded text-xs ${
                  i === ativo ? "bg-neutral-100 text-neutral-900" : "bg-neutral-800 text-neutral-400"
                }`}>{i + 1}</button>
            ))}
            <button onClick={() => setSlides((a) => [...a, { titulo: "Novo slide", corpo: "" }])}
              className="size-8 rounded border border-dashed border-neutral-700 text-neutral-500">+</button>
          </div>
        </div>

        {/* editor */}
        <div className="flex-1 min-w-[320px] space-y-4">
          <input
            value={s?.titulo ?? ""} onChange={(e) => editar("titulo", e.target.value)}
            className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm font-medium"
            placeholder="Título do slide"
          />
          <textarea
            value={s?.corpo ?? ""} onChange={(e) => editar("corpo", e.target.value)} rows={4}
            className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
            placeholder="Corpo (pode ficar vazio na capa)"
          />

          {/* fundo */}
          <div className="rounded-lg border border-neutral-800 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">Fundo</span>
              {s?.imagem && (
                <button onClick={() => editar("imagem", undefined)}
                  className="text-xs text-neutral-500 hover:text-red-400">remover imagem</button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button onClick={() => fileRef.current?.click()}
                className="flex size-14 items-center justify-center rounded border border-dashed border-neutral-700 text-xs text-neutral-500">
                + subir
              </button>
              {referencias.map((u) => (
                <button key={u} onClick={() => editar("imagem", u)}
                  className={`size-14 overflow-hidden rounded border-2 ${
                    s?.imagem === u ? "border-blue-500" : "border-transparent opacity-60 hover:opacity-100"
                  }`}>
                  <img src={u} alt="" className="size-full object-cover" />
                </button>
              ))}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => e.target.files?.[0] && subirFundo(e.target.files[0])} />

            {s?.imagem && (
              <Faixa label="Overlay" valor={s.overlay ?? 0.62} min={0} max={1} passo={0.02}
                onChange={(v) => editar("overlay", v)}
                dica="Escurece a imagem pra o texto continuar legível" />
            )}
          </div>

          {/* tipografia */}
          <div className="grid grid-cols-2 gap-3">
            <Grupo label="Posição" opcoes={[["topo", "Topo"], ["centro", "Centro"], ["baixo", "Baixo"]]}
              valor={s?.posicao ?? "centro"} onChange={(v) => editar("posicao", v)} />
            <Grupo label="Alinhamento" opcoes={[["esquerda", "Esq."], ["centro", "Centro"]]}
              valor={s?.alinhamento ?? "esquerda"} onChange={(v) => editar("alinhamento", v)} />
          </div>
          <Faixa label="Tamanho do texto" valor={s?.escala ?? 1} min={0.7} max={1.4} passo={0.05}
            onChange={(v) => editar("escala", v)} />

          {slides.length > 1 && (
            <button onClick={() => { setSlides((a) => a.filter((_, j) => j !== ativo)); setAtivo((a) => Math.max(0, a - 1)); }}
              className="text-xs text-neutral-500 hover:text-red-400">Remover este slide</button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button onClick={gerarESubir}
          className="rounded-lg bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900">
          Gerar as {slides.length} artes
        </button>
        {urls.length > 0 && (
          <button
            onClick={() => startSalvar(async () => {
              const r = await salvarRascunho({ ...post, slides }, urls);
              setStatus(r.message);
            })}
            disabled={salvando}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40">
            {salvando ? "Salvando…" : "Mandar pro Novo post"}
          </button>
        )}
        {status && (
          <p className={`text-sm ${status.startsWith("Erro") ? "text-red-400" : "text-emerald-400"}`}>{status}</p>
        )}
      </div>

      {urls.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {urls.map((u, i) => <img key={i} src={u} alt="" className="h-40 rounded border border-neutral-800" />)}
        </div>
      )}
    </div>
  );
}

function Faixa({
  label, valor, min, max, passo, onChange, dica,
}: {
  label: string; valor: number; min: number; max: number; passo: number;
  onChange: (v: number) => void; dica?: string;
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-neutral-400">{label}</span>
        <span className="tabular-nums text-neutral-600">{valor.toFixed(2)}</span>
      </div>
      <input type="range" min={min} max={max} step={passo} value={valor}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-neutral-300" />
      {dica && <p className="mt-1 text-xs text-neutral-600">{dica}</p>}
    </div>
  );
}

function Grupo({
  label, opcoes, valor, onChange,
}: {
  label: string; opcoes: [string, string][]; valor: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="mb-1 text-xs text-neutral-400">{label}</p>
      <div className="flex gap-1">
        {opcoes.map(([v, l]) => (
          <button key={v} onClick={() => onChange(v)}
            className={`flex-1 rounded border px-2 py-1.5 text-xs ${
              valor === v ? "border-neutral-500 text-neutral-100" : "border-neutral-800 text-neutral-500"
            }`}>{l}</button>
        ))}
      </div>
    </div>
  );
}
