export const PAYOUT_METHODS = ['mtn', 'moov', 'celtiis', 'bmo', 'coris', 'card'] as const

export type PayoutMethod = (typeof PAYOUT_METHODS)[number]

export const PAYOUT_METHOD_LABELS: Record<PayoutMethod, string> = {
  mtn: 'MTN Mobile Money',
  moov: 'Moov Money (Flooz)',
  celtiis: 'Celtiis',
  bmo: 'BMO',
  coris: 'Coris Money',
  card: 'Carte bancaire (Visa / Mastercard)',
}

export function isPayoutMethod(value: string): value is PayoutMethod {
  return (PAYOUT_METHODS as readonly string[]).includes(value)
}

export function payoutDestinationHint(method: PayoutMethod): string {
  switch (method) {
    case 'card':
      return 'E-mail ou référence liée à la carte (ex: nom titulaire + 4 derniers chiffres)'
    default:
      return 'Numéro Mobile Money (ex: +22990123456)'
  }
}
