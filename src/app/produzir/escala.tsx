"use client";

import { useState, useTransition } from "react";

/**
 * O único número da composição que ainda é palpite. Recompor é ffmpeg local —
 * custo zero — então iterar aqui é mais barato que tentar acertar de primeira.
 */
export function Escala({
  id, escala, acao,
}: {
  id: string;
  escala: number;
  acao: (id: string, escala: number) => Promise<void>;
}) {
  const [v, setV] = useState(escala);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-1">
      <label className="text-[11px] text-neutral-500">
        escala do avatar na faixa: <span className="text-neutral-300">{v.toFixed(2)}</span>
      </label>
      <input
        type="range"
        min={0.4}
        max={1}
        step={0.02}
        value={v}
        onChange={(e) => setV(Number(e.target.value))}
        className="w-full"
      />
      <button
        disabled={pending || v === escala}
        onClick={() => start(() => acao(id, v))}
        className="rounded border border-neutral-800 px-2 py-1 text-[11px] disabled:opacity-40"
      >
        {pending ? "recompondo…" : "Recompor nessa escala"}
      </button>
    </div>
  );
}
