"use client";

import { toBlob } from "html-to-image";
import { useRef, useState, useTransition } from "react";
import { signUploadAction } from "../compose/actions";
import { salvarRascunho } from "./actions";
import { SlideRender } from "./slide-render";
import {
  ACCENTS, composePreset, FONT_STYLES, FORMAT_PRESETS, SURFACES,
} from "@/lib/carousel/presets";
import type {
  AccentId, FontId, FormatId, PurposeId, SlideData, SurfaceId,
} from "@/lib/carousel/types";
import type { Carrossel, PostGerado } from "@/lib/claude";

const TIPOS: SlideData["type"][] = [
  "hook", "body", "list", "checklist", "process", "stats",
  "quote", "comparison", "number", "emoji", "image", "cta",
];

export function CarrosselEditor({
  carrossel, handle,
}: {
  carrossel: Carrossel;
  handle: string;
}) {
  const [slides, setSlides] = useState<SlideData[]>(carrossel.slides);
  const [fonte, setFonte] = useState<FontId>(carrossel.fonte);
  const [superficie, setSuperficie] = useState<SurfaceId>(carrossel.superficie);
  const [acento, setAcento] = useState<AccentId>(carrossel.acento);
  const [proposito, setProposito] = useState<PurposeId>(carrossel.proposito);
  const [formato, setFormato] = useState<FormatId>("threads-4x5");
  const [ativo, setAtivo] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [urls, setUrls] = useState<string[]>([]);
  const [salvando, startSalvar] = useTransition();
  const exportRef = useRef<HTMLDivElement>(null);

  const preset = composePreset(FONT_STYLES[fonte], SURFACES[superficie], ACCENTS[acento], proposito);
  const fmt = FORMAT_PRESETS[formato];
  const s = slides[ativo];
  const escala = 300 / fmt.w;

  function editar(campo: keyof SlideData, valor: unknown) {
    setSlides((a) => a.map((sl, j) => (j === ativo ? { ...sl, [campo]: valor } : sl)));
  }

  async function exportar() {
    const node = exportRef.current;
    if (!node) return;
    setStatus("Renderizando…");
    setUrls([]);
    const feitas: string[] = [];
    try {
      for (let i = 0; i < slides.length; i++) {
        setAtivo(i);
        // deixa o React pintar o slide antes de capturar
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        const blob = await toBlob(node, {
          width: fmt.w, height: fmt.h, pixelRatio: 1,
          cacheBust: true, backgroundColor: preset.bg,
        });
        if (!blob) throw new Error(`slide ${i + 1}: falha ao renderizar`);

        setStatus(`Enviando ${i + 1}/${slides.length}…`);
        const sig = await signUploadAction(`slide-${i + 1}.png`);
        if (!sig.ok) throw new Error(sig.message);
        const r = await fetch(sig.signedUrl, {
          method: "PUT", body: blob, headers: { "content-type": blob.type || "image/png" },
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

  const postParaRascunho: PostGerado = {
    titulo: carrossel.titulo,
    slides: slides.map((sl) => ({ titulo: sl.title ?? "", corpo: sl.text ?? "" })),
    legenda: carrossel.legenda,
    primeiroComentario: carrossel.primeiroComentario,
    justificativa: carrossel.justificativa,
  };

  return (
    <div className="space-y-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">4 · Artes</h2>

      {/* eixos de estilo */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Eixo label="Fonte" valor={fonte} onChange={(v) => setFonte(v as FontId)}
          opcoes={Object.values(FONT_STYLES).map((f) => [f.id, f.name])} />
        <Eixo label="Superfície" valor={superficie} onChange={(v) => setSuperficie(v as SurfaceId)}
          opcoes={Object.values(SURFACES).map((f) => [f.id, f.name])} />
        <Eixo label="Acento" valor={acento} onChange={(v) => setAcento(v as AccentId)}
          opcoes={Object.values(ACCENTS).map((f) => [f.id, f.name])}
          cores={Object.fromEntries(Object.values(ACCENTS).map((a) => [a.id, a.color]))} />
        <Eixo label="Formato" valor={formato} onChange={(v) => setFormato(v as FormatId)}
          opcoes={Object.values(FORMAT_PRESETS).map((f) => [f.id, f.name])} />
      </div>

      <div className="flex gap-2">
        {(["carousel", "presentation"] as PurposeId[]).map((p) => (
          <button key={p} onClick={() => setProposito(p)}
            className={`rounded-lg border px-3 py-1.5 text-xs ${
              p === proposito ? "border-neutral-500 text-neutral-100" : "border-neutral-800 text-neutral-500"
            }`}>{p === "carousel" ? "Carrossel (caixa alta, denso)" : "Apresentação (maior, sentence case)"}</button>
        ))}
      </div>

      <div className="flex flex-wrap gap-6">
        {/* preview escalado do MESMO nó que é exportado */}
        <div className="shrink-0 space-y-3">
          <div style={{ width: 300, height: fmt.h * escala }} className="overflow-hidden rounded-xl border border-neutral-800">
            <div ref={exportRef} style={{ transform: `scale(${escala})`, transformOrigin: "top left" }}>
              {s && <SlideRender slide={s} preset={preset} indice={ativo} total={slides.length}
                handle={handle} largura={fmt.w} altura={fmt.h} />}
            </div>
          </div>
          <div className="flex w-[300px] flex-wrap gap-1">
            {slides.map((_, i) => (
              <button key={i} onClick={() => setAtivo(i)}
                className={`size-8 rounded text-xs ${
                  i === ativo ? "bg-neutral-100 text-neutral-900" : "bg-neutral-800 text-neutral-400"
                }`}>{i + 1}</button>
            ))}
          </div>
        </div>

        {/* editor do slide */}
        <div className="flex-1 min-w-[320px] space-y-3">
          <select value={s?.type} onChange={(e) => editar("type", e.target.value)}
            className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm">
            {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>

          <input value={s?.badge ?? ""} onChange={(e) => editar("badge", e.target.value)}
            placeholder="Etiqueta (opcional)"
            className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm" />
          <textarea value={s?.title ?? ""} onChange={(e) => editar("title", e.target.value)} rows={2}
            placeholder="Título"
            className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm font-medium" />
          <textarea value={s?.text ?? ""} onChange={(e) => editar("text", e.target.value)} rows={3}
            placeholder="Texto"
            className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm" />
          <input value={s?.highlight ?? ""} onChange={(e) => editar("highlight", e.target.value)}
            placeholder="Expressão em destaque (sai na cor de acento)"
            className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm" />

          {["list", "checklist", "process"].includes(s?.type ?? "") && (
            <textarea value={(s?.items ?? []).join("\n")}
              onChange={(e) => editar("items", e.target.value.split("\n"))}
              rows={4} placeholder="Um item por linha"
              className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm" />
          )}
          {s?.type === "number" && (
            <input value={s?.bigNumber ?? ""} onChange={(e) => editar("bigNumber", e.target.value)}
              placeholder="17 · 5K+ · №1"
              className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm" />
          )}

          <div className="flex gap-3 text-xs">
            <button onClick={() => setSlides((a) => [...a, { type: "body", title: "", text: "" }])}
              className="text-neutral-500 hover:text-neutral-200">+ slide</button>
            {slides.length > 1 && (
              <button onClick={() => { setSlides((a) => a.filter((_, j) => j !== ativo)); setAtivo((a) => Math.max(0, a - 1)); }}
                className="text-neutral-500 hover:text-red-400">remover slide</button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button onClick={exportar}
          className="rounded-lg bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900">
          Gerar as {slides.length} artes
        </button>
        {urls.length > 0 && (
          <button onClick={() => startSalvar(async () => {
            const r = await salvarRascunho(postParaRascunho, urls);
            setStatus(r.message);
          })} disabled={salvando}
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

function Eixo({
  label, valor, onChange, opcoes, cores,
}: {
  label: string; valor: string; onChange: (v: string) => void;
  opcoes: [string, string][]; cores?: Record<string, string>;
}) {
  return (
    <div>
      <p className="mb-1 text-xs text-neutral-500">{label}</p>
      <select value={valor} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm">
        {opcoes.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      {cores && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {opcoes.map(([v]) => (
            <button key={v} onClick={() => onChange(v)} title={v}
              style={{ backgroundColor: cores[v] }}
              className={`size-5 rounded-full ${valor === v ? "ring-2 ring-neutral-100 ring-offset-2 ring-offset-neutral-950" : ""}`} />
          ))}
        </div>
      )}
    </div>
  );
}
