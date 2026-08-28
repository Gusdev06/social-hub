"use client";

import { XIcon } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { signUploadAction } from "../compose/actions";
import { importarUrlsAction } from "./actions";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/**
 * Aceita quatro entradas, porque cada uma resolve um atrito diferente:
 *  · arrastar a imagem direto do post aberto noutra aba  → vem text/uri-list
 *  · Cmd+V de um print                                    → vem como File
 *  · arrastar arquivo do Finder                           → vem como File
 *  · colar URLs de imagem na caixa                        → texto
 *
 * A área de drop é feita à mão de propósito: o shadcn não tem primitivo de
 * upload, e o que importa aqui — dragover, `text/uri-list`, paste global — não
 * cabe num Input comum.
 */
export function DropZone({
  imagens, onImagens,
}: {
  imagens: string[];
  onImagens: (urls: string[]) => void;
}) {
  const [sobre, setSobre] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [colarUrls, setColarUrls] = useState("");
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);

  async function subirArquivos(files: File[]) {
    const novas: string[] = [];
    for (const [i, f] of files.entries()) {
      setStatus(`Enviando ${i + 1}/${files.length}…`);
      const sig = await signUploadAction(f.name || `print-${i + 1}.png`);
      if (!sig.ok) { setStatus(sig.message); return; }
      const r = await fetch(sig.signedUrl, {
        method: "PUT", body: f,
        headers: { "content-type": f.type || "application/octet-stream" },
      });
      if (!r.ok) { setStatus(`upload falhou (HTTP ${r.status})`); return; }
      novas.push(sig.publicUrl);
    }
    setStatus(`${novas.length} imagem(ns) adicionada(s).`);
    onImagens([...imagens, ...novas]);
  }

  function importar(urls: string[]) {
    if (!urls.length) return;
    setStatus(`Baixando ${urls.length} imagem(ns)…`);
    start(async () => {
      const r = await importarUrlsAction(urls);
      if (!r?.ok) { setStatus(r?.message ?? "falhou"); return; }
      onImagens([...imagens, ...r.urls]);
      setStatus(
        r.avisos.length
          ? `${r.urls.length} baixada(s), ${r.avisos.length} falhou/falharam.`
          : `${r.urls.length} imagem(ns) baixada(s).`,
      );
      setColarUrls("");
    });
  }

  // Cmd+V em qualquer lugar da página
  useEffect(() => {
    async function onPaste(e: ClipboardEvent) {
      const arquivos = Array.from(e.clipboardData?.files ?? []).filter((f) =>
        f.type.startsWith("image/"),
      );
      if (arquivos.length) { e.preventDefault(); await subirArquivos(arquivos); return; }

      const texto = e.clipboardData?.getData("text/plain") ?? "";
      const urls = texto.split(/\s+/).filter((u) => /^https?:\/\/\S+/i.test(u));
      // só intercepta se o alvo não for um campo de texto
      const alvo = e.target as HTMLElement | null;
      const digitando = alvo?.tagName === "INPUT" || alvo?.tagName === "TEXTAREA";
      if (urls.length && !digitando) { e.preventDefault(); importar(urls); }
    }
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  });

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={areaRef}
        onDragOver={(e) => { e.preventDefault(); setSobre(true); }}
        onDragLeave={() => setSobre(false)}
        onDrop={async (e) => {
          e.preventDefault();
          setSobre(false);
          const arquivos = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
          if (arquivos.length) { await subirArquivos(arquivos); return; }
          // imagem arrastada de outra aba chega como URL
          const lista = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain");
          const urls = lista.split(/\s+/).filter((u) => /^https?:\/\//i.test(u));
          if (urls.length) importar(urls);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors",
          sobre ? "border-primary bg-primary/5" : "hover:border-ring",
        )}
      >
        <p className="text-sm font-medium">Arraste as imagens do post aqui</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Abra o post noutra aba e arraste cada imagem · ou{" "}
          <kbd className="rounded bg-muted px-1">⌘V</kbd> um print · ou clique pra escolher arquivos
        </p>
      </div>

      <input
        ref={inputRef} type="file" multiple accept="image/*" className="hidden"
        onChange={(e) => subirArquivos(Array.from(e.target.files ?? []))}
      />

      <Accordion className="rounded-lg border px-3">
        <AccordionItem value="urls">
          <AccordionTrigger className="text-xs text-muted-foreground">
            Ou cole as URLs das imagens (uma por linha)
          </AccordionTrigger>
          <AccordionContent className="flex flex-col gap-2">
            <Textarea
              value={colarUrls}
              onChange={(e) => setColarUrls(e.target.value)}
              rows={3}
              placeholder="https://scontent.cdninstagram.com/..."
              className="font-mono text-xs"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              disabled={pending}
              onClick={() => importar(colarUrls.split("\n").map((s) => s.trim()).filter(Boolean))}
            >
              Baixar essas URLs
            </Button>
            <p className="text-xs text-muted-foreground">
              No post: botão direito na imagem → &ldquo;Copiar endereço da imagem&rdquo;.
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {status && <p className="text-xs text-warning">{status}</p>}

      {imagens.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {imagens.map((u, i) => (
            <div key={i} className="relative">
              <img src={u} alt="" className="size-20 rounded-md border object-cover" />
              <Button
                type="button"
                variant="secondary"
                size="icon-xs"
                aria-label={`Remover imagem ${i + 1}`}
                className="absolute -top-1 -right-1 rounded-full"
                onClick={() => onImagens(imagens.filter((_, j) => j !== i))}
              >
                <XIcon />
              </Button>
              <Badge variant="secondary" className="absolute bottom-0.5 left-0.5">
                {i + 1}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
