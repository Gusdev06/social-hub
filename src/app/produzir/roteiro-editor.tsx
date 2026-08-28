"use client";

import { useState, useTransition } from "react";

/**
 * O roteiro é o ativo testado — e o que sai daqui vira US$ 0,56 por clipe no
 * Kling. Conferir e corrigir antes custa segundos; descobrir depois custa a
 * rodada.
 */
export function RoteiroEditor({
  id, texto, acao,
}: {
  id: string;
  texto: string;
  acao: (id: string, texto: string) => Promise<void>;
}) {
  const [v, setV] = useState(texto);
  const [pending, start] = useTransition();
  const [aberto, setAberto] = useState(false);

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="text-[11px] text-neutral-500 hover:text-neutral-300 underline"
      >
        corrigir o roteiro
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <textarea
        value={v}
        onChange={(e) => setV(e.target.value)}
        rows={6}
        className="w-full rounded border border-neutral-800 bg-transparent p-3 text-xs leading-relaxed"
      />
      <p className="text-[11px] text-neutral-600">
        A pontuação define onde os clipes cortam. Refatiar não re-transcreve — custo zero.
      </p>
      <div className="flex gap-2">
        <button
          disabled={pending || v.trim() === texto.trim()}
          onClick={() => start(() => acao(id, v))}
          className="rounded bg-neutral-100 px-3 py-1.5 text-[11px] font-medium text-neutral-950 disabled:opacity-40"
        >
          {pending ? "refatiando…" : "Salvar e refatiar"}
        </button>
        <button
          onClick={() => { setV(texto); setAberto(false); }}
          className="rounded border border-neutral-800 px-3 py-1.5 text-[11px]"
        >
          cancelar
        </button>
      </div>
    </div>
  );
}
