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
import { SectionLabel } from "@/components/section-label";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

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
    <div className="flex flex-col gap-5">
      <SectionLabel>4 · Artes</SectionLabel>

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

      <ToggleGroup
        value={[proposito]}
        onValueChange={(v) => {
          const p = (v as string[])[0];
          if (p) setProposito(p as PurposeId);
        }}
        className="self-start"
      >
        <ToggleGroupItem value="carousel">Carrossel (caixa alta, denso)</ToggleGroupItem>
        <ToggleGroupItem value="presentation">Apresentação (maior, sentence case)</ToggleGroupItem>
      </ToggleGroup>

      <div className="flex flex-wrap gap-6">
        {/* preview escalado do MESMO nó que é exportado */}
        <div className="flex shrink-0 flex-col gap-3">
          <div style={{ width: 300, height: fmt.h * escala }} className="overflow-hidden rounded-xl border">
            <div ref={exportRef} style={{ transform: `scale(${escala})`, transformOrigin: "top left" }}>
              {s && <SlideRender slide={s} preset={preset} indice={ativo} total={slides.length}
                handle={handle} largura={fmt.w} altura={fmt.h} />}
            </div>
          </div>
          <ToggleGroup
            value={[String(ativo)]}
            onValueChange={(v) => {
              const i = (v as string[])[0];
              if (i != null) setAtivo(Number(i));
            }}
            className="w-[300px] flex-wrap"
          >
            {slides.map((_, i) => (
              <ToggleGroupItem key={i} value={String(i)} aria-label={`Slide ${i + 1}`}>
                {i + 1}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        {/* editor do slide */}
        <div className="flex min-w-[320px] flex-1 flex-col gap-3">
          <Select
            items={TIPOS.map((t) => ({ label: t, value: t }))}
            value={s?.type}
            onValueChange={(v) => editar("type", v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {TIPOS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <Input
            value={s?.badge ?? ""}
            onChange={(e) => editar("badge", e.target.value)}
            placeholder="Etiqueta (opcional)"
          />
          <Textarea
            value={s?.title ?? ""}
            onChange={(e) => editar("title", e.target.value)}
            rows={2}
            placeholder="Título"
            className="font-medium"
          />
          <Textarea
            value={s?.text ?? ""}
            onChange={(e) => editar("text", e.target.value)}
            rows={3}
            placeholder="Texto"
          />
          <Input
            value={s?.highlight ?? ""}
            onChange={(e) => editar("highlight", e.target.value)}
            placeholder="Expressão em destaque (sai na cor de acento)"
          />

          {["list", "checklist", "process"].includes(s?.type ?? "") && (
            <Textarea
              value={(s?.items ?? []).join("\n")}
              onChange={(e) => editar("items", e.target.value.split("\n"))}
              rows={4}
              placeholder="Um item por linha"
            />
          )}
          {s?.type === "number" && (
            <Input
              value={s?.bigNumber ?? ""}
              onChange={(e) => editar("bigNumber", e.target.value)}
              placeholder="17 · 5K+ · №1"
            />
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="text-muted-foreground"
              onClick={() => setSlides((a) => [...a, { type: "body", title: "", text: "" }])}
            >
              + slide
            </Button>
            {slides.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="text-muted-foreground"
                onClick={() => {
                  setSlides((a) => a.filter((_, j) => j !== ativo));
                  setAtivo((a) => Math.max(0, a - 1));
                }}
              >
                remover slide
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" size="lg" onClick={exportar}>
          Gerar as {slides.length} artes
        </Button>
        {urls.length > 0 && (
          <Button
            type="button"
            size="lg"
            disabled={salvando}
            onClick={() => startSalvar(async () => {
              const r = await salvarRascunho(postParaRascunho, urls);
              setStatus(r.message);
            })}
          >
            {salvando ? "Salvando…" : "Mandar pro Novo post"}
          </Button>
        )}
        {status && (
          <p className={cn("text-sm", status.startsWith("Erro") ? "text-destructive" : "text-success")}>
            {status}
          </p>
        )}
      </div>

      {urls.length > 0 && (
        <ScrollArea className="w-full">
          <div className="flex gap-2 pb-2">
            {urls.map((u, i) => <img key={i} src={u} alt="" className="h-40 rounded-md border" />)}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
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
  const items = opcoes.map(([value, label]) => ({ label, value }));
  return (
    <Field>
      <FieldLabel className="text-xs text-muted-foreground">{label}</FieldLabel>
      <Select items={items} value={valor} onValueChange={(v) => onChange(v as string)}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {items.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      {cores && (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {/* As cores são as do preset da arte, literais de propósito — não são
              tokens do painel. */}
          {opcoes.map(([v]) => (
            <button
              key={v}
              type="button"
              onClick={() => onChange(v)}
              title={v}
              style={{ backgroundColor: cores[v] }}
              className={cn(
                "size-5 rounded-full",
                valor === v && "ring-2 ring-ring ring-offset-2 ring-offset-background",
              )}
            />
          ))}
        </div>
      )}
    </Field>
  );
}
