"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { signUploadAction } from "../compose/actions";
import { importarUrlsAction } from "./actions";

/**
 * Aceita quatro entradas, porque cada uma resolve um atrito diferente:
 *  · arrastar a imagem direto do post aberto noutra aba  → vem text/uri-list
 *  · Cmd+V de um print                                    → vem como File
 *  · arrastar arquivo do Finder                           → vem como File
 *  · colar URLs de imagem na caixa                        → texto
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
    <div className="space-y-3">
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
        className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition ${
          sobre ? "border-blue-500 bg-blue-500/5" : "border-neutral-800 hover:border-neutral-700"
        }`}
      >
        <p className="text-sm font-medium">
          Arraste as imagens do post aqui
        </p>
        <p className="mt-1 text-xs text-neutral-600">
          Abra o post noutra aba e arraste cada imagem · ou <kbd className="rounded bg-neutral-800 px-1">⌘V</kbd> um print · ou clique pra escolher arquivos
        </p>
      </div>

      <input
        ref={inputRef} type="file" multiple accept="image/*" className="hidden"
        onChange={(e) => subirArquivos(Array.from(e.target.files ?? []))}
      />

      <details className="rounded-lg border border-neutral-800 p-3">
        <summary className="cursor-pointer text-xs text-neutral-500">
          Ou cole as URLs das imagens (uma por linha)
        </summary>
        <textarea
          value={colarUrls}
          onChange={(e) => setColarUrls(e.target.value)}
          rows={3}
          placeholder="https://scontent.cdninstagram.com/..."
          className="mt-2 w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs font-mono"
        />
        <button
          type="button"
          disabled={pending}
          onClick={() => importar(colarUrls.split("\n").map((s) => s.trim()).filter(Boolean))}
          className="mt-2 rounded-lg border border-neutral-700 px-3 py-1.5 text-xs disabled:opacity-40"
        >
          Baixar essas URLs
        </button>
        <p className="mt-2 text-xs text-neutral-600">
          No post: botão direito na imagem → &ldquo;Copiar endereço da imagem&rdquo;.
        </p>
      </details>

      {status && <p className="text-xs text-amber-400">{status}</p>}

      {imagens.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {imagens.map((u, i) => (
            <div key={i} className="relative">
              <img src={u} alt="" className="size-20 rounded object-cover border border-neutral-800" />
              <button
                type="button"
                onClick={() => onImagens(imagens.filter((_, j) => j !== i))}
                className="absolute -right-1 -top-1 size-5 rounded-full bg-neutral-800 text-xs text-neutral-300 hover:bg-red-900"
              >×</button>
              <span className="absolute bottom-0 left-0 rounded-tr bg-black/70 px-1 text-[10px] text-neutral-300">
                {i + 1}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
