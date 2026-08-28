"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV } from "./nav";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

/**
 * A paleta ⌘K.
 *
 * Num painel de operação a navegação por mouse é a mais lenta das opções: quem
 * usa isso todo dia sabe o nome da tela e não quer caçar o link. A paleta lê a
 * mesma `NAV` da sidebar, então nunca há uma tela alcançável por uma e não pela
 * outra.
 */
export function CommandPalette() {
  const [aberta, setAberta] = useState(false);
  const router = useRouter();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setAberta((v) => !v);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function ir(href: string) {
    setAberta(false);
    router.push(href);
  }

  return (
    <CommandDialog
      open={aberta}
      onOpenChange={setAberta}
      title="Ir para"
      description="Busque uma tela pelo nome"
    >
      <CommandInput placeholder="Ir para…" />
      <CommandList>
        <CommandEmpty>Nada com esse nome.</CommandEmpty>
        {NAV.map((g) => (
          <CommandGroup key={g.grupo ?? "raiz"} heading={g.grupo ?? undefined}>
            {g.itens.map((i) => (
              <CommandItem
                key={i.href}
                value={`${i.label} ${i.dica} ${i.href}`}
                onSelect={() => ir(i.href)}
              >
                <i.icon />
                <span>{i.label}</span>
                <span className="ml-auto truncate text-xs text-muted-foreground">{i.dica}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}

/** O campo falso da sidebar que abre a paleta. Dispara o mesmo ⌘K. */
export function CommandTrigger() {
  function abrir() {
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }),
    );
  }

  return (
    <button
      type="button"
      onClick={abrir}
      className="flex h-8 w-full items-center gap-2 rounded-md border bg-surface-elevated px-2.5 text-sm text-muted-foreground transition-colors hover:border-hairline-strong hover:text-foreground"
    >
      <span className="flex-1 text-left">Ir para…</span>
      <kbd className="keycap">⌘K</kbd>
    </button>
  );
}
