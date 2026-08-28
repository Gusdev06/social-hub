"use client";

import { PlusIcon } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { signUploadAction } from "../compose/actions";
import { salvarRascunho } from "./actions";
import { canvasParaBlob, desenharSlide, TEMAS, type Slide } from "@/lib/slides";
import type { PostGerado } from "@/lib/claude";
import { SectionLabel } from "@/components/section-label";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

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
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionLabel>4 · Artes</SectionLabel>
        <ToggleGroup
          value={[temaId]}
          onValueChange={(v) => {
            const k = (v as string[])[0];
            if (k) setTemaId(k as keyof typeof TEMAS);
          }}
        >
          {(Object.keys(TEMAS) as (keyof typeof TEMAS)[]).map((k) => (
            <ToggleGroupItem key={k} value={k}>
              {TEMAS[k].nome}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div className="flex flex-wrap gap-6">
        {/* preview + navegação */}
        <div className="flex w-[300px] shrink-0 flex-col gap-3">
          <canvas ref={previewRef} className="w-full rounded-xl border" />
          <div className="flex flex-wrap items-center gap-1">
            <ToggleGroup
              value={[String(ativo)]}
              onValueChange={(v) => {
                const i = (v as string[])[0];
                if (i != null) setAtivo(Number(i));
              }}
            >
              {slides.map((_, i) => (
                <ToggleGroupItem key={i} value={String(i)} aria-label={`Slide ${i + 1}`}>
                  {i + 1}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Adicionar slide"
              className="border-dashed"
              onClick={() => setSlides((a) => [...a, { titulo: "Novo slide", corpo: "" }])}
            >
              <PlusIcon />
            </Button>
          </div>
        </div>

        {/* editor */}
        <div className="flex min-w-[320px] flex-1 flex-col gap-4">
          <Input
            value={s?.titulo ?? ""}
            onChange={(e) => editar("titulo", e.target.value)}
            className="font-medium"
            placeholder="Título do slide"
          />
          <Textarea
            value={s?.corpo ?? ""}
            onChange={(e) => editar("corpo", e.target.value)}
            rows={4}
            placeholder="Corpo (pode ficar vazio na capa)"
          />

          {/* fundo */}
          <div className="flex flex-col gap-3 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <SectionLabel>Fundo</SectionLabel>
              {s?.imagem && (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  className="text-muted-foreground"
                  onClick={() => editar("imagem", undefined)}
                >
                  remover imagem
                </Button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="size-14 border-dashed text-xs"
                onClick={() => fileRef.current?.click()}
              >
                + subir
              </Button>
              {referencias.map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => editar("imagem", u)}
                  className={cn(
                    "size-14 overflow-hidden rounded-md border-2 transition-opacity",
                    s?.imagem === u
                      ? "border-primary"
                      : "border-transparent opacity-60 hover:opacity-100",
                  )}
                >
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
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="self-start text-muted-foreground"
              onClick={() => {
                setSlides((a) => a.filter((_, j) => j !== ativo));
                setAtivo((a) => Math.max(0, a - 1));
              }}
            >
              Remover este slide
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" size="lg" variant="secondary" onClick={gerarESubir}>
          Gerar as {slides.length} artes
        </Button>
        {urls.length > 0 && (
          <Button
            type="button"
            size="lg"
            disabled={salvando}
            onClick={() => startSalvar(async () => {
              const r = await salvarRascunho({ ...post, slides }, urls);
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

function Faixa({
  label, valor, min, max, passo, onChange, dica,
}: {
  label: string; valor: number; min: number; max: number; passo: number;
  onChange: (v: number) => void; dica?: string;
}) {
  const id = `faixa-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <Field>
      <div className="flex justify-between text-xs">
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <span className="tabular-nums text-muted-foreground">{valor.toFixed(2)}</span>
      </div>
      <Slider
        id={id}
        min={min}
        max={max}
        step={passo}
        value={valor}
        onValueChange={(v) => onChange(v as number)}
      />
      {dica && <FieldDescription className="text-xs">{dica}</FieldDescription>}
    </Field>
  );
}

function Grupo({
  label, opcoes, valor, onChange,
}: {
  label: string; opcoes: [string, string][]; valor: string; onChange: (v: string) => void;
}) {
  return (
    <Field>
      <FieldLabel className="text-xs">{label}</FieldLabel>
      <ToggleGroup
        value={[valor]}
        onValueChange={(v) => {
          const escolha = (v as string[])[0];
          if (escolha) onChange(escolha);
        }}
        className="w-full"
      >
        {opcoes.map(([v, l]) => (
          <ToggleGroupItem key={v} value={v} className="flex-1">
            {l}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </Field>
  );
}
