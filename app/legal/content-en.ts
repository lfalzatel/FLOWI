// Versión en inglés de la política de privacidad y los términos de uso (app/legal/page.tsx).
// Es una traducción para leer más fácil: si hay diferencias, rige la versión en español (se dice en la página).
import { FREE_LIMITS, PLANS } from '@/lib/plans';
import { formatCurrency } from '@/lib/format';

export type Block = { title: string; body: (string | string[])[] };

export const UPDATED_EN = 'November 26, 2026';

export function privacyEn(email: string): Block[] {
  return [
    {
      title: '1. Who handles your data',
      body: [
        'FLOWI is a personal finance app made in Colombia by an independent developer, who is responsible for handling your data.',
        `For any question, complaint or request about your data, write to ${email} or on WhatsApp at +57 310 460 4592 (also from the WhatsApp button at the top of the app).`,
      ],
    },
    {
      title: '2. What data we store',
      body: [[
        'From your Google account: name, email and profile photo. We never know your Google password.',
        'What you record: expenses, income, debts, accounts (bank name and balance, never account numbers), investments and savings, goals, budgets, reminders, notes and your business sales.',
        'Usage data: the days you open the app and your streak, to show them to you and understand how FLOWI is used.',
        'Notifications: an identifier of your phone to send you reminders, if you turn them on.',
        'Friends and chat: your name, photo and @username (the only things other people see), your friends, the messages you send and receive in the chat, the chats you lock with a PIN, the duration of disappearing messages and the contacts you block.',
        'Reports: if you report someone, we keep the reason, what you write and the latest messages that person sent you, so we can review it.',
        'Payments: reference, plan, amount, date and status. FLOWI does not see or store your card or bank account details; Wompi handles those.',
        'Transfer receipts: if you pay by bank transfer, we keep the image you upload so we can verify the payment.',
      ]],
    },
    {
      title: '3. What we use it for',
      body: [[
        'Showing you your finances, calculations, summaries and reminders.',
        'Sending you the notifications you turned on (upcoming payments, daily summary, plan expiration).',
        'Activating and managing your Premium plan.',
        'Giving you support, fixing errors and improving the app.',
      ], 'We do not sell, rent or share your data for advertising. FLOWI has no ads.'],
    },
    {
      title: '4. Who else can see it',
      body: [
        'Each account only sees its own information. The FLOWI administrator can look at account information only to give support, review payments and fix errors, and keeps it strictly confidential.',
        'Chat messages are only seen by the two people in the conversation. The administrator only sees the messages someone sends along with a report.',
        'We use these providers, which handle data on our behalf:',
        [
          'Google Firebase: sign-in, data storage and notifications. Its servers may be outside Colombia (for example, in the United States), which means an international data transfer that you authorize by using FLOWI.',
          'Wompi (Bancolombia): processes payments by card, Nequi, PSE or Bancolombia.',
          'Paddle (Paddle.com Market Limited): for payments from outside Colombia it is the reseller of FLOWI Premium; it receives your email, country and payment details to charge you and issue the invoice, and FLOWI never sees your card.',
          'OpenRouter: only if you connect the AI assistant. The phrase you dictate or the photo of the receipt is sent to the free model so it can understand it; those photos are not stored in FLOWI. The connection key stays only on your phone.',
        ],
      ],
    },
    {
      title: '5. Your rights',
      body: [
        'As the owner of your data you can, at any time:',
        [
          'Know, update and correct your data.',
          'Ask for proof of the authorization you gave us.',
          'Know how we have used your data.',
          'Revoke the authorization and ask us to delete your data.',
          'File complaints with the Superintendence of Industry and Commerce (SIC) of Colombia if you believe your rights were not respected.',
        ],
        `Write to ${email} or on WhatsApp. We answer inquiries within 10 business days and complaints within 15 business days, as the law requires.`,
      ],
    },
    {
      title: '6. How long we keep it and how to delete your account',
      body: [
        'For as long as you have your FLOWI account. If you ask us to delete it, we erase your data within 15 business days, except the record of payments made, which is kept for the time the law requires.',
        'Disappearing messages delete themselves when the chosen time runs out. Chat reports are kept while they are reviewed and to prevent abuse.',
        'To delete your FLOWI account yourself:',
        [
          'Open FLOWI and sign in.',
          'Go to Settings → Data and privacy.',
          'Tap "Delete my account" and confirm. Your profile, expenses, income, debts, accounts, goals, savings, reminders, receipts, your friends and your chats with all their messages are deleted right away.',
        ],
        `You can also ask for it without opening the app by writing to ${email} from the email you signed up with. Only the record of Premium payments (date, amount and plan) is kept, without your other data, for the time the law requires.`,
      ],
    },
    {
      title: '7. Security',
      body: [
        'Your connection to FLOWI is encrypted, access is through your Google account and the database has rules that prevent one account from reading another one’s information. Still, no system is 100% secure: protect access to your phone and your Google account.',
      ],
    },
    {
      title: '8. Minors',
      body: ['FLOWI is intended for people over 18. If you are a minor, use it with the authorization of your mother, father or guardian.'],
    },
    {
      title: '9. Changes to this policy',
      body: [`If we change anything important we will let you know inside the app. This policy is in effect since ${UPDATED_EN}.`],
    },
  ];
}

