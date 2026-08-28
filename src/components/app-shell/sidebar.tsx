"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { NAV, itemAtivo } from "./nav";
import { CommandTrigger } from "./command-palette";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  const ativo = itemAtivo(pathname);

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r bg-surface md:flex">
      <div className="flex flex-col gap-3 p-3">
        <Link
          href="/"
          className="flex items-center gap-2 px-1.5 py-1 text-sm font-medium tracking-tight"
        >
          {/* Três faixas diagonais: o gesto de assinatura do sistema, no menor
              tamanho em que ainda se lê. */}
          <span className="flex h-5 w-5 shrink-0 -skew-x-12 items-stretch gap-[2px] overflow-hidden rounded-xs">
            <span className="flex-1 bg-accent-red" />
            <span className="flex-1 bg-accent-red/60" />
            <span className="flex-1 bg-accent-red/25" />
          </span>
          Social Hub
        </Link>
        <CommandTrigger />
      </div>

      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 pb-4">
        {NAV.map((g) => (
          <div key={g.grupo ?? "raiz"} className="flex flex-col gap-0.5">
            {g.grupo && (
              <p className="px-2.5 pb-1 text-[11px] font-medium tracking-wider text-ash uppercase">
                {g.grupo}
              </p>
            )}
            {g.itens.map((i) => {
              const estaAtivo = ativo?.href === i.href;
              return (
                <Link
                  key={i.href}
                  href={i.href}
                  data-active={estaAtivo}
                  aria-current={estaAtivo ? "page" : undefined}
                  className="cmd-row text-muted-foreground"
                >
                  {/* A barra de ativo é UM elemento que se move entre os itens em
                      vez de sumir e reaparecer — o olho segue o objeto e entende
                      para onde foi. */}
                  {estaAtivo && (
                    <motion.span
                      layoutId="nav-ativo"
                      className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-accent-red"
                      transition={{ type: "spring", stiffness: 500, damping: 40 }}
                    />
                  )}
                  <i.icon
                    className={cn("size-4 shrink-0", estaAtivo && "text-foreground")}
                  />
                  <span className={cn("truncate", estaAtivo && "text-foreground")}>
                    {i.label}
                  </span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}

/** Barra de topo do mobile: a sidebar some abaixo de `md`, o ⌘K continua. */
export function TopBarMobile() {
  const pathname = usePathname();
  const ativo = itemAtivo(pathname);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-canvas/80 px-4 backdrop-blur-md md:hidden">
      <Link href="/" className="text-sm font-medium">
        Social Hub
      </Link>
      {ativo && (
        <>
          <span className="text-ash">/</span>
          <span className="text-sm text-muted-foreground">{ativo.label}</span>
        </>
      )}
      <div className="ml-auto w-36">
        <CommandTrigger />
      </div>
    </header>
  );
}
