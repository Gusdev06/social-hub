import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Oswald, Playfair_Display, Unbounded } from "next/font/google";
import "./globals.css";
import { CommandPalette } from "@/components/app-shell/command-palette";
import { PageTransition } from "@/components/app-shell/page-transition";
import { Sidebar, TopBarMobile } from "@/components/app-shell/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

// As cinco famílias do sistema de design. É por isso que a renderização saiu do
// canvas pro HTML: canvas não carrega webfont com facilidade, e a tipografia é
// metade do que faz a arte parecer com o original.
//
// O Inter é o único que serve aos dois lados: a arte usa `--font-inter` direto,
// e o painel usa a MESMA instância via `--font-sans` (ver globals.css). Uma
// família a menos pra baixar, e o ss03 vem junto.
const unbounded = Unbounded({ subsets: ["latin"], variable: "--font-unbounded", weight: ["400", "700", "800", "900"] });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", style: ["normal", "italic"], weight: ["400", "700", "800", "900"] });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", weight: ["400", "500", "600", "700", "800", "900"] });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono", weight: ["400", "500", "700", "800"] });
const oswald = Oswald({ subsets: ["latin"], variable: "--font-oswald", weight: ["400", "500", "600", "700"] });

const FONTES = [unbounded, playfair, inter, jetbrains, oswald].map((f) => f.variable).join(" ");

export const metadata: Metadata = {
  title: "Social Hub",
  description: "Automação de DM e publicação multi-perfil (Instagram + TikTok)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // O painel é dark-only: a classe fica fixa aqui em vez de instalar next-themes,
  // que forçaria um client boundary no root e quebraria os `db.select()` das páginas.
  return (
    <html lang="pt-BR" className={cn("dark font-sans", FONTES)}>
      <body>
        <Sidebar />
        <TopBarMobile />
        <div className="md:pl-60">
          <PageTransition>{children}</PageTransition>
        </div>
        <CommandPalette />
        <Toaster theme="dark" position="top-right" />
      </body>
    </html>
  );
}
