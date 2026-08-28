export const metadata = { title: "Política de Privacidade — Social Hub" };

export default function Privacy() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16 prose-invert">
      <h1 className="text-2xl font-semibold mb-2">Política de Privacidade</h1>
      <p className="text-sm text-neutral-500 mb-8">Atualizada em 25 de agosto de 2026</p>

      <Section title="O que é o Social Hub">
        O Social Hub é uma ferramenta interna, de uso pessoal, operada por Gustavo
        (@gustagoat.ia) para gerenciar as próprias contas de Instagram e TikTok. Ele
        automatiza respostas por mensagem direta a comentários e agenda publicações.
        Não é um serviço aberto a terceiros.
      </Section>

      <Section title="Dados que coletamos">
        <ul className="list-disc pl-5 space-y-1">
          <li>Dados das contas conectadas: identificador, nome de usuário e foto de perfil.</li>
          <li>Tokens de acesso fornecidos pelas plataformas, armazenados cifrados (AES-256-GCM).</li>
          <li>
            Comentários públicos feitos nas publicações dessas contas: texto do comentário,
            identificador e nome de usuário de quem comentou.
          </li>
          <li>Registro de quais mensagens automáticas foram enviadas e quando.</li>
        </ul>
      </Section>

      <Section title="Como usamos">
        Exclusivamente para enviar a mensagem direta solicitada por quem comentou uma
        palavra-chave, para publicar conteúdo nas contas conectadas e para exibir métricas
        de uso no painel interno. Não vendemos, alugamos nem compartilhamos esses dados com
        terceiros, e não os usamos para publicidade dirigida a terceiros.
      </Section>

      <Section title="Compartilhamento">
        Os dados ficam no banco de dados da aplicação, hospedado na Vercel e em provedor de
        PostgreSQL gerenciado. Há comunicação com as APIs oficiais da Meta (Instagram) e do
        TikTok, necessária para o funcionamento. Nenhum outro terceiro recebe os dados.
      </Section>

      <Section title="Retenção e exclusão">
        Mantemos os dados enquanto a conta estiver conectada. Você pode pedir a exclusão a
        qualquer momento pela página{" "}
        <a href="/data-deletion" className="underline">exclusão de dados</a>. Revogar o
        acesso do aplicativo nas configurações do Instagram também interrompe qualquer
        coleta nova.
      </Section>

      <Section title="Contato">
        Dúvidas ou solicitações: <strong>coven688@gmail.com</strong>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-base font-semibold mb-2">{title}</h2>
      <div className="text-sm text-neutral-300 leading-relaxed">{children}</div>
    </section>
  );
}
