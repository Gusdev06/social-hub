"use client";

import { useActionState, useEffect, useState } from "react";
import { Artes } from "./artes";
import { CarrosselEditor } from "./carrossel-editor";
import { DropZone } from "./dropzone";
import {
  analisarAction, buscarPorUrlAction, gerarAction,
  type BuscaState, type GerarState, type TeardownState,
} from "./actions";
import { SectionLabel } from "@/components/section-label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card as UiCard,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
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

const FORMATOS = [
  { label: "Carrossel", value: "carrossel" },
  { label: "Post único", value: "post-unico" },
];

export function Replicador({ uploadOn, handle }: { uploadOn: boolean; handle: string }) {
  const [teardownState, analisar, analisando] =
    useActionState<TeardownState, FormData>(analisarAction, null);
  const [gerarState, gerar, gerando] =
    useActionState<GerarState, FormData>(gerarAction, null);

  const [buscaState, buscar, buscando] =
    useActionState<BuscaState, FormData>(buscarPorUrlAction, null);
  const [imagens, setImagens] = useState<string[]>([]);
  const [legenda, setLegenda] = useState("");

  // quando a busca por URL dá certo, preenche prints e legenda sozinha
  useEffect(() => {
    if (buscaState?.ok) {
      setImagens(buscaState.imagens);
      setLegenda(buscaState.legenda);
    }
  }, [buscaState]);

  const teardown = teardownState?.ok ? teardownState.teardown : null;
  const estrutura = teardownState?.ok ? teardownState.estrutura : null;
  const carrossel = gerarState?.ok ? gerarState.carrossel : null;
  const [modoFiel, setModoFiel] = useState(true);
  const post = gerarState?.ok ? gerarState.post : null;

  return (
    <div className="flex flex-col gap-10">
      {/* ── 0. tentar resolver pela URL ── */}
      <form action={buscar}>
        <UiCard>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="urlBusca">Cole o link do post</FieldLabel>
                <div className="flex gap-2">
                  <Input
                    id="urlBusca"
                    name="urlBusca"
                    placeholder="https://instagram.com/p/..."
                    className="flex-1"
                  />
                  <Button type="submit" variant="outline" size="lg" disabled={buscando}>
                    {buscando ? "Buscando…" : "Buscar"}
                  </Button>
                </div>
                <FieldDescription>
                  Funciona direto pros seus posts. Post de outra pessoa o Instagram não libera por
                  URL — nesse caso suba os prints abaixo.
                </FieldDescription>
              </Field>

              {buscaState?.ok && (
                <Alert>
                  <AlertDescription className="text-success">
                    Achei — {buscaState.meta} · {buscaState.imagens.length} imagem(ns) carregada(s)
                    abaixo.
                  </AlertDescription>
                </Alert>
              )}
              {buscaState && !buscaState.ok && (
                <Alert variant="warning">
                  <AlertDescription>{buscaState.message}</AlertDescription>
                </Alert>
              )}
            </FieldGroup>
          </CardContent>
        </UiCard>
      </form>

      {/* ── 1. o post-fonte ── */}
      <form action={analisar}>
        <FieldGroup>
          <input type="hidden" name="imagens" value={JSON.stringify(imagens)} />
          <SectionLabel>1 · O post que performou</SectionLabel>

          {uploadOn && <DropZone imagens={imagens} onImagens={setImagens} />}

          <Input name="url" placeholder="URL do post (opcional — ajuda o contexto)" />
          <Textarea
            name="legenda"
            rows={4}
            value={legenda}
            onChange={(e) => setLegenda(e.target.value)}
            placeholder="Cole a legenda do post (opcional, mas ajuda muito)"
          />

          <Field orientation="horizontal">
            <Button type="submit" size="lg" disabled={analisando}>
              {analisando ? "Analisando…" : "Fazer o teardown"}
            </Button>
          </Field>
          {teardownState && !teardownState.ok && (
            <Alert variant="destructive">
              <AlertDescription>{teardownState.message}</AlertDescription>
            </Alert>
          )}
        </FieldGroup>
      </form>

      {/* ── 2. teardown + interrogatório ── */}
      {teardown && (
        <div className="flex flex-col gap-6">
          <SectionLabel>2 · O que fez funcionar</SectionLabel>

          <div className="grid gap-3 sm:grid-cols-2">
            <Bloco titulo="Gancho">{teardown.gancho}</Bloco>
            <Bloco titulo="Mecanismo">{teardown.mecanismo}</Bloco>
            <Bloco titulo="Por que performou">{teardown.porQuePerformou}</Bloco>
            <Bloco titulo="Identidade visual">{teardown.identidadeVisual}</Bloco>
            <Bloco titulo="Público original">{teardown.publicoOriginal}</Bloco>
            {teardown.cta && <Bloco titulo="CTA">{teardown.cta}</Bloco>}
          </div>

          <Accordion className="rounded-lg border px-4">
            <AccordionItem value="slides">
              <AccordionTrigger className="text-sm text-muted-foreground">
                Slides do original ({teardown.slides.length})
              </AccordionTrigger>
              <AccordionContent>
                <ol className="flex flex-col gap-2 text-sm">
                  {teardown.slides.map((s, i) => (
                    <li key={i} className="rounded-md bg-muted/60 p-3">
                      <p className="font-medium">{i + 1}. {s.titulo}</p>
                      {s.corpo && <p className="mt-1 text-muted-foreground">{s.corpo}</p>}
                    </li>
                  ))}
                </ol>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <form action={gerar}>
            <UiCard>
              <CardHeader>
                <CardTitle>Agora o seu</CardTitle>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  <input type="hidden" name="teardown" value={JSON.stringify(teardown)} />
                  <input type="hidden" name="estrutura" value={JSON.stringify(estrutura)} />

                  {estrutura && (
                    <Alert>
                      <AlertDescription className="text-success">
                        Li o design do original — cores, tipografia e a ordem dos blocos. As artes
                        vão sair no mesmo layout, só com o seu conteúdo.
                      </AlertDescription>
                    </Alert>
                  )}

                  <Field>
                    <FieldLabel htmlFor="angulo">Ângulo</FieldLabel>
                    <FieldDescription>
                      Sobre o que É o seu post. Ex: &ldquo;por que eu parei de vender curso e fui
                      pra microsaas&rdquo;
                    </FieldDescription>
                    <Input id="angulo" name="angulo" required />
                  </Field>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="formato">Formato</FieldLabel>
                      <Select items={FORMATOS} name="formato" defaultValue="carrossel">
                        <SelectTrigger id="formato" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {FORMATOS.map((f) => (
                              <SelectItem key={f.value} value={f.value}>
                                {f.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="cta">CTA</FieldLabel>
                      <Input
                        id="cta"
                        name="cta"
                        placeholder="comenta QUERO / segue o perfil / link na bio"
                      />
                    </Field>
                  </div>

                  <Field>
                    <FieldLabel htmlFor="observacoes">Observações</FieldLabel>
                    <FieldDescription>
                      Números reais, contexto, o que não pode faltar
                    </FieldDescription>
                    <Textarea id="observacoes" name="observacoes" rows={3} />
                  </Field>

                  <Field orientation="horizontal">
                    <Button type="submit" size="lg" disabled={gerando}>
                      {gerando ? "Escrevendo…" : "Gerar o post"}
                    </Button>
                  </Field>
                  {gerarState && !gerarState.ok && (
                    <Alert variant="destructive">
                      <AlertDescription>{gerarState.message}</AlertDescription>
                    </Alert>
                  )}
                </FieldGroup>
              </CardContent>
            </UiCard>
          </form>
        </div>
      )}

      {/* ── 3. resultado ── */}
      {post && (
        <div className="flex flex-col gap-5">
          <SectionLabel>3 · {post.titulo}</SectionLabel>

          <ScrollArea className="w-full">
            <div className="flex gap-3 pb-2">
              {post.slides.map((s, i) => (
                <UiCard key={i} className="aspect-square w-56 shrink-0 justify-center gap-2 p-5">
                  <span className="text-[10px] text-muted-foreground">
                    {i + 1}/{post.slides.length}
                  </span>
                  <p className="text-base leading-tight font-semibold">{s.titulo}</p>
                  {s.corpo && <p className="text-xs leading-snug text-muted-foreground">{s.corpo}</p>}
                </UiCard>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          <UiCard>
            <CardContent className="flex flex-col gap-2">
              <SectionLabel>Legenda</SectionLabel>
              <p className="text-sm whitespace-pre-wrap">{post.legenda}</p>
              {post.primeiroComentario && (
                <>
                  <SectionLabel className="mt-2">1º comentário</SectionLabel>
                  <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                    {post.primeiroComentario}
                  </p>
                </>
              )}
            </CardContent>
          </UiCard>

          <UiCard className="bg-muted/40">
            <CardContent className="flex flex-col gap-1">
              <SectionLabel>O que foi transposto</SectionLabel>
              <p className="text-sm text-muted-foreground">{post.justificativa}</p>
            </CardContent>
          </UiCard>

          <ToggleGroup
            value={[modoFiel ? "fiel" : "livre"]}
            onValueChange={(v) => setModoFiel((v as string[])[0] !== "livre")}
            className="self-start"
          >
            <ToggleGroupItem value="fiel">Sistema de design</ToggleGroupItem>
            <ToggleGroupItem value="livre">Layout livre (imagem + overlay)</ToggleGroupItem>
          </ToggleGroup>

          {carrossel && modoFiel ? (
            <CarrosselEditor carrossel={carrossel} handle={handle} />
          ) : (
            <Artes post={post} handle={handle} referencias={imagens} />
          )}

          <p className="text-xs text-muted-foreground">
            Se aparecer <code>[NÚMERO]</code> em algum slide, é proposital — eu não invento
            faturamento nem preço. Preencha antes de publicar.
          </p>
        </div>
      )}
    </div>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <UiCard>
      <CardHeader>
        <CardTitle className="text-xs tracking-wide text-muted-foreground uppercase">
          {titulo}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-sm text-foreground">{children}</CardDescription>
      </CardContent>
    </UiCard>
  );
}
