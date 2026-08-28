"use client";

import { useActionState, useRef, useState } from "react";
import { publishAction, signUploadAction, type PublishState } from "./actions";


/**
 * A Content Publishing API do Instagram so aceita JPEG em foto — PNG e WebP
 * fazem o container terminar em ERROR. Converte no navegador pra voce nao
 * precisar se preocupar com isso.
 */
async function paraJpeg(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/jpeg") return file;

  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  // JPEG nao tem canal alpha: sem esse fundo, transparencia vira preto.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0);

  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.92));
  if (!blob) return file;

  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
}

type Account = { id: string; username: string; platform: string; avatarUrl: string | null };

export function ComposeForm({
  accounts,
  uploadEnabled,
}: {
  accounts: Account[];
  uploadEnabled: boolean;
}) {
  const [state, action, pending] = useActionState<PublishState, FormData>(publishAction, null);
  const [mediaType, setMediaType] = useState("image");
  const [agendar, setAgendar] = useState(false);
  const [urls, setUrls] = useState("");
  const [enviando, setEnviando] = useState<string | null>(null);
  const [erroUpload, setErroUpload] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setErroUpload(null);

    const novas: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const original = files[i];
      setEnviando(`${original.name} (${i + 1}/${files.length})`);
      try {
        const f = await paraJpeg(original);
        const sig = await signUploadAction(f.name);
        if (!sig.ok) throw new Error(sig.message);

        // Vai direto do navegador pro Supabase: nao passa pela Vercel, entao
        // nao esbarra no teto de ~4,5 MB de corpo de request.
        const res = await fetch(sig.signedUrl, {
          method: "PUT",
          body: f,
          headers: { "content-type": f.type || "application/octet-stream" },
        });
        if (!res.ok) throw new Error(`upload falhou (HTTP ${res.status})`);

        novas.push(sig.publicUrl);
      } catch (e) {
        setErroUpload(`${original.name}: ${e instanceof Error ? e.message : String(e)}`);
        break;
      }
    }

    setEnviando(null);
    if (novas.length) setUrls((prev) => (prev ? prev + "\n" : "") + novas.join("\n"));
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <form action={action} className="space-y-6">
      <Field label="Perfis">
        <div className="space-y-2">
          {accounts.map((a) => (
            <label key={a.id} className="flex items-center gap-3 text-sm cursor-pointer">
              <input
                type="checkbox"
                name="contas"
                value={a.id}
                defaultChecked={accounts.length === 1}
                className="size-4 accent-neutral-300"
              />
              {a.avatarUrl && <img src={a.avatarUrl} alt="" className="size-6 rounded-full" />}
              <span>@{a.username}</span>
              <span className="text-xs text-neutral-600">{a.platform}</span>
            </label>
          ))}
        </div>
      </Field>

      <Field label="Tipo">
        <select
          name="mediaType"
          value={mediaType}
          onChange={(e) => setMediaType(e.target.value)}
          className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
        >
          <option value="image">Imagem</option>
          <option value="carousel">Carrossel (2+ imagens)</option>
          <option value="reel">Reel / vídeo</option>
        </select>
      </Field>

      <Field label="Mídia">
        {uploadEnabled ? (
          <div className="space-y-3">
            <input
              ref={inputRef}
              type="file"
              multiple={mediaType === "carousel"}
              accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
              onChange={(e) => handleFiles(e.target.files)}
              disabled={Boolean(enviando)}
              className="block w-full text-sm text-neutral-400 file:mr-3 file:rounded file:border-0 file:bg-neutral-800 file:px-3 file:py-1.5 file:text-sm file:text-neutral-100 hover:file:bg-neutral-700"
            />
            {enviando && <p className="text-xs text-amber-400">Enviando {enviando}…</p>}
            {erroUpload && <p className="text-xs text-red-400">{erroUpload}</p>}
          </div>
        ) : (
          <p className="text-xs text-amber-500 mb-2">
            Upload desligado (falta a service_role key). Cole URLs https públicas abaixo.
          </p>
        )}
      </Field>

      <Field
        label="URLs da mídia"
        hint={
          mediaType === "carousel"
            ? "Uma URL por linha, na ordem dos slides. O upload preenche sozinho."
            : "Preenchido pelo upload. Imagens são convertidas pra JPEG automaticamente — o Instagram só aceita esse formato."
        }
      >
        <textarea
          name="mediaUrls"
          value={urls}
          onChange={(e) => setUrls(e.target.value)}
          rows={mediaType === "carousel" ? 5 : 2}
          placeholder="https://..."
          className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs font-mono"
        />
        {urls.trim() && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {urls.split("\n").filter(Boolean).map((u, i) => (
              <img
                key={i}
                src={u.trim()}
                alt=""
                className="size-16 rounded object-cover border border-neutral-800"
              />
            ))}
          </div>
        )}
      </Field>

      <Field label="Legenda">
        <textarea
          name="caption"
          rows={5}
          maxLength={2200}
          className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
        />
      </Field>

      <Field label="Quando">
        <label className="flex items-center gap-2 text-sm mb-2 cursor-pointer">
          <input
            type="checkbox"
            checked={agendar}
            onChange={(e) => setAgendar(e.target.checked)}
            className="size-4 accent-neutral-300"
          />
          Agendar em vez de publicar agora
        </label>
        {agendar && (
          <input
            type="datetime-local"
            name="scheduledFor"
            required
            className="rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
          />
        )}
      </Field>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={pending || Boolean(enviando)}
          className="rounded bg-neutral-100 text-neutral-900 px-4 py-2 text-sm font-medium disabled:opacity-40"
        >
          {pending ? "Publicando…" : agendar ? "Agendar" : "Publicar agora"}
        </button>
        {state && (
          <p className={`text-sm ${state.ok ? "text-emerald-400" : "text-red-400"}`}>
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}

function Field({
  label, hint, children,
}: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      {hint && <p className="text-xs text-neutral-600 mb-2">{hint}</p>}
      {children}
    </div>
  );
}
