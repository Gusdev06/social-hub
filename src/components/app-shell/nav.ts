import {
  FilmIcon,
  ImagesIcon,
  LayersIcon,
  LayoutDashboardIcon,
  PenLineIcon,
  UserRoundIcon,
  VideoIcon,
  ZapIcon,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Aparece na paleta ⌘K, onde o rótulo sozinho não diz o que a tela faz. */
  dica: string;
};

export type NavGrupo = {
  /** `null` = item solto no topo, sem cabeçalho de grupo. */
  grupo: string | null;
  itens: NavItem[];
};

/**
 * Fonte única da navegação: a sidebar e a paleta ⌘K leem daqui.
 *
 * O agrupamento é por VERBO — o que você faz, não onde o dado mora. Antes eram
 * seis links soltos no topo e duas telas (`/videos` e `/avatares`) que não
 * apareciam em lugar nenhum: só dava pra chegar nelas por um link enterrado
 * dentro de `/produzir`.
 */
export const NAV: NavGrupo[] = [
  {
    grupo: null,
    itens: [
      { href: "/", label: "Painel", icon: LayoutDashboardIcon, dica: "visão geral de leads, DMs e perfis" },
    ],
  },
  {
    grupo: "Produzir",
    itens: [
      { href: "/produzir", label: "Vídeo", icon: VideoIcon, dica: "clonar um criativo trocando o avatar" },
      { href: "/replicar", label: "Carrossel", icon: LayersIcon, dica: "teardown de um post e replicação" },
      { href: "/avatares", label: "Avatares", icon: UserRoundIcon, dica: "acervo de personagens pra reusar" },
      { href: "/videos", label: "Acervo", icon: FilmIcon, dica: "tudo que a esteira já produziu" },
    ],
  },
  {
    grupo: "Publicar",
    itens: [
      { href: "/compose", label: "Novo post", icon: PenLineIcon, dica: "publicar ou agendar em vários perfis" },
      { href: "/posts", label: "Publicações", icon: ImagesIcon, dica: "o que já está no ar" },
    ],
  },
  {
    grupo: "Automação",
    itens: [
      { href: "/automations", label: "Regras", icon: ZapIcon, dica: "comentário vira DM automática" },
    ],
  },
];

export const TODOS_OS_ITENS: NavItem[] = NAV.flatMap((g) => g.itens);

/** O item da nav que responde por uma rota — `/automations/new` cai em `/automations`. */
export function itemAtivo(pathname: string): NavItem | undefined {
  return TODOS_OS_ITENS
    .filter((i) => (i.href === "/" ? pathname === "/" : pathname.startsWith(i.href)))
    .sort((a, b) => b.href.length - a.href.length)[0];
}
