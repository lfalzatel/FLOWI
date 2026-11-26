// Seguridad del chat (lo exige Google Play para apps donde las personas se escriben):
//  - Bloquear contacto: fl_blocks/{yo}_{otro}. Mientras exista, ninguno de los dos puede escribirle al
//    otro (lo revisan las reglas). Solo quien bloquea lo ve; a la otra persona no se le avisa.
//  - Reportar: fl_reports/{id} con el motivo y los últimos mensajes de esa persona en la conversación,
//    para que el administrador lo revise (le llega un aviso: functions/index.js · avisarReporte).
import { collection, deleteDoc as fbDeleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { addDoc, setDoc } from '@/lib/db';
import { ChatMessage, chatTime } from '@/lib/chat';

export const REPORT_REASONS: { id: string; label: string }[] = [
  { id: 'acoso', label: 'Acoso, insultos o amenazas' },
  { id: 'estafa', label: 'Estafa o fraude' },
  { id: 'spam', label: 'Spam o publicidad' },
  { id: 'inapropiado', label: 'Contenido sexual o inapropiado' },
  { id: 'otro', label: 'Otro motivo' },
];

export const blockId = (blocker: string, blocked: string) => `${blocker}_${blocked}`;

export const blockUser = (myUid: string, otherUid: string) =>
  setDoc(doc(db, 'fl_blocks', blockId(myUid, otherUid)), { blocker: myUid, blocked: otherUid, createdAt: serverTimestamp() });

export const unblockUser = (myUid: string, otherUid: string) =>
  fbDeleteDoc(doc(db, 'fl_blocks', blockId(myUid, otherUid)));

/** Envía el reporte con hasta 20 mensajes recientes de la persona reportada (solo los que tú recibiste). */
export async function reportUser(p: {
  myUid: string; myName: string; otherUid: string; otherName: string; chatId: string;
  reason: string; details: string; messages: ChatMessage[];
}) {
  const fromOther = p.messages.filter(m => m.from === p.otherUid && m.text).slice(-20)
    .map(m => ({ text: m.text.slice(0, 500), at: chatTime(m.createdAt) }));
  await addDoc(collection(db, 'fl_reports'), {
    reporter: p.myUid, reporterName: p.myName.slice(0, 60),
    reported: p.otherUid, reportedName: p.otherName.slice(0, 60),
    chatId: p.chatId, reason: p.reason, details: p.details.trim().slice(0, 500),
    messages: fromOther, status: 'nuevo', createdAt: serverTimestamp(),
  });
}
