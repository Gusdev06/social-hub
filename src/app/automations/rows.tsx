"use client";

import Link from "next/link";

import { useState, useTransition } from "react";
import { deleteAutomations, toggleAutomation } from "./actions";

type Linha = {
  id: string;
  name: string;
  isActive: boolean;
  keywords: string[];
  triggerScope: string;
  mediaIds: string[];
  executions: number;
  clicks: number;
  createdAt: string;
  username: string;
};

const ESCOPO: Record<string, string> = {
  specific: "Publicação ou Reel específico",
  any: "qualquer publicação ou Reel",
  next: "próxima publicação ou Reel",
};

export function AutomationRows({ linhas }: { linhas: Linha[] }) {
  const [sel, setSel] = useState<string[]>([]);
  const [pending, start] = useTransition();

  const todas = sel.length === linhas.length && linhas.length > 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-neutral-500 px-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={todas}
            onChange={(e) => setSel(e.target.checked ? linhas.map((l) => l.id) : [])}
            className="size-4 accent-neutral-300"
          />
          Nome
        </label>
        <div className="flex gap-8">
          {sel.length > 0 && (
            <button
              onClick={() => start(async () => { await deleteAutomations(sel); setSel([]); })}
              disabled={pending}
              className="text-red-400 hover:text-red-300"
            >
              🗑 Excluir {sel.length}
            </button>
          )}
          <span className="w-16 text-right">Execuções</span>
          <span className="w-12 text-right">CTR</span>
          <span className="w-24 text-right">Modificado</span>
        </div>
      </div>

      {linhas.map((a) => {
        const ctr = a.executions > 0 ? (a.clicks / a.executions) * 100 : 0;
        return (
          <div key={a.id} className="rounded-xl border border-neutral-800 p-4 hover:border-neutral-700">
            <div className="flex items-center justify-between gap-4">
              <label className="flex items-center gap-3 min-w-0 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sel.includes(a.id)}
                  onChange={(e) =>
                    setSel((s) => (e.target.checked ? [...s, a.id] : s.filter((x) => x !== a.id)))
                  }
                  className="size-4 accent-neutral-300 shrink-0"
                />
                <button
                  onClick={() => start(() => toggleAutomation(a.id, !a.isActive))}
                  className={`shrink-0 rounded px-2 py-0.5 text-[11px] font-bold tracking-wide ${
                    a.isActive ? "bg-red-600 text-white" : "bg-neutral-800 text-neutral-400"
                  }`}
                  title={a.isActive ? "Clique pra pausar" : "Clique pra ativar"}
                >
                  {a.isActive ? "LIVE" : "PAUSADA"}
                </button>
                <Link href={`/automations/${a.id}`} className="truncate font-medium hover:underline">
                  {a.name}
                </Link>
              </label>
              <div className="flex gap-8 text-sm shrink-0">
                <span className="w-16 text-right tabular-nums">{a.executions}</span>
                <span className="w-12 text-right tabular-nums">{ctr.toFixed(1)}%</span>
                <span className="w-24 text-right text-neutral-500 text-xs">
                  {new Date(a.createdAt).toLocaleDateString("pt-BR")}
                </span>
              </div>
            </div>

            <p className="mt-2 ml-11 text-xs text-neutral-500 truncate">
              <span className="text-pink-500">◎</span> O usuário deixa um comentário em{" "}
              {ESCOPO[a.triggerScope]}
              {a.keywords.length > 0 && (
                <> com <span className="text-neutral-300">{a.keywords.join(", ")}</span></>
              )}
              {" · "}@{a.username}
            </p>
          </div>
        );
      })}
    </div>
  );
}
