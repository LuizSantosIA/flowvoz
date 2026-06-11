import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Política de Privacidade — FlowVoz',
  description: 'Política de Privacidade do FlowVoz Atendimento',
  robots: { index: true, follow: true },
}

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_PRIVACY_EMAIL?.trim() || 'contato@flowvoz.com.br'
const COMPANY = process.env.NEXT_PUBLIC_COMPANY_NAME?.trim() || 'FlowVoz'

export default function PoliticaPrivacidade() {
  return (
    <div className="h-full overflow-y-auto bg-[#09090b] text-zinc-300">
      <article className="max-w-3xl mx-auto px-6 py-12 leading-relaxed">
        <header className="mb-10 border-b border-zinc-800 pb-6">
          <h1 className="text-3xl font-bold text-white">Política de Privacidade</h1>
          <p className="mt-2 text-sm text-zinc-500">{COMPANY} — Atendimento</p>
          <p className="text-sm text-zinc-500">Última atualização: 11 de junho de 2026</p>
        </header>

        <Section title="1. Quem somos">
          <p>
            O {COMPANY} é uma plataforma de atendimento que utiliza a API oficial do
            WhatsApp Business (WhatsApp Cloud API, fornecida pela Meta) para que nossa
            equipe converse com clientes que entram em contato conosco pelo WhatsApp.
            Esta Política descreve como tratamos os dados pessoais nesse atendimento, em
            conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).
          </p>
        </Section>

        <Section title="2. Quais dados coletamos">
          <p>Ao você nos enviar mensagens pelo WhatsApp, podemos coletar e armazenar:</p>
          <ul className="list-disc pl-6 mt-3 space-y-1">
            <li>Seu número de telefone do WhatsApp;</li>
            <li>Seu nome de perfil exibido no WhatsApp;</li>
            <li>O conteúdo das mensagens que você nos envia (texto, áudios, imagens, documentos, vídeos e localização);</li>
            <li>Data e horário das mensagens e o status de entrega/leitura.</li>
          </ul>
          <p className="mt-3">
            Coletamos apenas os dados necessários para realizar e registrar o atendimento.
            Não solicitamos dados sensíveis e pedimos que você não os compartilhe pelo canal.
          </p>
        </Section>

        <Section title="3. Para que usamos seus dados">
          <ul className="list-disc pl-6 mt-1 space-y-1">
            <li>Responder às suas solicitações e prestar atendimento;</li>
            <li>Manter o histórico da conversa para continuidade do atendimento;</li>
            <li>Melhorar a qualidade do nosso atendimento;</li>
            <li>Cumprir obrigações legais e regulatórias.</li>
          </ul>
          <p className="mt-3">
            A base legal para esse tratamento é a execução de procedimentos a seu pedido
            e o legítimo interesse em prestar atendimento de qualidade.
          </p>
        </Section>

        <Section title="4. Compartilhamento com terceiros">
          <p>
            Não vendemos seus dados. Eles podem ser processados por provedores que
            viabilizam o serviço, exclusivamente para essa finalidade:
          </p>
          <ul className="list-disc pl-6 mt-3 space-y-1">
            <li><strong>Meta Platforms</strong> — provedora da API oficial do WhatsApp Business;</li>
            <li><strong>Provedores de hospedagem e banco de dados</strong> — para armazenar as conversas de forma segura.</li>
          </ul>
        </Section>

        <Section title="5. Por quanto tempo guardamos">
          <p>
            Mantemos os dados pelo tempo necessário ao atendimento e ao cumprimento de
            obrigações legais. Após esse período, os dados são eliminados ou anonimizados.
          </p>
        </Section>

        <Section title="6. Seus direitos (LGPD)">
          <p>Você pode, a qualquer momento, solicitar:</p>
          <ul className="list-disc pl-6 mt-3 space-y-1">
            <li>Confirmação de que tratamos seus dados e acesso a eles;</li>
            <li>Correção de dados incompletos ou desatualizados;</li>
            <li>Eliminação dos seus dados;</li>
            <li>Informações sobre com quem compartilhamos seus dados.</li>
          </ul>
          <p className="mt-3">
            Para exercer esses direitos, fale conosco pelo e-mail informado abaixo.
          </p>
        </Section>

        <Section title="7. Segurança">
          <p>
            Adotamos medidas técnicas e organizacionais para proteger seus dados contra
            acessos não autorizados, perda ou alteração. O acesso às conversas é restrito
            à equipe de atendimento autorizada, mediante autenticação.
          </p>
        </Section>

        <Section title="8. Contato">
          <p>
            Em caso de dúvidas sobre esta Política ou sobre o tratamento dos seus dados,
            entre em contato:
          </p>
          <p className="mt-2">
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-violet-400 hover:text-violet-300 underline">
              {CONTACT_EMAIL}
            </a>
          </p>
        </Section>

        <footer className="mt-12 pt-6 border-t border-zinc-800 text-sm text-zinc-600">
          © {COMPANY}. Todos os direitos reservados.
        </footer>
      </article>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold text-white mb-2">{title}</h2>
      {children}
    </section>
  )
}
