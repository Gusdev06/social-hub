export const metadata = { title: "Exclusão de Dados — Social Hub" };

export default function DataDeletion() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold mb-2">Exclusão de dados</h1>
      <p className="text-sm text-neutral-500 mb-8">Atualizada em 25 de agosto de 2026</p>

      <p className="text-sm text-neutral-300 leading-relaxed mb-6">
        O Social Hub é uma ferramenta interna de uso pessoal. Se você comentou em uma
        publicação de <strong>@gustagoat.ia</strong> e recebeu uma mensagem automática, os
        únicos dados guardados sobre você são o seu nome de usuário do Instagram, o seu
        identificador na plataforma e o texto do comentário público que você fez.
      </p>

      <h2 className="text-base font-semibold mb-2">Como pedir a exclusão</h2>
      <ol className="list-decimal pl-5 text-sm text-neutral-300 space-y-2 mb-8">
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

      <h2 className="text-base font-semibold mb-2">Revogar o acesso do aplicativo</h2>
      <p className="text-sm text-neutral-300 leading-relaxed">
        Se você conectou uma conta ao aplicativo, pode revogar o acesso a qualquer momento em
        Instagram → Configurações → Aplicativos e sites. Isso interrompe imediatamente
        qualquer coleta nova.
      </p>
    </main>
  );
}
