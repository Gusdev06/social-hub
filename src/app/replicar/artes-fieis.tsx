"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { signUploadAction } from "../compose/actions";
import { salvarRascunho } from "./actions";
import { canvasParaBlob } from "@/lib/slides";
import { desenharBlocos } from "@/lib/render-blocos";
import type { Bloco, Design, PostEstruturado, PostGerado } from "@/lib/claude";

const ROTULO: Record<Bloco["tipo"], string> = {
  titulo: "Título", subtitulo: "Subtítulo", label: "Etiqueta",
  mono: "Monoespaçado", texto: "Parágrafo", lista: "Lista", cartao: "Cartão",
};

export function ArtesFieis({
  post, estruturado, design, handle, referencias,
}: {
  post: PostGerado;
  estruturado: PostEstruturado;
  design: Design;
  handle: string;
  referencias: string[];
}) {
  const [slides, setSlides] = useState(estruturado.slides);
  const [d, setD] = useState<Design>(design);
  const [ativo, setAtivo] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [urls, setUrls] = useState<string[]>([]);
  // fundo por slide: o layout do original é mantido, só o fundo muda
  const [fundos, setFundos] = useState<Record<number, { imagem?: string; overlay: number }>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const [salvando, startSalvar] = useTransition();
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (ref.current && slides[ativo]) {
      void desenharBlocos(ref.current, slides[ativo].blocos, d, {
        indice: ativo, total: slides.length, handle,
        imagem: fundos[ativo]?.imagem,
        overlay: fundos[ativo]?.overlay,
      });
    }
  }, [slides, ativo, d, handle, fundos]);

  function setFundo(patch: { imagem?: string; overlay?: number }) {
    setFundos((f) => {
      const atual = f[ativo] ?? { overlay: 0.82 };
      return { ...f, [ativo]: { ...atual, ...patch } };
    });
  }

  async function subirFundo(file: File) {
    setStatus("Enviando imagem…");
    const sig = await signUploadAction(file.name);
    if (!sig.ok) { setStatus(sig.message); return; }
    const r = await fetch(sig.signedUrl, {
      method: "PUT", body: file, headers: { "content-type": file.type },
    });
    if (!r.ok) { setStatus(`upload falhou (HTTP ${r.status})`); return; }
    setFundo({ imagem: sig.publicUrl });
    setStatus(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function editarBloco(i: number, campo: keyof Bloco, valor: string | string[] | boolean) {
    setSlides((arr) =>
      arr.map((sl, j) =>
        j !== ativo ? sl : { ...sl, blocos: sl.blocos.map((b, k) => (k === i ? { ...b, [campo]: valor } : b)) },
      ),
    );
  }

  async function gerar() {
    setStatus("Renderizando…");
    setUrls([]);
    const feitas: string[] = [];
    try {
      for (let i = 0; i < slides.length; i++) {
        const c = document.createElement("canvas");
        await desenharBlocos(c, slides[i].blocos, d, {
          indice: i, total: slides.length, handle,
          imagem: fundos[i]?.imagem, overlay: fundos[i]?.overlay,
        });
        const blob = await canvasParaBlob(c);
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

  const sl = slides[ativo];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          4 · Artes <span className="ml-2 rounded bg-emerald-900/40 px-2 py-0.5 text-[10px] text-emerald-400">layout do original</span>
        </h2>
        <div className="flex items-center gap-2">
          {(["fundo", "texto", "acento", "cartaoFundo"] as const).map((k) => (
            <label key={k} className="flex items-center gap-1 text-xs text-neutral-500">
              <input type="color" value={(d[k] as string) ?? "#000000"}
                onChange={(e) => setD({ ...d, [k]: e.target.value })}
                className="size-6 cursor-pointer rounded border-0 bg-transparent p-0" />
              {k === "cartaoFundo" ? "cartão" : k}
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-6">
        <div className="w-[320px] shrink-0 space-y-3">
          <canvas ref={ref} className="w-full rounded-xl border border-neutral-800" />
          <div className="flex flex-wrap gap-1">
            {slides.map((_, i) => (
              <button key={i} onClick={() => setAtivo(i)}
                className={`size-8 rounded text-xs ${
                  i === ativo ? "bg-neutral-100 text-neutral-900" : "bg-neutral-800 text-neutral-400"
                }`}>{i + 1}</button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-w-[320px] space-y-3">
          <p className="text-xs text-neutral-600">
            Slide {ativo + 1} · {sl?.blocos.length} blocos, na mesma ordem do original
          </p>

          <div className="rounded-lg border border-neutral-800 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wide text-neutral-600">Fundo deste slide</span>
              {fundos[ativo]?.imagem && (
                <button onClick={() => setFundos((f) => ({ ...f, [ativo]: { overlay: 0.82 } }))}
                  className="text-xs text-neutral-500 hover:text-red-400">remover</button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => fileRef.current?.click()}
                className="flex size-14 items-center justify-center rounded border border-dashed border-neutral-700 text-xs text-neutral-500">
                + subir
              </button>
              {referencias.map((u: string) => (
                <button key={u} onClick={() => setFundo({ imagem: u })}
                  className={`size-14 overflow-hidden rounded border-2 ${
                    fundos[ativo]?.imagem === u ? "border-blue-500" : "border-transparent opacity-60 hover:opacity-100"
                  }`}>
                  <img src={u} alt="" className="size-full object-cover" />
                </button>
              ))}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => e.target.files?.[0] && subirFundo(e.target.files[0])} />
            {fundos[ativo]?.imagem && (
              <div>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-neutral-400">Overlay</span>
                  <span className="tabular-nums text-neutral-600">{(fundos[ativo].overlay ?? 0.82).toFixed(2)}</span>
                </div>
                <input type="range" min={0} max={1} step={0.02}
                  value={fundos[ativo].overlay ?? 0.82}
                  onChange={(e) => setFundo({ overlay: Number(e.target.value) })}
                  className="w-full accent-neutral-300" />
                <p className="mt-1 text-xs text-neutral-600">
                  Aplica a cor de fundo do tema por cima — sem isso o texto some na foto.
                </p>
              </div>
            )}
          </div>
          {sl?.blocos.map((b, i) => (
            <div key={i} className="rounded-lg border border-neutral-800 p-3 space-y-2">
              <p className="text-[10px] uppercase tracking-wide text-neutral-600">{ROTULO[b.tipo]}</p>

              {b.tipo === "lista" || b.tipo === "cartao" ? (
                <>
                  {b.tipo === "cartao" && (
                    <>
                      <input value={b.texto} onChange={(e) => editarBloco(i, "texto", e.target.value)}
                        placeholder="Título do cartão"
                        className="w-full rounded border border-neutral-800 bg-neutral-950 px-2 py-1.5 text-sm" />
                      <input value={b.texto2} onChange={(e) => editarBloco(i, "texto2", e.target.value)}
                        placeholder="Texto de apoio"
                        className="w-full rounded border border-neutral-800 bg-neutral-950 px-2 py-1.5 text-sm" />
                    </>
                  )}
                  <textarea
                    value={b.itens.join("\n")}
                    onChange={(e) => editarBloco(i, "itens", e.target.value.split("\n"))}
                    rows={Math.max(2, b.itens.length)}
                    placeholder="Um item por linha"
                    className="w-full rounded border border-neutral-800 bg-neutral-950 px-2 py-1.5 text-sm"
                  />
                  <label className="flex items-center gap-2 text-xs text-neutral-500">
                    <input type="checkbox" checked={b.destacarUltimo}
                      onChange={(e) => editarBloco(i, "destacarUltimo", e.target.checked)}
                      className="size-3.5 accent-neutral-300" />
                    último item na cor de acento
                  </label>
                </>
              ) : (
                <textarea value={b.texto} onChange={(e) => editarBloco(i, "texto", e.target.value)}
                  rows={b.tipo === "titulo" ? 2 : 2}
                  className="w-full rounded border border-neutral-800 bg-neutral-950 px-2 py-1.5 text-sm" />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button onClick={gerar}
          className="rounded-lg bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900">
          Gerar as {slides.length} artes
        </button>
        {urls.length > 0 && (
          <button
            onClick={() => startSalvar(async () => {
              const r = await salvarRascunho(post, urls);
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
