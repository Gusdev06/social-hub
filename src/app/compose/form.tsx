"use client";

import { useActionState, useRef, useState } from "react";
import { publishAction, signUploadAction, type PublishState } from "./actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

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

const TIPOS = [
  { label: "Imagem", value: "image" },
  { label: "Carrossel (2+ imagens)", value: "carousel" },
  { label: "Reel / vídeo", value: "reel" },
];

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
    <form action={action}>
      <Card>
        <CardContent>
          <FieldGroup>
            <FieldSet>
              <FieldLegend variant="label">Perfis</FieldLegend>
              <FieldGroup data-slot="checkbox-group">
                {accounts.map((a) => (
                  <Field key={a.id} orientation="horizontal">
                    <Checkbox
                      id={`conta-${a.id}`}
                      name="contas"
                      value={a.id}
                      defaultChecked={accounts.length === 1}
                    />
                    <FieldLabel htmlFor={`conta-${a.id}`} className="items-center">
                      <Avatar className="size-6">
                        <AvatarImage src={a.avatarUrl ?? undefined} alt="" />
                        <AvatarFallback>{a.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      @{a.username}
                      <Badge variant="outline">{a.platform}</Badge>
                    </FieldLabel>
                  </Field>
                ))}
              </FieldGroup>
        </FieldSet>

        <Field>
          <FieldLabel htmlFor="tipo">Tipo</FieldLabel>
          <Select
            items={TIPOS}
            name="mediaType"
            value={mediaType}
            onValueChange={(v) => setMediaType(v as string)}
          >
            <SelectTrigger id="tipo" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {TIPOS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor="midia">Mídia</FieldLabel>
          {uploadEnabled ? (
            <>
              <Input
                id="midia"
                ref={inputRef}
                type="file"
                multiple={mediaType === "carousel"}
                accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
                onChange={(e) => handleFiles(e.target.files)}
                disabled={Boolean(enviando)}
              />
              {enviando && <FieldDescription className="text-warning">Enviando {enviando}…</FieldDescription>}
              {erroUpload && <FieldDescription className="text-destructive">{erroUpload}</FieldDescription>}
            </>
          ) : (
            <Alert variant="warning">
              <AlertDescription>
                Upload desligado (falta a service_role key). Cole URLs https públicas abaixo.
              </AlertDescription>
            </Alert>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="mediaUrls">URLs da mídia</FieldLabel>
          <FieldDescription>
            {mediaType === "carousel"
              ? "Uma URL por linha, na ordem dos slides. O upload preenche sozinho."
              : "Preenchido pelo upload. Imagens são convertidas pra JPEG automaticamente — o Instagram só aceita esse formato."}
          </FieldDescription>
          <Textarea
            id="mediaUrls"
            name="mediaUrls"
            value={urls}
            onChange={(e) => setUrls(e.target.value)}
            rows={mediaType === "carousel" ? 5 : 2}
            placeholder="https://..."
            className="font-mono text-xs"
          />
          {urls.trim() && (
            <div className="mt-3 flex flex-wrap gap-2">
              {urls.split("\n").filter(Boolean).map((u, i) => (
                <img key={i} src={u.trim()} alt="" className="size-16 rounded-md border object-cover" />
              ))}
            </div>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="caption">Legenda</FieldLabel>
          <Textarea id="caption" name="caption" rows={5} maxLength={2200} />
        </Field>

        <FieldSet>
          <FieldLegend variant="label">Quando</FieldLegend>
          <FieldGroup>
            <Field orientation="horizontal">
              <Checkbox
                id="agendar"
                checked={agendar}
                onCheckedChange={(v) => setAgendar(Boolean(v))}
              />
              <FieldLabel htmlFor="agendar">Agendar em vez de publicar agora</FieldLabel>
            </Field>
            {agendar && (
              <Input type="datetime-local" name="scheduledFor" required className="w-fit" />
            )}
          </FieldGroup>
        </FieldSet>

        <FieldSeparator />

        <Field orientation="horizontal" className="items-center justify-between">
          <FieldDescription className="m-0">
            {agendar ? "Fica na fila até a hora marcada." : "Publica em todos os perfis marcados."}
          </FieldDescription>
          <Button type="submit" size="lg" disabled={pending || Boolean(enviando)}>
            {pending ? "Publicando…" : agendar ? "Agendar" : "Publicar agora"}
          </Button>
        </Field>

        {state && (
          <Alert variant={state.ok ? "default" : "destructive"}>
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        )}
      </FieldGroup>
        </CardContent>
      </Card>
    </form>
  );
}
