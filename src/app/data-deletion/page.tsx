import { PageDescription, PageHeader, PageShell, PageTitle } from "@/components/page-shell";

export const metadata = { title: "Exclusão de Dados — Social Hub" };

export default function DataDeletion() {
  return (
    <PageShell largura="sm" className="max-w-2xl gap-8 py-16">
      <PageHeader>
        <PageTitle>Exclusão de dados</PageTitle>
        <PageDescription>Atualizada em 25 de agosto de 2026</PageDescription>
      </PageHeader>

      <p className="text-sm leading-relaxed">
        O Social Hub é uma ferramenta interna de uso pessoal. Se você comentou em uma
        publicação de <strong>@gustagoat.ia</strong> e recebeu uma mensagem automática, os
        únicos dados guardados sobre você são o seu nome de usuário do Instagram, o seu
        identificador na plataforma e o texto do comentário público que você fez.
      </p>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">Como pedir a exclusão</h2>
        <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm leading-relaxed">
          <li>
            Envie um email para <strong>coven688@gmail.com</strong> com o assunto
            <em> &ldquo;Exclusão de dados — Social Hub&rdquo;</em>.
          </li>
          <li>Informe o seu nome de usuário do Instagram.</li>
          <li>
            Os dados são apagados em até <strong>30 dias</strong> e você recebe a confirmação
            por email.
          </li>
        </ol>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">Revogar o acesso do aplicativo</h2>
        <p className="text-sm leading-relaxed">
          Se você conectou uma conta ao aplicativo, pode revogar o acesso a qualquer momento em
          Instagram → Configurações → Aplicativos e sites. Isso interrompe imediatamente
          qualquer coleta nova.
        </p>
      </section>
    </PageShell>
  );
}
