import { cn } from "@/lib/utils";

const LARGURAS = {
  sm: "max-w-xl",
  md: "max-w-5xl",
  lg: "max-w-6xl",
} as const;

/**
 * Casca padrão de página. Antes cada rota escrevia a própria combinação de
 * `mx-auto max-w-* px-6 py-12 space-y-*`, e as quatro variações que existiam
 * eram acidentais, não intencionais.
 */
export function PageShell({
  largura = "md",
  className,
  ...props
}: React.ComponentProps<"main"> & { largura?: keyof typeof LARGURAS }) {
  return (
    <main
      className={cn(
        "mx-auto flex flex-col gap-8 px-6 py-12",
        LARGURAS[largura],
        className,
      )}
      {...props}
    />
  );
}

export function PageHeader({ className, ...props }: React.ComponentProps<"header">) {
  return <header className={cn("flex flex-col gap-1", className)} {...props} />;
}

export function PageTitle({ className, ...props }: React.ComponentProps<"h1">) {
  return (
    <h1 className={cn("text-2xl font-semibold tracking-tight", className)} {...props} />
  );
}

export function PageDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />;
}
