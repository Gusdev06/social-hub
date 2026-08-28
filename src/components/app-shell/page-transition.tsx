"use client";

import { usePathname } from "next/navigation";
import { motion } from "motion/react";

/**
 * Entrada de página. A chave é o pathname, então o nó remonta a cada navegação
 * e a animação dispara de novo — `layout.tsx` sozinho não re-renderiza no App
 * Router, e sem isso a troca de tela seria um corte seco.
 *
 * Os filhos continuam sendo Server Components: chegam como prop já renderizada,
 * então nada aqui puxa a árvore inteira pro cliente.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
