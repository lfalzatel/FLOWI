// Versión en portugués de Portugal (pt-PT) de la política de privacidad y los términos de uso (app/legal/page.tsx).
// Es una traducción para leer más fácil: si hay diferencias, rige la versión en español (se indica en la página).
import { FREE_LIMITS, PLANS } from '@/lib/plans';
import { formatCurrency } from '@/lib/format';
import type { Block } from './content-en';

export const UPDATED_PT = '26 de novembro de 2026';

export function privacyPt(email: string): Block[] {
  return [
    {
      title: '1. Quem trata os teus dados',
      body: [
        'A FLOWI é uma aplicação de finanças pessoais feita na Colômbia por um programador independente, que é o responsável pelo tratamento dos teus dados.',
        `Para qualquer dúvida, reclamação ou pedido sobre os teus dados, escreve-nos para ${email} ou pelo WhatsApp para +57 310 460 4592 (também a partir do botão do WhatsApp na parte superior da app).`,
      ],
    },
    {
      title: '2. Que dados guardamos',
      body: [[
        'Da tua conta Google: nome, e-mail e foto de perfil. Nunca conhecemos a tua palavra-passe da Google.',
        'O que tu registas: despesas, receitas, dívidas, contas (nome do banco e saldo, nunca números de conta), investimentos e poupanças, metas, orçamentos, lembretes, notas e vendas do teu negócio.',
        'Dados de utilização: os dias em que abres a app e a tua sequência, para tos mostrar e perceber como a FLOWI é utilizada.',
        'Notificações: um identificador do teu telemóvel para te enviar lembretes, se os ativares.',
        'Amigos e chat: o teu nome, foto e @utilizador (a única coisa que outras pessoas vêem), os teus amigos, as mensagens que envias e recebes no chat, os chats que bloqueias com PIN, a duração das mensagens temporárias e os contactos que bloqueias.',
        'Denúncias: se denunciares alguém, guardamos o motivo, o que escreveres e as últimas mensagens que essa pessoa te enviou, para podermos analisar o caso.',
        'Pagamentos: referência, plano, valor, data e estado. A FLOWI não vê nem guarda os dados do teu cartão ou da tua conta bancária; esses são geridos pela Wompi.',
        'Comprovativos de transferência: se pagares por transferência bancária, guardamos a imagem que carregas para podermos verificar o pagamento.',
      ]],
    },
    {
      title: '3. Para que os usamos',
      body: [[
        'Mostrar-te as tuas finanças, cálculos, resumos e lembretes.',
        'Enviar-te as notificações que ativaste (próximos pagamentos, resumo diário, fim do teu plano).',
        'Ativar e gerir o teu plano Premium.',
        'Dar-te suporte, corrigir erros e melhorar a app.',
      ], 'Não vendemos, alugamos nem partilhamos os teus dados para fins publicitários. A FLOWI não tem anúncios.'],
    },
    {
      title: '4. Quem mais os pode ver',
      body: [
        'Cada conta vê unicamente a sua própria informação. O administrador da FLOWI só pode consultar a informação das contas para dar suporte, rever pagamentos e corrigir erros, tratando-a com total confidencialidade.',
        'As mensagens do chat só são vistas pelas duas pessoas da conversa. O administrador apenas vê as mensagens que alguém envia ao fazer uma denúncia.',
        'Utilizamos estes fornecedores, que tratam os dados por nossa conta:',
        [
          'Google Firebase: início de sessão, armazenamento de dados e notificações. Os seus servidores podem estar fora da Colômbia (por exemplo, nos Estados Unidos), o que implica uma transferência internacional de dados que autorizas ao usar a FLOWI.',
          'Wompi (Bancolombia): processa os pagamentos com cartão, Nequi, PSE ou Bancolombia.',
          'Paddle (Paddle.com Market Limited): para pagamentos feitos fora da Colômbia é o revendedor do FLOWI Premium; recebe o teu e-mail, país e dados de pagamento para efetuar a cobrança e emitir a fatura, e a FLOWI nunca vê o teu cartão.',
          'OpenRouter: apenas se ligares o assistente com IA. A frase que ditas ou a foto do recibo é enviada para o modelo gratuito para a compreender; essas fotos não ficam guardadas na FLOWI. A chave de ligação fica guardada apenas no teu telemóvel.',
        ],
      ],
    },
    {
      title: '5. Os teus direitos',
      body: [
        'Como titular dos teus dados podes, a qualquer momento:',
        [
          'Conhecer, atualizar e corrigir os teus dados.',
          'Pedir prova da autorização que nos deste.',
          'Saber que utilização demos aos teus dados.',
          'Revogar a autorização e pedir que apaguemos os teus dados.',
          'Apresentar queixa junto da Superintendencia de Industria y Comercio (SIC) da Colômbia se considerares que os teus direitos não foram respeitados.',
        ],
        `Escreve-nos para ${email} ou pelo WhatsApp. Respondemos a consultas num máximo de 10 dias úteis e a reclamações num máximo de 15 dias úteis, conforme exige a lei.`,
      ],
    },
    {
      title: '6. Durante quanto tempo os guardamos e como eliminar a tua conta',
      body: [
        'Enquanto tiveres a tua conta na FLOWI. Se pedires para a eliminar, apagamos os teus dados num máximo de 15 dias úteis, exceto o registo dos pagamentos efetuados, que é conservado pelo tempo exigido por lei.',
        'As mensagens temporárias apagam-se sozinhas quando termina o tempo escolhido. As denúncias do chat são conservadas enquanto são analisadas e para prevenir abusos.',
        'Para eliminares tu mesmo a tua conta da FLOWI:',
        [
          'Abre a FLOWI e inicia sessão.',
          'Vai a Definições → Dados e privacidade.',
          'Toca em "Eliminar a minha conta" e confirma. São apagados no momento o teu perfil, as tuas despesas, receitas, dívidas, contas, metas, poupanças, lembretes, recibos, os teus amigos e os teus chats com todas as mensagens.',
        ],
        `Também podes pedi-lo sem entrar na app escrevendo para ${email} a partir do e-mail com que te registaste. Apenas é conservado o registo dos pagamentos do Premium (data, valor e plano), sem os teus outros dados, pelo tempo exigido por lei.`,
      ],
    },
    {
      title: '7. Segurança',
      body: [
        'A ligação à FLOWI é encriptada, o acesso é feito com a tua conta Google e a base de dados tem regras que impedem uma conta de ler a informação de outra. Ainda assim, nenhum sistema é 100 % seguro: protege o acesso ao teu telemóvel e à tua conta Google.',
      ],
    },
    {
      title: '8. Menores de idade',
      body: ['A FLOWI destina-se a maiores de 18 anos. Se fores menor, utiliza-a com autorização da tua mãe, pai ou representante legal.'],
    },
    {
      title: '9. Alterações a esta política',
      body: [`Se alterarmos algo importante, avisar-te-emos dentro da app. Esta política está em vigor desde ${UPDATED_PT}.`],
    },
  ];
}

