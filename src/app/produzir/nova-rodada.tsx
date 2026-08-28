"use client";

import { FilmIcon } from "lucide-react";
import { useActionState, useRef, useState } from "react";
import { signUploadAction } from "../compose/actions";
import { MODELOS_VIDEO, MODELO_PADRAO, custoClipe } from "@/lib/modelos-video";
import { criarJobAction, type CriarState } from "./actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

/**
 * O vídeo vai direto do navegador pro Supabase por URL assinada. Passar por
 * Server Action estouraria o teto de ~4,5 MB de corpo de request da Vercel —
 * e criativo de 30s costuma ter 10~50 MB.
 */
type AvatarSalvo = { id: string; nome: string; imagemUrl: string; usos: number };

export function NovaRodada({ avatares = [] }: { avatares?: AvatarSalvo[] }) {
  const [refVideoUrl, setRefVideoUrl] = useState("");
  const [modelo, setModelo] = useState<string>(MODELO_PADRAO);
  const [avatarId, setAvatarId] = useState("");
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
    <form action={submeter}>
      <Card>
        <CardContent>
          <FieldGroup>
            <input type="hidden" name="refVideoUrl" value={refVideoUrl} />

            <FieldSet>
              <FieldLegend variant="label">Criativo de referência</FieldLegend>
              <FieldDescription>
                O anúncio que já provou converter. O roteiro, o ritmo e a edição dele são o ativo —
                só o rosto vai mudar.
              </FieldDescription>

              {refVideoUrl ? (
                <div className="flex items-center gap-3">
                  <video src={refVideoUrl} controls className="h-40 rounded-md border" />
                  <Button type="button" variant="ghost" size="sm" onClick={() => setRefVideoUrl("")}>
                    trocar
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto w-full flex-col gap-1.5 border-dashed py-7"
                  onClick={() => inputRef.current?.click()}
                >
                  <FilmIcon className="size-5 text-ash" />
                  <span>{subindo ?? "Escolher vídeo (.mp4)"}</span>
                  {!subindo && (
                    <span className="text-xs font-normal text-ash">
                      vai direto pro Storage, sem passar pela Vercel
                    </span>
                  )}
                </Button>
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

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="name">Nome da rodada</FieldLabel>
                  <Input id="name" name="name" placeholder="sophia-jones → homem 38" />
                </Field>
                <Field data-disabled={Boolean(avatarId)}>
                  <FieldLabel htmlFor="castingBrief">Avatar novo</FieldLabel>
                  <Input
                    id="castingBrief"
                    name="castingBrief"
                    placeholder={
                      avatarId
                        ? "não é usado com avatar salvo"
                        : "homem brasileiro, 37, barba curta, camiseta azul-marinho"
                    }
                    disabled={Boolean(avatarId)}
                  />
                </Field>
              </div>
            </FieldSet>

            <FieldSeparator />

            {avatares.length > 0 && (
              <FieldSet>
                <FieldLegend variant="label">Avatar</FieldLegend>
                <div className="flex items-start justify-between gap-4">
                  <FieldDescription>
                    Reusar um avatar salvo mantém o mesmo personagem entre criativos e pula a
                    geração do rosto — a nota de casting vai junto.
                  </FieldDescription>
                  <Button
                    variant="link"
                    size="xs"
                    className="shrink-0 text-muted-foreground"
                    render={<a href="/avatares" />}
                    nativeButton={false}
                  >
                    gerenciar
                  </Button>
                </div>

                <RadioGroup
                  name="avatarId"
                  value={avatarId}
                  onValueChange={(v) => setAvatarId(v as string)}
                  className="flex flex-row flex-wrap gap-2"
                >
                  <FieldLabel htmlFor="avatar-novo" className="w-auto">
                    <Field orientation="horizontal">
                      <FieldContent>
                        <FieldTitle>Gerar um rosto novo</FieldTitle>
                        <FieldDescription className="text-[10px]">
                          US$ 0,05 · a partir da descrição
                        </FieldDescription>
                      </FieldContent>
                      <RadioGroupItem value="" id="avatar-novo" />
                    </Field>
                  </FieldLabel>

                  {avatares.map((a) => (
                    <FieldLabel key={a.id} htmlFor={`avatar-${a.id}`} className="w-auto">
                      <Field orientation="horizontal">
                        <img src={a.imagemUrl} alt="" className="h-12 w-9 rounded-sm object-cover" />
                        <FieldContent>
                          <FieldTitle className="max-w-[10rem] truncate">{a.nome}</FieldTitle>
                          <FieldDescription className="text-[10px]">
                            {a.usos === 0 ? "nunca usado" : `${a.usos} rodada(s)`}
                          </FieldDescription>
                        </FieldContent>
                        <RadioGroupItem value={a.id} id={`avatar-${a.id}`} />
                      </Field>
                    </FieldLabel>
                  ))}
                </RadioGroup>

              </FieldSet>
            )}

            <FieldSeparator />

            <FieldSet>
              <FieldLegend variant="label">Modelo de vídeo</FieldLegend>
              <FieldDescription>
                Fica fixo na rodada: cada clipe nasce do último frame do anterior, e trocar no
                meio quebraria o rosto na emenda.
              </FieldDescription>

              <RadioGroup
                name="modeloVideo"
                value={modelo}
                onValueChange={(v) => setModelo(v as string)}
                className="grid gap-2 sm:grid-cols-3"
              >
                {Object.entries(MODELOS_VIDEO).map(([chave, m]) => (
                  <FieldLabel key={chave} htmlFor={`modelo-${chave}`}>
                    <Field orientation="horizontal">
                      <FieldContent>
                        <FieldTitle>{m.rotulo}</FieldTitle>
                        <FieldDescription>
                          US$ {(custoClipe(m, 5) / 100).toFixed(2)}/clipe de 5s · {m.saida}
                        </FieldDescription>
                        <FieldDescription className="leading-snug">{m.nota}</FieldDescription>
                      </FieldContent>
                      <RadioGroupItem value={chave} id={`modelo-${chave}`} />
                    </Field>
                  </FieldLabel>
                ))}
              </RadioGroup>
            </FieldSet>

            {estado && !estado.ok && (
              <Alert variant="destructive">
                <AlertDescription>{estado.message}</AlertDescription>
              </Alert>
            )}

            <FieldSeparator />

            <Field orientation="horizontal" className="items-center justify-between">
              <FieldDescription className="m-0">
                Nada é cobrado até a estrutura ser aprovada.
              </FieldDescription>
              <Button type="submit" size="lg" disabled={pending || !refVideoUrl}>
                {pending ? "Criando…" : "Analisar estrutura"}
              </Button>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>
    </form>
  );
}
