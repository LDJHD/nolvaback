/**
 * Modes de versement alignés sur la doc FedaPay (collectes + payouts, toutes régions).
 * @see https://docs.fedapay.com/payment-methods/en/payment-methods-en
 */
export const PAYOUT_METHODS = [
  // Bénin
  'bj_mtn',
  'bj_moov',
  'bj_celtiis',
  'bj_bmo',
  'bj_coris',
  // Togo
  'tg_mixx_yas',
  'tg_moov',
  'tg_togocom',
  // Guinée
  'gn_mtn',
  // Côte d'Ivoire
  'ci_mtn',
  'ci_moov',
  'ci_wave',
  'ci_orange',
  // Niger
  'ne_airtel',
  // Sénégal
  'sn_wave',
  'sn_orange',
  'sn_free',
  // Mali
  'ml_orange',
  // Burkina Faso
  'bf_moov',
  'bf_orange',
  // International
  'card_visa_mastercard',
  // Anciennes valeurs (compatibilité)
  'mtn',
  'moov',
  'celtiis',
  'bmo',
  'coris',
  'card',
] as const

export type PayoutMethod = (typeof PAYOUT_METHODS)[number]

export type PayoutMethodOption = {
  value: PayoutMethod
  label: string
  region: string
  needsPhone: boolean
}

export const PAYOUT_METHOD_OPTIONS: PayoutMethodOption[] = [
  { value: 'bj_mtn', label: 'MTN Mobile Money', region: 'Bénin', needsPhone: true },
  { value: 'bj_moov', label: 'Moov Money (Flooz)', region: 'Bénin', needsPhone: true },
  { value: 'bj_celtiis', label: 'Celtiis', region: 'Bénin', needsPhone: true },
  { value: 'bj_bmo', label: 'BMO', region: 'Bénin', needsPhone: true },
  { value: 'bj_coris', label: 'Coris Money', region: 'Bénin', needsPhone: true },
  { value: 'tg_mixx_yas', label: 'Mixx By Yas', region: 'Togo', needsPhone: true },
  { value: 'tg_moov', label: 'Moov Money', region: 'Togo', needsPhone: true },
  { value: 'tg_togocom', label: 'TogoCom', region: 'Togo', needsPhone: true },
  { value: 'gn_mtn', label: 'MTN', region: 'Guinée', needsPhone: true },
  { value: 'ci_mtn', label: 'MTN', region: "Côte d'Ivoire", needsPhone: true },
  { value: 'ci_moov', label: 'Moov Money', region: "Côte d'Ivoire", needsPhone: true },
  { value: 'ci_wave', label: 'Wave', region: "Côte d'Ivoire", needsPhone: true },
  { value: 'ci_orange', label: 'Orange Money', region: "Côte d'Ivoire", needsPhone: true },
  { value: 'ne_airtel', label: 'Airtel Money', region: 'Niger', needsPhone: true },
  { value: 'sn_wave', label: 'Wave', region: 'Sénégal', needsPhone: true },
  { value: 'sn_orange', label: 'Orange Money', region: 'Sénégal', needsPhone: true },
  { value: 'sn_free', label: 'Free Sénégal', region: 'Sénégal', needsPhone: true },
  { value: 'ml_orange', label: 'Orange Money', region: 'Mali', needsPhone: true },
  { value: 'bf_moov', label: 'Moov Money', region: 'Burkina Faso', needsPhone: true },
  { value: 'bf_orange', label: 'Orange Money', region: 'Burkina Faso', needsPhone: true },
  {
    value: 'card_visa_mastercard',
    label: 'Visa / Mastercard',
    region: 'Toutes régions',
    needsPhone: false,
  },
]

export function isPayoutMethod(value: string): value is PayoutMethod {
  return (PAYOUT_METHODS as readonly string[]).includes(value)
}

export function payoutMethodLabel(value: string | null | undefined): string {
  const opt = PAYOUT_METHOD_OPTIONS.find((o) => o.value === value)
  if (opt) return `${opt.label} (${opt.region})`
  // Anciennes valeurs
  const legacy: Record<string, string> = {
    mtn: 'MTN Mobile Money (Bénin)',
    moov: 'Moov Money (Bénin)',
    celtiis: 'Celtiis (Bénin)',
    bmo: 'BMO (Bénin)',
    coris: 'Coris Money (Bénin)',
    card: 'Visa / Mastercard',
  }
  return legacy[value || ''] || value || '—'
}

export function payoutDestinationHint(method: string): string {
  if (method === 'card_visa_mastercard' || method === 'card') {
    return 'E-mail, IBAN ou référence carte (titulaire + 4 derniers chiffres)'
  }
  return 'Numéro Mobile Money avec indicatif pays (ex: +22990123456)'
}

export function payoutNeedsPhone(method: string): boolean {
  const opt = PAYOUT_METHOD_OPTIONS.find((o) => o.value === method)
  if (opt) return opt.needsPhone
  return method !== 'card' && method !== 'card_visa_mastercard'
}
