'use client';
// Pago internacional con Paddle (fuera de Colombia, en euros o dólares). Paddle es el revendedor: muestra
// su propia ventana de pago (tarjeta, PayPal, Apple Pay, Google Pay), cobra el IVA que corresponda y avisa al
// servidor (functions/index.js → paddleEventos), que es quien activa Premium. La app nunca ve la tarjeta.
//
// Datos públicos (van en el archivo de publicación .github/workflows/firebase-hosting-deploy.yml):
//   NEXT_PUBLIC_PADDLE_CLIENT_TOKEN   token de cliente de Paddle (empieza por "live_" o "test_")
//   NEXT_PUBLIC_PADDLE_PRICE_MENSUAL  id del precio mensual (pri_…)
//   NEXT_PUBLIC_PADDLE_PRICE_ANUAL    id del precio anual (pri_…)
// Mientras falten, la app no muestra el pago internacional.

const TOKEN = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN || '';
export const PADDLE_PRICES = {
  mensual: process.env.NEXT_PUBLIC_PADDLE_PRICE_MENSUAL || '',
  anual: process.env.NEXT_PUBLIC_PADDLE_PRICE_ANUAL || '',
};
export type IntlPlanId = keyof typeof PADDLE_PRICES;

/** ¿Está configurado el pago internacional? */
export const paddleReady = () => !!TOKEN && !!PADDLE_PRICES.mensual && !!PADDLE_PRICES.anual;

let loading: Promise<any> | null = null;
function loadPaddle(onEvent: (e: any) => void): Promise<any> {
  const w = window as any;
  if (w.Paddle && w.__flowiPaddleReady) { w.__flowiPaddleEvent = onEvent; return Promise.resolve(w.Paddle); }
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
      s.async = true;
      s.onload = () => {
        const P = (window as any).Paddle;
        if (TOKEN.startsWith('test_')) P.Environment.set('sandbox');
        P.Initialize({ token: TOKEN, eventCallback: (e: any) => (window as any).__flowiPaddleEvent?.(e) });
        (window as any).__flowiPaddleReady = true;
        resolve(P);
      };
      s.onerror = () => { loading = null; reject(new Error('paddle')); };
      document.head.appendChild(s);
    });
  }
  w.__flowiPaddleEvent = onEvent;
  return loading;
}

/**
 * Abre la ventana de pago de Paddle. `onDone` se llama cuando el pago termina en Paddle; Premium lo activa
 * el servidor unos segundos después (cuando le llega el aviso firmado de Paddle).
 */
export async function openPaddleCheckout(opts: { plan: IntlPlanId; uid: string; email?: string | null; lang: 'es' | 'en' | 'pt'; onDone: () => void; onClose?: () => void }) {
  const P = await loadPaddle((e) => {
    if (e?.name === 'checkout.completed') opts.onDone();
    if (e?.name === 'checkout.closed') opts.onClose?.();
  });
  P.Checkout.open({
    items: [{ priceId: PADDLE_PRICES[opts.plan], quantity: 1 }],
    customData: { uid: opts.uid, plan: opts.plan },
    ...(opts.email ? { customer: { email: opts.email } } : {}),
    settings: { displayMode: 'overlay', theme: 'dark', locale: opts.lang, allowLogout: false },
  });
}
