"use client";

import { XIcon } from "lucide-react";
import { useActionState, useMemo, useState } from "react";
import { saveAutomation, type SaveState } from "./actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from "@/components/ui/item";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type Conta = { id: string; username: string; avatarUrl: string | null };
type Media = {
  id: string; thumb: string; caption: string; tipo: string;
  likes: number; comments: number; timestamp: string;
};
type Link = { title: string; url: string };

const PASSOS = ["Publicação", "Palavra", "Boas-vindas", "Link"] as const;

export type ValoresIniciais = {
  id: string; name: string; accountId: string;
  triggerScope: "specific" | "any" | "next"; mediaIds: string[];
  keywords: string[]; publicReply: string | null; replyToComments: boolean;
  dmMessage: string; welcomeButtonLabel: string;
  followUpMessage: string | null; followUpButtons: Link[];
};

export function Wizard({
  contas, media, inicial,
}: { contas: Conta[]; media: Media[]; inicial?: ValoresIniciais }) {
  const [state, action, pending] = useActionState<SaveState, FormData>(saveAutomation, null);

  const [passo, setPasso] = useState(0);
  const [contaId] = useState(inicial?.accountId ?? contas[0]?.id ?? "");
  const [nome, setNome] = useState(inicial?.name ?? "Nova automação");
  const [escopo, setEscopo] = useState<"specific" | "any" | "next">(inicial?.triggerScope ?? "specific");
  const [posts, setPosts] = useState<string[]>(inicial?.mediaIds ?? (media[0] ? [media[0].id] : []));
  const [mostrarTodos, setMostrarTodos] = useState(false);
  const [modoPalavra, setModoPalavra] = useState<"specific" | "any">(
    inicial && inicial.keywords.length === 0 ? "any" : "specific",
  );
  const [palavras, setPalavras] = useState(inicial?.keywords.join(", ") ?? "");
  const [interagir, setInteragir] = useState(inicial?.replyToComments ?? false);
  const [respostaPublica, setRespostaPublica] = useState(inicial?.publicReply ?? "");
  const [boasVindasOn, setBoasVindasOn] = useState(true);
  const [boasVindas, setBoasVindas] = useState(
    inicial?.dmMessage ??
      "Olá! Eu estou muito feliz que você está aqui, muito obrigado pelo seu interesse 😊\n\nClique abaixo e eu vou te mandar o link em um segundo ✨",
  );
  const [botaoLabel, setBotaoLabel] = useState(inicial?.welcomeButtonLabel ?? "Me envie o link");
  const [dmLink, setDmLink] = useState(inicial?.followUpMessage ?? "");
  const [links, setLinks] = useState<Link[]>(inicial?.followUpButtons ?? []);
  const [modal, setModal] = useState(false);

  const conta = contas.find((c) => c.id === contaId) ?? contas[0];
  const postSel = useMemo(
    () => media.find((m) => m.id === posts[0]) ?? media[0],
    [media, posts],
  );
  const abaPreview = passo <= 0 ? "publicar" : passo === 1 ? "comentarios" : "dm";

  return (
    <form action={action} className="flex gap-8">
      {/* campos que viajam no submit */}
      {inicial && <input type="hidden" name="id" value={inicial.id} />}
      <input type="hidden" name="accountId" value={contaId} />
      <input type="hidden" name="name" value={nome} />
      <input type="hidden" name="triggerScope" value={escopo} />
      <input type="hidden" name="mediaIds" value={JSON.stringify(posts)} />
      <input type="hidden" name="keywordMode" value={modoPalavra} />
      <input type="hidden" name="keywords" value={palavras} />
      <input type="hidden" name="publicReply" value={respostaPublica} />
      <input type="hidden" name="dmMessage" value={boasVindasOn ? boasVindas : "Oi!"} />
      <input type="hidden" name="welcomeButtonLabel" value={botaoLabel} />
      <input type="hidden" name="followUpMessage" value={dmLink} />
      <input type="hidden" name="followUpButtons" value={JSON.stringify(links)} />
      {interagir && <input type="hidden" name="replyToComments" value="on" />}
      <input type="hidden" name="isActive" value="on" />

      {/* ── coluna esquerda ── */}
      <div className="flex w-[420px] shrink-0 flex-col gap-8">
        <Tabs value={passo} onValueChange={(v) => setPasso(v as number)} className="gap-8">
          <TabsList>
            {PASSOS.map((p, i) => (
              <TabsTrigger key={p} value={i}>
                {i + 1}. {p}
              </TabsTrigger>
            ))}
          </TabsList>

          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="font-medium"
            placeholder="Nome da automação"
          />

          <TabsContent value={0}>
            <Secao titulo="Quando alguém faz um comentário">
              <RadioGroup value={escopo} onValueChange={(v) => setEscopo(v as typeof escopo)}>
                <FieldGroup>
                  <RadioCard value="specific" label="uma publicação ou Reels específico">
                    {escopo === "specific" && (
                      <div className="flex flex-col gap-2">
                        <ToggleGroup
                          multiple
                          value={posts}
                          onValueChange={(v) => setPosts(v as string[])}
                          className="grid grid-cols-4 gap-2 border-0 bg-transparent p-0"
                        >
                          {(mostrarTodos ? media : media.slice(0, 4)).map((m) => (
                            <ToggleGroupItem
                              key={m.id}
                              value={m.id}
                              aria-label={m.caption || m.id}
                              className="aspect-square size-auto overflow-hidden rounded-lg border-2 border-transparent p-0 opacity-60 data-[pressed]:border-primary data-[pressed]:opacity-100"
                            >
                              <img src={m.thumb} alt="" className="size-full object-cover" />
                            </ToggleGroupItem>
                          ))}
                        </ToggleGroup>
                        {media.length > 4 && (
                          <Button
                            type="button"
                            variant="link"
                            size="sm"
                            className="self-start"
                            onClick={() => setMostrarTodos((v) => !v)}
                          >
                            {mostrarTodos ? "Mostrar menos" : "Mostrar Todos"}
                          </Button>
                        )}
                        <FieldDescription>{posts.length} selecionado(s)</FieldDescription>
                      </div>
                    )}
                  </RadioCard>
                  <RadioCard
                    value="any"
                    label="qualquer publicação ou Reel"
                    nota="vale pros posts que já existem e os futuros"
                  />
                  <RadioCard
                    value="next"
                    label="próxima publicação ou Reel"
                    nota="só dispara em posts publicados a partir de agora"
                  />
                </FieldGroup>
              </RadioGroup>
            </Secao>
          </TabsContent>

          <TabsContent value={1}>
            <Secao titulo="E esse comentário possui">
              <RadioGroup value={modoPalavra} onValueChange={(v) => setModoPalavra(v as typeof modoPalavra)}>
                <FieldGroup>
                  <RadioCard value="specific" label="uma palavra ou expressão específica">
                    {modoPalavra === "specific" && (
                      <div className="flex flex-col gap-2">
                        <Input
                          value={palavras}
                          onChange={(e) => setPalavras(e.target.value)}
                          placeholder="Digite uma ou mais palavras"
                        />
                        <FieldDescription>Use vírgulas para separar as palavras</FieldDescription>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          Por exemplo:
                          {["Preço", "Link", "Comprar"].map((ex) => (
                            <Button
                              key={ex}
                              type="button"
                              variant="outline"
                              size="xs"
                              onClick={() => setPalavras((p) => (p ? `${p}, ${ex}` : ex))}
                            >
                              {ex}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </RadioCard>
                  <RadioCard
                    value="any"
                    label="qualquer palavra"
                    nota="dispara em qualquer comentário — cuidado com volume"
                  />
                </FieldGroup>
              </RadioGroup>

              <FieldGroup>
                <Field orientation="horizontal">
                  <FieldLabel htmlFor="interagir">
                    interagir com os comentários deles na publicação
                  </FieldLabel>
                  <Switch id="interagir" checked={interagir} onCheckedChange={setInteragir} />
                </Field>
                {interagir && (
                  <Input
                    value={respostaPublica}
                    onChange={(e) => setRespostaPublica(e.target.value)}
                    placeholder="te mandei no direct 👀"
                  />
                )}
              </FieldGroup>
            </Secao>
          </TabsContent>

          <TabsContent value={2}>
            <Secao titulo="Eles receberão">
              <FieldGroup className="rounded-xl bg-muted/40 p-4">
                <Field orientation="horizontal">
                  <FieldLabel htmlFor="boas-vindas">uma mensagem de boas-vindas</FieldLabel>
                  <Switch id="boas-vindas" checked={boasVindasOn} onCheckedChange={setBoasVindasOn} />
                </Field>
                {boasVindasOn && (
                  <>
                    <Textarea
                      value={boasVindas}
                      onChange={(e) => setBoasVindas(e.target.value)}
                      rows={6}
                    />
                    <Input value={botaoLabel} onChange={(e) => setBotaoLabel(e.target.value)} />
                    <FieldDescription>
                      O Instagram não deixa mandar link sem interação. O toque no botão é o que
                      autoriza o segundo DM — e quem toca converte muito mais.
                    </FieldDescription>
                  </>
                )}
              </FieldGroup>
            </Secao>
          </TabsContent>

          <TabsContent value={3}>
            <Secao titulo="E então, eles vão receber">
              <FieldGroup className="rounded-xl bg-muted/40 p-4">
                <FieldTitle>uma DM contendo um link</FieldTitle>
                <Textarea
                  value={dmLink}
                  onChange={(e) => setDmLink(e.target.value)}
                  rows={4}
                  placeholder="Escreva uma mensagem"
                />
                {links.length > 0 && (
                  <div className="flex flex-col gap-2">
                    {links.map((l, i) => (
                      <Item key={i} variant="outline" size="sm">
                        <ItemContent>
                          <ItemTitle>{l.title}</ItemTitle>
                          <ItemDescription>{l.url}</ItemDescription>
                        </ItemContent>
                        <ItemActions>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label={`Remover ${l.title}`}
                            onClick={() => setLinks((s) => s.filter((_, j) => j !== i))}
                          >
                            <XIcon />
                          </Button>
                        </ItemActions>
                      </Item>
                    ))}
                  </div>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModal(true)}
                  disabled={links.length >= 3}
                >
                  + Adicionar Um Link
                </Button>
                {links.length >= 3 && (
                  <FieldDescription>O Instagram aceita no máximo 3 botões.</FieldDescription>
                )}
              </FieldGroup>
            </Secao>
          </TabsContent>
        </Tabs>

        <div className="flex items-center gap-3">
          {passo > 0 && (
            <Button type="button" variant="outline" size="lg" onClick={() => setPasso((p) => p - 1)}>
              Voltar
            </Button>
          )}
          {passo < 3 ? (
            <Button type="button" variant="outline" size="lg" onClick={() => setPasso((p) => p + 1)}>
              Próximo
            </Button>
          ) : (
            <Button type="submit" size="lg" disabled={pending}>
              {pending ? "Salvando…" : inicial ? "Salvar" : "Ativar"}
            </Button>
          )}
        </div>

        {state && !state.ok && (
          <Alert variant="destructive">
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        )}
      </div>

      {/* ── preview ── */}
      <div className="min-w-0 flex-1">
        <p className="mb-4 text-sm text-muted-foreground">Visualização</p>
        <Telefone
          aba={abaPreview}
          conta={conta}
          post={postSel}
          palavras={palavras}
          boasVindas={boasVindasOn ? boasVindas : ""}
          botaoLabel={botaoLabel}
          dmLink={dmLink}
          links={links}
          respostaPublica={interagir ? respostaPublica : ""}
        />
      </div>

      <ModalLink
        aberto={modal}
        onAbertoChange={setModal}
        onSalvar={(l) => { setLinks((s) => [...s, l]); setModal(false); }}
      />
    </form>
  );
}

/* ───────────── preview do celular ───────────── */

/**
 * Mockup da UI do Instagram. As cores aqui são literais de propósito: elas
 * imitam o app do Instagram, não o tema deste painel — se virassem tokens, a
 * prévia mudaria junto com o tema e deixaria de representar o que o usuário vê.
 */
function Telefone({
  aba, conta, post, palavras, boasVindas, botaoLabel, dmLink, links, respostaPublica,
}: {
  aba: string; conta?: Conta; post?: Media; palavras: string; boasVindas: string;
  botaoLabel: string; dmLink: string; links: Link[]; respostaPublica: string;
}) {
  const exemplo = palavras.split(",")[0]?.trim() || "Deixa um comentário";

  return (
    <div className="mx-auto w-[340px]">
      <div className="overflow-hidden rounded-[2.5rem] border-4 border-neutral-800 bg-black shadow-2xl">
        <div className="flex items-center justify-between px-6 py-2 text-[11px] text-neutral-300">
          <span>10:08</span><span>▪▪▪ ▮</span>
        </div>

        {aba === "dm" ? (
          <div className="flex h-[560px] flex-col">
            <div className="flex items-center gap-2 border-b border-neutral-900 px-4 py-3">
              <span className="text-neutral-500">‹</span>
              {conta?.avatarUrl && <img src={conta.avatarUrl} alt="" className="size-7 rounded-full" />}
              <span className="text-sm font-medium text-neutral-100">{conta?.username}</span>
            </div>
            <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
              {boasVindas && (
                <div className="max-w-[85%] rounded-2xl bg-neutral-800 p-3">
                  <p className="text-[13px] whitespace-pre-wrap text-neutral-100">{boasVindas}</p>
                  <div className="mt-3 rounded-xl bg-neutral-700/60 py-2 text-center text-[13px] text-neutral-100">
                    {botaoLabel}
                  </div>
                </div>
              )}
              {boasVindas && (
                <div className="ml-auto w-fit rounded-2xl bg-violet-600 px-3 py-2 text-[13px] text-white">
                  {botaoLabel}
                </div>
              )}
              {(dmLink || links.length > 0) && (
                <div className="max-w-[85%] rounded-2xl bg-neutral-800 p-3">
                  <p className="text-[13px] whitespace-pre-wrap text-neutral-100">
                    {dmLink || <span className="text-neutral-500">Escreva uma mensagem</span>}
                  </p>
                  {links.map((l, i) => (
                    <div key={i} className="mt-2 rounded-xl bg-neutral-700/60 py-2 text-center text-[13px] text-neutral-100">
                      {l.title}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : aba === "comentarios" ? (
          <div className="relative h-[560px]">
            {post?.thumb && <img src={post.thumb} alt="" className="h-48 w-full object-cover opacity-40" />}
            <div className="absolute inset-x-0 top-40 bottom-0 rounded-t-2xl bg-neutral-900 p-4">
              <p className="mb-4 text-center text-sm font-medium text-neutral-100">Comentários</p>
              <div className="flex gap-3">
                <div className="size-8 shrink-0 rounded-full bg-neutral-700" />
                <div>
                  <p className="text-[13px] text-neutral-400">Usuário <span className="text-neutral-600">Agora</span></p>
                  <p className="text-[13px] text-neutral-100">{exemplo}</p>
                  <p className="mt-1 text-[11px] text-neutral-600">Responder</p>
                  {respostaPublica && (
                    <div className="mt-3 flex gap-2">
                      {conta?.avatarUrl && <img src={conta.avatarUrl} alt="" className="size-6 rounded-full" />}
                      <p className="text-[13px] text-neutral-300">{respostaPublica}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-[560px]">
            <p className="py-2 text-center text-[11px] tracking-wide text-neutral-500 uppercase">
              {conta?.username}
            </p>
            <div className="flex items-center gap-2 px-3 py-2">
              {conta?.avatarUrl && <img src={conta.avatarUrl} alt="" className="size-7 rounded-full" />}
              <span className="text-sm text-neutral-100">{conta?.username}</span>
            </div>
            {post?.thumb && <img src={post.thumb} alt="" className="aspect-square w-full object-cover" />}
            <div className="px-3 py-2 text-[12px] text-neutral-400">
              ❤ {post?.likes ?? 0} · 💬 {post?.comments ?? 0}
            </div>
            <p className="line-clamp-3 px-3 text-[12px] text-neutral-300">{post?.caption}</p>
          </div>
        )}
      </div>

      <div className="mt-4 flex justify-center gap-1 rounded-full bg-neutral-900 p-1 text-xs">
        {[["publicar", "Publicar"], ["comentarios", "Comentários"], ["dm", "DM"]].map(([k, l]) => (
          <span key={k} className={`rounded-full px-4 py-1.5 ${aba === k ? "bg-neutral-100 text-neutral-900" : "text-neutral-500"}`}>
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ───────────── auxiliares ───────────── */

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-lg font-semibold">{titulo}</h3>
      {children}
    </section>
  );
}

/**
 * Card de opção. O conteúdo extra fica FORA do `<label>` de propósito: ele tem
 * botões e inputs próprios, e dentro do label um clique neles marcaria o rádio.
 */
function RadioCard({
  value, label, nota, children,
}: {
  value: string; label: string; nota?: string; children?: React.ReactNode;
}) {
  const id = `opcao-${value}-${label.slice(0, 8)}`;
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel htmlFor={id}>
        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>{label}</FieldTitle>
            {nota && <FieldDescription>{nota}</FieldDescription>}
          </FieldContent>
          <RadioGroupItem value={value} id={id} />
        </Field>
      </FieldLabel>
      {children}
    </div>
  );
}

function ModalLink({
  aberto, onAbertoChange, onSalvar,
}: {
  aberto: boolean; onAbertoChange: (v: boolean) => void; onSalvar: (l: Link) => void;
}) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const valido = title.trim().length > 0 && /^https?:\/\//i.test(url.trim());

  return (
    <Dialog open={aberto} onOpenChange={onAbertoChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar um link</DialogTitle>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="link-titulo">Texto do botão</FieldLabel>
            <Input
              id="link-titulo"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={20}
            />
            <FieldDescription>{title.length}/20 — limite do Instagram</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="link-url">Link</FieldLabel>
            <Input
              id="link-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
            />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose>
          <Button
            type="button"
            size="lg"
            disabled={!valido}
            onClick={() => onSalvar({ title: title.trim(), url: url.trim() })}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