const PLAN_EN: Record<string, string> = { mensual: 'Monthly', trimestral: '3 months', anual: 'Yearly' };

export function termsEn(email: string): Block[] {
  const plansText = PLANS.map(p => `${PLAN_EN[p.id] || p.label}: ${formatCurrency(p.price, 'COP')}`).join(' · ');
  return [
    {
      title: '1. What FLOWI is',
      body: [
        'FLOWI is a tool to organize your money. It is not a bank, it does not move your money, it does not connect to your bank accounts and it does not give financial or investment advice.',
        'Calculations (“You can spend today”, CDT and debt interest, projections, summaries) are estimates based on what you record. Always confirm official amounts with your bank or institution.',
      ],
    },
    {
      title: '2. Your account',
      body: ['You sign in with your Google account. You are responsible for the information you record and for access to your phone and your account.'],
    },
    {
      title: '3. Free plan',
      body: [
        'FLOWI is free forever, with these limits:',
        [
          'Expenses, income, debts, accounts, reminders and notes: unlimited.',
          `Active investments and savings: ${FREE_LIMITS.investments}.`,
          `Active goals: ${FREE_LIMITS.goals}.`,
          `Receipts read from a photo: ${FREE_LIMITS.receiptsPerDay} per day.`,
          'My business: current month only.',
        ],
        'If we ever change these limits we will tell you beforehand, and we will never delete what you already recorded.',
      ],
    },
    {
      title: '4. FLOWI Premium',
      body: [
        `Premium removes the limits of the free plan. Prices (Colombian pesos): ${plansText}.`,
        [
          'It is a one-time payment for the period you choose. It is not an automatic charge: we do not store your card and the plan does not renew by itself.',
          'If you renew before it ends, the new period is added to the time you have left.',
          'You can pay with Wompi (card, Nequi, PSE or Bancolombia), and Premium is activated as soon as Wompi approves the payment. You can also pay by bank transfer and upload the receipt; in that case it is activated when we verify the money arrived.',
          'People who were already using FLOWI before November 9, 2026 get Premium as a gift until December 9, 2026.',
          'Outside Colombia, Premium is sold through Paddle (Paddle.com Market Limited), which acts as reseller and merchant of record: it charges in euros or dollars, includes your country’s taxes (such as VAT) and its own buyer terms apply to that payment. Prices: monthly €4.99 / US$4.99 and yearly €39.99 / US$39.99, one-time payment with no automatic renewal.',
        ],
      ],
    },
    {
      title: '5. When Premium expires',
      body: ['We let you know a few days before. If you do not renew, you go back to the free plan: your data stays there and you can see it, you just cannot add more than the free plan allows.'],
    },
    {
      title: '6. Refunds',
      body: [`If you paid by mistake, were charged twice or the payment did not activate Premium, write to ${email} or on WhatsApp within 5 business days after the payment. We review your case and, if appropriate, refund your money through the same method or by bank transfer. This does not limit the rights given to you by Colombia’s Consumer Statute (Law 1480 of 2011).`],
    },
    {
      title: '7. AI assistant',
      body: ['It is optional and free, it uses OpenRouter’s free models and is subject to their terms. AI can make mistakes: always review what it fills in before saving.'],
    },
    {
      title: '8. Availability and liability',
      body: ['We do our best to keep FLOWI always working, but there may be failures or maintenance pauses. FLOWI is not responsible for financial decisions made based on the app, nor for losses caused by wrongly recorded data or by third-party failures (Google, Wompi, OpenRouter, your carrier or your bank).'],
    },
    {
      title: '9. Proper use',
      body: [
        'Do not use FLOWI for illegal activities or try to access other people’s information or disrupt the app. If that happens, we may suspend the account.',
        'Rules for the friends chat. You may not send:',
        [
          'Harassment, insults, threats or hate speech.',
          'Scams, fake charges, misleading links or requests for passwords or codes.',
          'Sexual or violent content, or content involving minors.',
          'Spam, advertising or chain messages.',
        ],
        'You can block anyone (neither of you will be able to write to the other) and report them from the three dots ⋮ in the chat. We review every report and may delete messages and suspend or delete the account of anyone who breaks these rules. If there is immediate danger, contact the authorities.',
      ],
    },
    {
      title: '10. Changes and governing law',
      body: [`If we change these terms we will let you know inside the app. They are governed by the laws of Colombia. In effect since ${UPDATED_EN}.`],
    },
  ];
}

// Textos de la página (títulos, intro, pie)
export const UI_EN = {
  back: 'Back',
  heading: 'Privacy and terms',
  privacy: 'Privacy policy',
  terms: 'Terms of use',
  updated: (d: string) => `Updated on ${d}`,
  privacyIntro: 'This is how we protect your personal data, under Colombia’s Law 1581 of 2012 and Decree 1377 of 2013. By creating your FLOWI account you authorize the handling of your data as explained here.',
  termsIntro: 'The rules for using FLOWI and its Premium plan. By using the app you accept these terms.',
  note: 'This English version is provided for convenience. If there is any difference, the Spanish version prevails.',
  questions: 'Questions about your data or your plan?',
  whatsapp: 'Write to us on WhatsApp',
  orEmail: ' or by email at ',
  backToApp: 'Back to FLOWI',
};
