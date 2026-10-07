/** Paramètres des envois du livre 365. À revalider si l'impression ou l'emballage change.
 * Poids bruts repris du lib/exports.ts local fourni le 07/10/2026 (2 = 1,155 kg;
 * 4 = 2,215 kg), et non de l'ancien barème du userscript. Aucune pesée n'est inventée.
 * Au-delà de 7 exemplaires, aucun format extérieur n'a été confirmé : export bloqué.
 */
export const LAPOSTE_SETTINGS = {
  description: "Printed book",
  reason: "OTHR",
  countryOfOrigin: "FR",
  tariffNumber: "490199",
  unitWeightKg: 0.53,
  unitCustomsValueEur: 10,
  packaging: {
    1: { weight: 0.555, length: 25, width: 18, height: 4 },
    2: { weight: 1.155, length: 23, width: 16, height: 8 },
    3: { weight: 1.685, length: 23, width: 16, height: 8 },
    4: { weight: 2.215, length: 23, width: 16, height: 8 },
    5: { weight: 2.85, length: 25, width: 20, height: 15 },
    6: { weight: 3.43, length: 25, width: 20, height: 15 },
    7: { weight: 3.96, length: 25, width: 20, height: 15 },
  } as Record<number, { weight: number; length: number; width: number; height: number }>,
};
