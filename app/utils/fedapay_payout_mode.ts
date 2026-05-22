/**
 * Map NOLVA payout method codes to FedaPay payout `mode`.
 * @see https://docs.fedapay.com/integration-api/en/payouts-management-en
 */
export function toFedaPayPayoutMode(method: string): string {
  const m = (method || '').toLowerCase()
  if (m.includes('card')) return 'card_open'
  if (m.includes('wave')) return 'wave_open'
  if (m.includes('orange')) return 'orange_open'
  if (m.includes('moov') || m.includes('flooz')) return 'moov_open'
  if (m.includes('mtn')) return 'mtn_open'
  if (m.includes('airtel')) return 'airtel_open'
  if (m.includes('celtiis')) return 'celtiis_open'
  return 'mtn_open'
}

export function payoutPhoneCountry(method: string): string {
  const m = (method || '').toLowerCase()
  if (m.startsWith('tg_')) return 'TG'
  if (m.startsWith('ci_')) return 'CI'
  if (m.startsWith('sn_')) return 'SN'
  if (m.startsWith('gn_')) return 'GN'
  if (m.startsWith('ne_')) return 'NE'
  if (m.startsWith('ml_')) return 'ML'
  if (m.startsWith('bf_')) return 'BF'
  return 'BJ'
}

export function normalizePayoutPhone(destination: string, method: string): string {
  const raw = destination.trim().replace(/\s/g, '')
  if (!raw) return raw
  if (raw.startsWith('+')) return raw
  if (raw.startsWith('00')) return `+${raw.slice(2)}`
  const country = payoutPhoneCountry(method)
  if (country === 'BJ' && raw.length === 10) return `+229${raw}`
  return `+${raw}`
}
