"use client";

import { useActionState, useMemo, useState } from "react";
import { saveAutomation, type SaveState } from "./actions";

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
      <div className="w-[420px] shrink-0 space-y-8">
        <div className="flex items-center gap-2 text-xs">
          {PASSOS.map((p, i) => (
            <button
              key={p}
              type="button"
              onClick={() => setPasso(i)}
              className={`rounded-full px-2.5 py-1 ${
                i === passo ? "bg-neutral-100 text-neutral-900"
                : i < passo ? "bg-neutral-800 text-neutral-300" : "text-neutral-600"
              }`}
            >
              {i + 1}. {p}
            </button>
          ))}
        </div>

        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm font-medium"
          placeholder="Nome da automação"
        />

        {passo === 0 && (
          <Secao titulo="Quando alguém faz um comentário">
            <Radio checado={escopo === "specific"} onClick={() => setEscopo("specific")}
              label="uma publicação ou Reels específico">
              {escopo === "specific" && (
                <>
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    {(mostrarTodos ? media : media.slice(0, 4)).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() =>
                          setPosts((p) => p.includes(m.id) ? p.filter((x) => x !== m.id) : [...p, m.id])
                        }
                        className={`aspect-square overflow-hidden rounded-lg border-2 ${
                          posts.includes(m.id) ? "border-blue-500" : "border-transparent opacity-60"
                        }`}
                      >
                        <img src={m.thumb} alt="" className="size-full object-cover" />
                      </button>
                    ))}
                  </div>
                  {media.length > 4 && (
                    <button type="button" onClick={() => setMostrarTodos((v) => !v)}
                      className="mt-2 text-sm text-blue-400 hover:underline">
                      {mostrarTodos ? "Mostrar menos" : "Mostrar Todos"}
                    </button>
                  )}
                  <p className="mt-2 text-xs text-neutral-600">{posts.length} selecionado(s)</p>
                </>
              )}
            </Radio>
            <Radio checado={escopo === "any"} onClick={() => setEscopo("any")}
              label="qualquer publicação ou Reel" nota="vale pros posts que já existem e os futuros" />
            <Radio checado={escopo === "next"} onClick={() => setEscopo("next")}
              label="próxima publicação ou Reel" nota="só dispara em posts publicados a partir de agora" />
          </Secao>
        )}

        {passo === 1 && (
          <Secao titulo="E esse comentário possui">
            <Radio checado={modoPalavra === "specific"} onClick={() => setModoPalavra("specific")}
              label="uma palavra ou expressão específica">
              {modoPalavra === "specific" && (
                <>
                  <input
                    value={palavras}
                    onChange={(e) => setPalavras(e.target.value)}
                    placeholder="Digite uma ou mais palavras"
                    className="mt-3 w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
                  />
                  <p className="mt-1 text-xs text-neutral-600">Use vírgulas para separar as palavras</p>
                  <div className="mt-2 flex items-center gap-2 text-xs text-neutral-500">
                    Por exemplo:
                    {["Preço", "Link", "Comprar"].map((ex) => (
                      <button key={ex} type="button"
                        onClick={() => setPalavras((p) => (p ? `${p}, ${ex}` : ex))}
                        className="rounded-full border border-neutral-700 px-2 py-0.5 hover:border-neutral-500">
                        {ex}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </Radio>
            <Radio checado={modoPalavra === "any"} onClick={() => setModoPalavra("any")}
              label="qualquer palavra" nota="dispara em qualquer comentário — cuidado com volume" />

            <Toggle ligado={interagir} onChange={setInteragir}
              label="interagir com os comentários deles na publicação" />
            {interagir && (
              <input
                value={respostaPublica}
                onChange={(e) => setRespostaPublica(e.target.value)}
                placeholder="te mandei no direct 👀"
                className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
              />
            )}
          </Secao>
        )}

        {passo === 2 && (
          <Secao titulo="Eles receberão">
            <div className="rounded-xl bg-neutral-900/50 p-4">
              <Toggle ligado={boasVindasOn} onChange={setBoasVindasOn} label="uma mensagem de boas-vindas" />
              {boasVindasOn && (
                <>
                  <textarea
                    value={boasVindas}
                    onChange={(e) => setBoasVindas(e.target.value)}
                    rows={6}
                    className="mt-3 w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
                  />
                  <input
                    value={botaoLabel}
                    onChange={(e) => setBotaoLabel(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
                  />
                  <p className="mt-2 text-xs text-neutral-500">
                    O Instagram não deixa mandar link sem interação. O toque no botão é o que
                    autoriza o segundo DM — e quem toca converte muito mais.
                  </p>
                </>
              )}
            </div>
          </Secao>
        )}

        {passo === 3 && (
          <Secao titulo="E então, eles vão receber">
            <div className="rounded-xl bg-neutral-900/50 p-4">
              <p className="text-sm font-medium mb-2">uma DM contendo um link</p>
              <textarea
                value={dmLink}
                onChange={(e) => setDmLink(e.target.value)}
                rows={4}
                placeholder="Escreva uma mensagem"
                className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
              />
              <div className="mt-2 space-y-2">
                {links.map((l, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg border border-neutral-800 px-3 py-2 text-xs">
                    <span className="font-medium">{l.title}</span>
                    <span className="truncate text-neutral-600">{l.url}</span>
                    <button type="button" onClick={() => setLinks((s) => s.filter((_, j) => j !== i))}
                      className="ml-auto text-neutral-500 hover:text-red-400">✕</button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => setModal(true)}
                disabled={links.length >= 3}
                className="mt-2 w-full rounded-lg border border-neutral-700 py-2 text-sm hover:border-neutral-500 disabled:opacity-40">
                + Adicionar Um Link
              </button>
              {links.length >= 3 && (
                <p className="mt-1 text-xs text-neutral-600">O Instagram aceita no máximo 3 botões.</p>
              )}
            </div>
          </Secao>
        )}

        <div className="flex items-center gap-3">
          {passo > 0 && (
            <button type="button" onClick={() => setPasso((p) => p - 1)}
              className="rounded-lg border border-neutral-800 px-4 py-2 text-sm">Voltar</button>
          )}
          {passo < 3 ? (
            <button type="button" onClick={() => setPasso((p) => p + 1)}
              className="rounded-lg border border-neutral-700 px-4 py-2 text-sm hover:border-neutral-500">
              Próximo
            </button>
          ) : (
            <button type="submit" disabled={pending}
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-40">
              {pending ? "Salvando…" : inicial ? "Salvar" : "Ativar"}
            </button>
          )}
          {state && !state.ok && <p className="text-sm text-red-400">{state.message}</p>}
        </div>
      </div>

      {/* ── preview ── */}
      <div className="flex-1 min-w-0">
        <p className="mb-4 text-sm text-neutral-500">Visualização</p>
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

      {modal && <ModalLink onFechar={() => setModal(false)}
        onSalvar={(l) => { setLinks((s) => [...s, l]); setModal(false); }} />}
    </form>
  );
}

/* ───────────── preview do celular ───────────── */

function Telefone({
  aba, conta, post, palavras, boasVindas, botaoLabel, dmLink, links, respostaPublica,
}: {
  aba: string; conta?: Conta; post?: Media; palavras: string; boasVindas: string;
  botaoLabel: string; dmLink: string; links: Link[]; respostaPublica: string;
}) {
  const exemplo = palavras.split(",")[0]?.trim() || "Deixa um comentário";

  return (
    <div className="mx-auto w-[340px]">
      <div className="rounded-[2.5rem] border-4 border-neutral-800 bg-black overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-2 text-[11px] text-neutral-300">
          <span>10:08</span><span>▪▪▪ ▮</span>
        </div>

        {aba === "dm" ? (
          <div className="h-[560px] flex flex-col">
            <div className="flex items-center gap-2 border-b border-neutral-900 px-4 py-3">
              <span className="text-neutral-500">‹</span>
              {conta?.avatarUrl && <img src={conta.avatarUrl} alt="" className="size-7 rounded-full" />}
              <span className="text-sm font-medium text-neutral-100">{conta?.username}</span>
            </div>
            <div className="flex-1 space-y-3 p-4 overflow-y-auto">
              {boasVindas && (
                <div className="max-w-[85%] rounded-2xl bg-neutral-800 p-3">
                  <p className="whitespace-pre-wrap text-[13px] text-neutral-100">{boasVindas}</p>
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
                  <p className="whitespace-pre-wrap text-[13px] text-neutral-100">
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
          <div className="h-[560px] relative">
            {post?.thumb && <img src={post.thumb} alt="" className="h-48 w-full object-cover opacity-40" />}
            <div className="absolute inset-x-0 bottom-0 top-40 rounded-t-2xl bg-neutral-900 p-4">
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
            <p className="py-2 text-center text-[11px] uppercase tracking-wide text-neutral-500">
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
    <section className="space-y-3">
      <h3 className="text-lg font-semibold">{titulo}</h3>
      {children}
    </section>
  );
}

function Radio({
  checado, onClick, label, nota, children,
}: {
  checado: boolean; onClick: () => void; label: string; nota?: string; children?: React.ReactNode;
}) {
  return (
    <div onClick={onClick}
      className={`cursor-pointer rounded-xl p-4 ${checado ? "bg-neutral-900" : "bg-neutral-900/40 hover:bg-neutral-900/70"}`}>
      <div className="flex items-center gap-3">
        <span className={`size-4 shrink-0 rounded-full border-2 ${checado ? "border-blue-500 bg-blue-500" : "border-neutral-600"}`} />
        <span className="text-sm">{label}</span>
      </div>
      {nota && <p className="ml-7 mt-1 text-xs text-neutral-600">{nota}</p>}
      {children}
    </div>
  );
}

function Toggle({ ligado, onChange, label }: { ligado: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
      <span>{label}</span>
      <button type="button" onClick={() => onChange(!ligado)}
        className={`h-6 w-11 shrink-0 rounded-full p-0.5 transition ${ligado ? "bg-blue-600" : "bg-neutral-700"}`}>
        <span className={`block size-5 rounded-full bg-white transition ${ligado ? "translate-x-5" : ""}`} />
      </button>
    </label>
  );
}

function ModalLink({ onFechar, onSalvar }: { onFechar: () => void; onSalvar: (l: Link) => void }) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const valido = title.trim().length > 0 && /^https?:\/\//i.test(url.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-950 p-6">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Adicionar um link</h3>
          <button type="button" onClick={onFechar} className="text-neutral-500 hover:text-neutral-200">✕</button>
        </div>
        <label className="block text-sm mb-1">Texto do botão</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={20}
          className="mb-1 w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm" />
        <p className="mb-4 text-xs text-neutral-600">{title.length}/20 — limite do Instagram</p>
        <label className="block text-sm mb-1">Link</label>
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..."
          className="mb-6 w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm" />
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onFechar}
            className="rounded-lg border border-neutral-800 px-4 py-2 text-sm">Cancelar</button>
          <button type="button" disabled={!valido}
            onClick={() => onSalvar({ title: title.trim(), url: url.trim() })}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white disabled:opacity-40">
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
