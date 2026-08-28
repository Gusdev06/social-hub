import { cn } from "@/lib/utils";

const LARGURAS = {
  sm: "max-w-xl",
  md: "max-w-4xl",
  lg: "max-w-6xl",
  full: "max-w-none",
} as const;

/**
 * Casca padrão de página. Antes cada rota escrevia a própria combinação de
 * `mx-auto max-w-* px-6 py-12 space-y-*`, e as quatro variações que existiam
 * eram acidentais, não intencionais.
 *
 * O ritmo vertical de 96px do sistema é de página de marketing; aqui a densidade
 * é de painel, então o intervalo entre seções cai pra 32px.
 */
export function PageShell({
  largura = "md",
  className,
  ...props
}: React.ComponentProps<"main"> & { largura?: keyof typeof LARGURAS }) {
  return (
    <main
      className={cn(
        "mx-auto flex flex-col gap-8 px-6 py-10 md:px-10",
        LARGURAS[largura],
        className,
      )}
      {...props}
    />
  );
}

export function PageHeader({ className, ...props }: React.ComponentProps<"header">) {
  return (
    <header
      className={cn("flex flex-col gap-1 border-b border-hairline-soft pb-5", className)}
      {...props}
    />
  );
}

export function PageTitle({ className, ...props }: React.ComponentProps<"h1">) {
  return (
    <h1
      className={cn("text-xl font-medium tracking-tight text-foreground", className)}
      {...props}
    />
  );
}

export function PageDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p className={cn("max-w-prose text-sm text-muted-foreground", className)} {...props} />
  );
}
