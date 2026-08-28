"use client";

import { useState, useTransition } from "react";

/**
 * Guarda o avatar desta rodada no acervo, pra reusar em outras.
 *
 * O que é salvo não é só a imagem: vai junto a nota de casting, que reaparece
 * literalmente em todo prompt de clipe e é o que faz o modelo reconhecer a mesma
 * pessoa entre um clipe e outro. Por isso o botão só aparece quando os dois
 * existem.
 */
export function SalvarAvatar({
  id, sugestao, acao,
}: {
  id: string;
  /** O brief da rodada vira o nome proposto — quase sempre é o nome certo. */
  sugestao: string;
  acao: (id: string, nome: string) => Promise<void>;
}) {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState(sugestao);
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (salvo) {
    return <p className="text-[11px] text-emerald-400/80">avatar salvo no acervo</p>;
  }

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="text-[11px] text-neutral-500 underline hover:text-neutral-300"
      >
        salvar este avatar para reusar
      </button>
    );
  }

  return (
    <div className="space-y-1.5">
      <input
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder="como você vai chamar esse personagem"
        className="w-full rounded border border-neutral-800 bg-transparent px-2 py-1.5 text-xs"
      />
      <p className="text-[11px] text-neutral-600">
        Salva a imagem e a nota de casting. Nas próximas rodadas dá para escolher este
        avatar e a esteira pula a geração do rosto.
      </p>
      {erro && <p className="text-[11px] text-red-400">{erro}</p>}
      <div className="flex gap-2">
        <button
          disabled={pending || !nome.trim()}
          onClick={() =>
            start(async () => {
              try {
                await acao(id, nome);
                setSalvo(true);
              } catch (e) {
                setErro((e as Error).message);
              }
            })
          }
          className="rounded bg-neutral-100 px-3 py-1.5 text-[11px] font-medium text-neutral-950 disabled:opacity-40"
        >
          {pending ? "salvando…" : "Salvar no acervo"}
        </button>
        <button
          onClick={() => setAberto(false)}
          className="rounded border border-neutral-800 px-3 py-1.5 text-[11px]"
        >
          cancelar
        </button>
      </div>
    </div>
  );
}
