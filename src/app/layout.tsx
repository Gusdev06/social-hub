import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Oswald, Playfair_Display, Unbounded } from "next/font/google";
import Link from "next/link";
import "./globals.css";

// As cinco famílias do sistema de design. É por isso que a renderização saiu do
// canvas pro HTML: canvas não carrega webfont com facilidade, e a tipografia é
// metade do que faz a arte parecer com o original.
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
  return (
    <html lang="pt-BR" className={FONTES}>
      <body>
        <nav className="border-b border-neutral-900">
          <div className="mx-auto max-w-5xl px-6 flex items-center gap-6 h-14">
            <Link href="/" className="font-semibold text-sm">Social Hub</Link>
            <div className="flex gap-4 text-sm text-neutral-400">
              <Link href="/" className="hover:text-neutral-100">Painel</Link>
              <Link href="/posts" className="hover:text-neutral-100">Publicações</Link>
              <Link href="/automations" className="hover:text-neutral-100">Automações</Link>
              <Link href="/replicar" className="hover:text-neutral-100">Replicar</Link>
              <Link href="/produzir" className="hover:text-neutral-100">Produzir</Link>
              <Link href="/compose" className="hover:text-neutral-100">Novo post</Link>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