const PLAN_PT: Record<string, string> = { mensual: 'Mensal', trimestral: '3 meses', anual: 'Anual' };

export function termsPt(email: string): Block[] {
  const plansText = PLANS.map(p => `${PLAN_PT[p.id] || p.label}: ${formatCurrency(p.price, 'COP')}`).join(' · ');
  return [
    {
      title: '1. O que é a FLOWI',
      body: [
        'A FLOWI é uma ferramenta para organizar o teu dinheiro. Não é um banco, não movimenta o teu dinheiro, não se liga às tuas contas bancárias e não dá aconselhamento financeiro nem de investimento.',
        'Os cálculos (“Hoje podes gastar”, juros de depósitos a prazo e dívidas, projeções, resumos) são estimativas feitas a partir do que tu registas. Confirma sempre os valores oficiais junto do teu banco ou entidade.',
      ],
    },
    {
      title: '2. A tua conta',
      body: ['Entras com a tua conta Google. És responsável pela informação que registas e pelo acesso ao teu telemóvel e à tua conta.'],
    },
    {
      title: '3. Plano grátis',
      body: [
        'A FLOWI é grátis para sempre, com estes limites:',
        [
          'Despesas, receitas, dívidas, contas, lembretes e notas: ilimitados.',
          `Investimentos e poupanças ativos: ${FREE_LIMITS.investments}.`,
          `Metas ativas: ${FREE_LIMITS.goals}.`,
          `Recibos lidos por foto: ${FREE_LIMITS.receiptsPerDay} por dia.`,
          'O meu negócio: apenas o mês atual.',
        ],
        'Se algum dia alterarmos estes limites avisar-te-emos antes, e nunca apagaremos o que já registaste.',
      ],
    },
    {
      title: '4. FLOWI Premium',
      body: [
        `O Premium retira os limites do plano grátis. Preços (pesos colombianos): ${plansText}.`,
        [
          'É um pagamento único pelo período que escolhes. Não é uma cobrança automática: não guardamos o teu cartão e o plano não se renova sozinho.',
          'Se renovares antes de terminar, o novo período soma-se ao tempo que te resta.',
          'Na Colômbia podes pagar com a Wompi (cartão, Nequi, PSE ou Bancolombia), e o Premium fica ativo assim que a Wompi aprova o pagamento. Também podes pagar por transferência e carregar o comprovativo; nesse caso fica ativo quando verificamos que o dinheiro chegou.',
          'Quem já usava a FLOWI antes de 9 de novembro de 2026 recebe o Premium de oferta até 9 de dezembro de 2026.',
          'Fora da Colômbia, o Premium é vendido através da Paddle (Paddle.com Market Limited), que atua como revendedor e comerciante registado: cobra em euros ou dólares, inclui os impostos do teu país (como o IVA) e a respetiva política de compra aplica-se a esse pagamento. Preços: mensal 4,99 € / US$4,99 e anual 39,99 € / US$39,99, pagamento único sem renovação automática.',
        ],
      ],
    },
    {
      title: '5. Quando o Premium termina',
      body: ['Avisamos-te alguns dias antes. Se não renovares, voltas ao plano grátis: os teus dados continuam lá e podes vê-los, apenas não poderás adicionar mais do que o plano grátis permite.'],
    },
    {
      title: '6. Reembolsos',
      body: [`Se pagaste por engano, te foi cobrado duas vezes ou o pagamento não ativou o Premium, escreve-nos para ${email} ou pelo WhatsApp nos 5 dias úteis seguintes ao pagamento. Analisamos o teu caso e, se aplicável, devolvemos o dinheiro pelo mesmo meio ou por transferência bancária. Isto não limita os direitos que a lei de defesa do consumidor aplicável te confere (incluindo a Lei 1480 de 2011 da Colômbia).`],
    },
    {
      title: '7. Assistente com IA',
      body: ['É opcional e gratuito, usa os modelos gratuitos da OpenRouter e está sujeito às condições deste serviço. A IA pode enganar-se: revê sempre o que ela preenche antes de guardar.'],
    },
    {
      title: '8. Disponibilidade e responsabilidade',
      body: ['Fazemos o possível para que a FLOWI funcione sempre, mas podem ocorrer falhas ou pausas para manutenção. A FLOWI não se responsabiliza por decisões financeiras tomadas com base na app nem por perdas causadas por dados mal registados ou por falhas de terceiros (Google, Wompi, Paddle, OpenRouter, a tua operadora ou o teu banco).'],
    },
    {
      title: '9. Utilização adequada',
      body: [
        'Não uses a FLOWI para atividades ilegais nem tentes aceder à informação de outras pessoas ou afetar o funcionamento da app. Se isso acontecer, podemos suspender a conta.',
        'Regras do chat com amigos. Não é permitido enviar:',
        [
          'Assédio, insultos, ameaças ou discurso de ódio.',
          'Burlas, cobranças falsas, ligações enganosas ou pedidos de palavras-passe ou códigos.',
          'Conteúdo sexual, violento ou que envolva menores de idade.',
          'Spam, publicidade ou correntes.',
        ],
        'Podes bloquear qualquer pessoa (nenhum dos dois poderá escrever ao outro) e denunciá-la a partir dos três pontos ⋮ no chat. Analisamos cada denúncia e podemos apagar mensagens e suspender ou eliminar a conta de quem não cumpra estas regras. Se houver perigo imediato, contacta as autoridades.',
      ],
    },
    {
      title: '10. Alterações e lei aplicável',
      body: [`Se alterarmos estes termos avisar-te-emos dentro da app. Regem-se pelas leis da Colômbia. Em vigor desde ${UPDATED_PT}.`],
    },
  ];
}

// Textos de la página (títulos, intro, pie)
export const UI_PT = {
  back: 'Voltar',
  heading: 'Privacidade e termos',
  privacy: 'Política de privacidade',
  terms: 'Termos de utilização',
  updated: (d: string) => `Atualizada em ${d}`,
  privacyIntro: 'É assim que cuidamos dos teus dados pessoais, segundo a Lei 1581 de 2012 e o Decreto 1377 de 2013 da Colômbia. Ao criares a tua conta na FLOWI autorizas o tratamento dos teus dados para o que aqui é explicado.',
  termsIntro: 'As regras para utilizar a FLOWI e o seu plano Premium. Ao usar a app aceitas estes termos.',
  note: 'Esta versão em português é disponibilizada para facilitar a leitura. Em caso de diferença, prevalece a versão em espanhol.',
  questions: 'Dúvidas sobre os teus dados ou o teu plano?',
  whatsapp: 'Escreve-nos pelo WhatsApp',
  orEmail: ' ou para o e-mail ',
  backToApp: 'Voltar à FLOWI',
};
