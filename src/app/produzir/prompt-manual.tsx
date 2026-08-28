"use client";

import { useState, useTransition } from "react";

/**
 * O prompt de registro de um clipe — o texto que vai mesmo pro modelo de vídeo.
 *
 * Aparece ABERTO quando a rodada está parada esperando conferência deste clipe
 * (`portao`): é o momento em que o prompt importa, e escondê-lo atrás de um link
 * seria pedir confirmação de algo que o Gusta não está vendo.
 *
 * Salvar não gera nada de propósito. Conferir é preparação; quem dispara crédito
 * de vídeo é o "Confirmei — seguir".
 */
export function PromptManual({
  id, n, prompt, origem, portao, acao,
}: {
  id: string;
  n: number;
  prompt: string;
  origem?: "llm" | "humano";
  /** A esteira parou esperando a conferência DESTE clipe. */
  portao?: boolean;
  acao: (id: string, n: number, prompt: string) => Promise<void>;
}) {
  const [v, setV] = useState(prompt);
  const [aberto, setAberto] = useState(false);
  const [pending, start] = useTransition();

  if (!aberto && !portao) {
    return (
      <button
        onClick={() => setAberto(true)}
        className={`text-[11px] underline ${
          prompt ? "text-neutral-500 hover:text-neutral-300" : "text-neutral-600 hover:text-neutral-400"
        }`}
      >
        {!prompt
          ? "escrever o prompt à mão"
          : origem === "humano"
            ? "prompt seu — a LLM não é chamada neste clipe"
            : "ver o prompt usado"}
      </button>
    );
  }

  return (
    <div className={`mt-1 space-y-2 ${portao ? "rounded border border-amber-900/60 bg-amber-950/10 p-3" : ""}`}>
      {portao && (
        <p className="text-[11px] text-amber-300">
          Confira o prompt do clipe {n} antes de gerar. Corrija aqui se precisar; depois use
          “Confirmei — seguir”.
        </p>
      )}
      <textarea
        value={v}
        onChange={(e) => setV(e.target.value)}
        rows={5}
        placeholder="Seu prompt para este clipe. Preenchido, substitui o escritor de prompt — nenhuma chamada de LLM acontece."
        className="w-full rounded border border-neutral-800 bg-transparent p-3 font-mono text-[11px] leading-relaxed"
      />
      <p className="text-[11px] text-neutral-600">
        Vale só para o clipe {n}. Vazio devolve o clipe para o escritor automático.
        {origem === "llm" && !portao && " Escrito pela LLM."}
      </p>
      <div className="flex gap-2">
        <button
          disabled={pending || v.trim() === prompt.trim()}
          onClick={() => start(async () => { await acao(id, n, v); setAberto(false); })}
          className="rounded bg-neutral-100 px-3 py-1.5 text-[11px] font-medium text-neutral-950 disabled:opacity-40"
        >
          {pending ? "salvando…" : "Salvar"}
        </button>
        <button
          onClick={() => { setV(prompt); setAberto(false); }}
          className="rounded border border-neutral-800 px-3 py-1.5 text-[11px]"
        >
          cancelar
        </button>
      </div>
    </div>
  );
}
