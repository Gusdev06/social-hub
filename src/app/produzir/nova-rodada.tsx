"use client";

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

            <Field>
              <FieldTitle>Criativo de referência</FieldTitle>
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
                  className="h-auto w-full border-dashed py-8"
                  onClick={() => inputRef.current?.click()}
                >
                  {subindo ?? "Escolher vídeo (.mp4)"}
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
            </Field>

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
                      : "homem brasileiro, 37, barba curta, camiseta azul-marinho, sofá"
                  }
                  disabled={Boolean(avatarId)}
                />
              </Field>
            </div>

            {avatares.length > 0 && (
              <FieldSet>
                <FieldLegend variant="label">Avatar</FieldLegend>
                <FieldDescription>
                  Reusar um avatar salvo mantém o mesmo personagem entre criativos e pula a
                  geração do rosto. Vai junto a nota de casting, que é o que segura a identidade
                  entre um clipe e outro.
                </FieldDescription>

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

                <Button
                  variant="link"
                  size="xs"
                  className="self-start text-muted-foreground"
                  render={<a href="/avatares" />}
                  nativeButton={false}
                >
                  gerenciar avatares
                </Button>
              </FieldSet>
            )}

            <FieldSet>
              <FieldLegend variant="label">Modelo de vídeo</FieldLegend>
              <FieldDescription>
                Quem gera os clipes do avatar. Fica fixo na rodada — cada clipe nasce do último
                frame do anterior, e trocar no meio quebraria o rosto na emenda.
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

            <Field orientation="horizontal">
              <Button type="submit" size="lg" variant="secondary" disabled={pending || !refVideoUrl}>
                {pending ? "Criando…" : "Analisar estrutura"}
              </Button>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>
    </form>
  );
}
