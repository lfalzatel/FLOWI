// Llaves Bre-B para recibir donaciones de quienes quieran apoyar el proyecto.
// Son datos públicos: se muestran tal cual a todos los usuarios.
export interface DonationKey {
  bank: string;
  icon: string;
  keys: string[];
}

export const DONATION_KEYS: DonationKey[] = [
  { bank: 'Nequi', icon: 'nequi', keys: ['@3104604592'] },
  { bank: 'Bancolombia', icon: 'bancolombia', keys: ['@alzate7425'] },
  { bank: 'BBVA', icon: 'bbva', keys: ['@bbva3104604592'] },
];
