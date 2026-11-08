'use client';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';
import type { PlanOption } from '@/lib/plans';

// Pago de un plan con Wompi. El servidor (functions/index.js) arma la referencia y la firma de
// integridad, porque el secreto no puede estar en la app. Cuando Wompi aprueba el pago, avisa al
// servidor y este activa Premium en el perfil; la app lo ve al instante porque escucha el perfil.

interface Firma {
  reference: string;
  amountInCents: number;
  currency: 'COP';
  signature: string;
  publicKey: string;
  redirectUrl: string;
}

function loadWidget(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).WidgetCheckout) return resolve();
    const s = document.createElement('script');
    s.src = 'https://checkout.wompi.co/widget.js';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('No se pudo cargar Wompi. Revisa tu conexión.'));
    document.head.appendChild(s);
  });
}

export type PayResult = { status: string; id?: string } | null;

/** Pide al servidor que consulte el pago en Wompi y active Premium si quedó aprobado. */
export async function confirmPayment(id: string): Promise<string | null> {
  try {
    const fn = httpsCallable<{ id: string }, { status: string }>(getFunctions(app, 'us-central1'), 'wompiConfirmar');
    return (await fn({ id })).data.status;
  } catch (e) {
    console.error('Confirmar pago:', e);
    return null;
  }
}

export async function payPlan(plan: PlanOption['id'], email?: string | null): Promise<PayResult> {
  const firmar = httpsCallable<{ plan: string }, Firma>(getFunctions(app, 'us-central1'), 'wompiFirma');
  const [{ data }] = await Promise.all([firmar({ plan }), loadWidget()]);
  return new Promise((resolve) => {
    const checkout = new (window as any).WidgetCheckout({
      currency: data.currency,
      amountInCents: data.amountInCents,
      reference: data.reference,
      publicKey: data.publicKey,
      signature: { integrity: data.signature },
      redirectUrl: data.redirectUrl,
      ...(email ? { customerData: { email } } : {}),
    });
    checkout.open((result: any) => {
      const t = result?.transaction;
      if (!t) return resolve(null);
      // Confirmación directa con Wompi (por si el aviso al servidor tarda o no llega)
      if (t.id) confirmPayment(t.id).then(s => resolve({ status: s || t.status, id: t.id }));
      else resolve({ status: t.status, id: t.id });
    });
  });
}
