"use client";

import { useActionState, useRef, useState } from "react";
import { signUploadAction } from "../compose/actions";
import { MODELOS_VIDEO, MODELO_PADRAO, custoClipe } from "@/lib/modelos-video";
import { criarJobAction, type CriarState } from "./actions";

/**
 * O vídeo vai direto do navegador pro Supabase por URL assinada. Passar por
 * Server Action estouraria o teto de ~4,5 MB de corpo de request da Vercel —
 * e criativo de 30s costuma ter 10~50 MB.
 */
export function NovaRodada() {
  const [refVideoUrl, setRefVideoUrl] = useState("");
  const [modelo, setModelo] = useState<string>(MODELO_PADRAO);
  const [subindo, setSubindo] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [estado, submeter, pending] = useActionState<CriarState, FormData>(criarJobAction, null);

  async function subir(file: File) {
    setSubindo("Enviando…");
    const sig = await signUploadAction(file.name || "referencia.mp4");
    if (!sig.ok) return setSubindo(sig.message);

    const r = await fetch(sig.signedUrl, {
      method: "PUT",
      body: file,
      headers: { "content-type": file.type || "video/mp4" },
    });
    if (!r.ok) return setSubindo(`upload falhou (HTTP ${r.status})`);

    setRefVideoUrl(sig.publicUrl);
    setSubindo(null);
  }

  return (
    <form action={submeter} className="rounded-lg border border-neutral-900 p-5 space-y-4">
      <input type="hidden" name="refVideoUrl" value={refVideoUrl} />

      <div>
        <label className="text-sm font-medium">Criativo de referência</label>
        <p className="text-xs text-neutral-500 mt-0.5">
          O anúncio que já provou converter. O roteiro, o ritmo e a edição dele são o ativo —
          só o rosto vai mudar.
        </p>

        {refVideoUrl ? (
          <div className="mt-2 flex items-center gap-3">
            <video src={refVideoUrl} controls className="h-40 rounded border border-neutral-800" />
            <button
              type="button"
              onClick={() => setRefVideoUrl("")}
              className="text-xs text-neutral-400 hover:text-neutral-100"
            >
              trocar
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-2 w-full rounded border border-dashed border-neutral-800 py-8 text-sm text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
          >
            {subindo ?? "Escolher vídeo (.mp4)"}
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void subir(f);
          }}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm">
          Nome da rodada
          <input
            name="name"
            placeholder="sophia-jones → homem 38"
            className="mt-1 w-full rounded border border-neutral-800 bg-transparent px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          Avatar novo
          <input
            name="castingBrief"
            placeholder="homem brasileiro, 37, barba curta, camiseta azul-marinho, sofá"
            className="mt-1 w-full rounded border border-neutral-800 bg-transparent px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div>
        <label className="text-sm font-medium">Modelo de vídeo</label>
        <p className="text-xs text-neutral-500 mt-0.5">
          Quem gera os clipes do avatar. Fica fixo na rodada — cada clipe nasce do último
          frame do anterior, e trocar no meio quebraria o rosto na emenda.
        </p>

        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {Object.entries(MODELOS_VIDEO).map(([chave, m]) => (
            <label
              key={chave}
              className={`cursor-pointer rounded border p-3 text-left transition ${
                modelo === chave
                  ? "border-neutral-100 bg-neutral-900/60"
                  : "border-neutral-800 hover:border-neutral-700"
              }`}
            >
              <input
                type="radio"
                name="modeloVideo"
                value={chave}
                checked={modelo === chave}
                onChange={() => setModelo(chave)}
                className="sr-only"
              />
              <span className="block text-sm font-medium">{m.rotulo}</span>
              <span className="mt-0.5 block text-xs text-neutral-400">
                US$ {(custoClipe(m, 5) / 100).toFixed(2)}/clipe de 5s · {m.saida}
              </span>
              <span className="mt-1.5 block text-xs leading-snug text-neutral-500">{m.nota}</span>
            </label>
          ))}
        </div>
      </div>

      {estado && !estado.ok && <p className="text-sm text-red-400">{estado.message}</p>}

      <button
        disabled={pending || !refVideoUrl}
        className="rounded bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-950 disabled:opacity-40"
      >
        {pending ? "Criando…" : "Analisar estrutura"}
      </button>
    </form>
  );
}
