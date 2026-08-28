import type { Metadata } from "next";
import { Geist, Inter, JetBrains_Mono, Oswald, Playfair_Display, Unbounded } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

// Fonte do chrome do app. As cinco de baixo são exclusivas da arte.
const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

// As cinco famílias do sistema de design. É por isso que a renderização saiu do
// canvas pro HTML: canvas não carrega webfont com facilidade, e a tipografia é
// metade do que faz a arte parecer com o original.
const unbounded = Unbounded({ subsets: ["latin"], variable: "--font-unbounded", weight: ["400", "700", "800", "900"] });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", style: ["normal", "italic"], weight: ["400", "700", "800", "900"] });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", weight: ["400", "500", "600", "700", "800", "900"] });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono", weight: ["400", "500", "700", "800"] });
const oswald = Oswald({ subsets: ["latin"], variable: "--font-oswald", weight: ["400", "500", "600", "700"] });

const FONTES = [unbounded, playfair, inter, jetbrains, oswald].map((f) => f.variable).join(" ");

const NAV = [
  { href: "/", label: "Painel" },
  { href: "/posts", label: "Publicações" },
  { href: "/automations", label: "Automações" },
  { href: "/replicar", label: "Replicar" },
  { href: "/produzir", label: "Produzir" },
  { href: "/compose", label: "Novo post" },
];

export const metadata: Metadata = {
  title: "Social Hub",
  description: "Automação de DM e publicação multi-perfil (Instagram + TikTok)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // O painel é dark-only: a classe fica fixa aqui em vez de instalar next-themes,
  // que forçaria um client boundary no root e quebraria os `db.select()` das páginas.
  return (
    <html lang="pt-BR" className={cn("dark font-sans", FONTES, geist.variable)}>
      <body>
        <nav className="border-b">
          <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-6">
            <Link href="/" className="text-sm font-semibold">
              Social Hub
            </Link>
            <div className="flex gap-4 text-sm text-muted-foreground">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href} className="transition-colors hover:text-foreground">
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </nav>
        {children}
        <Toaster theme="dark" position="top-right" />
      </body>
    </html>
  );
}
