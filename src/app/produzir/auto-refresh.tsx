"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * O worker roda fora da Vercel e não tem canal de push pra cá. Enquanto houver
 * rodada em andamento, a página se atualiza sozinha — uma rodada leva 15 min e
 * ninguém deveria ficar apertando F5.
 */
export function AutoRefresh({ ativo, ms = 15000 }: { ativo: boolean; ms?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!ativo) return;
    const t = setInterval(() => router.refresh(), ms);
    return () => clearInterval(t);
  }, [ativo, ms, router]);
  return null;
}
