import { DateTime } from 'luxon'

/**
 * Convertit une date API (string datetime-local ou SQL) en DateTime Luxon pour Lucid.
 */
export function parseEventDateInput(value: unknown): DateTime {
  if (DateTime.isDateTime(value) && value.isValid) {
    return value
  }
  if (value instanceof Date) {
    const dt = DateTime.fromJSDate(value)
    if (dt.isValid) return dt
  }
  if (typeof value === 'string' && value.trim()) {
    const raw = value.trim()
    const normalized = raw.includes('T') ? raw.replace('T', ' ') : raw
    const withSeconds =
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(normalized)
        ? `${normalized}:00`
        : normalized
    const fromSql = DateTime.fromSQL(withSeconds, { zone: 'local' })
    if (fromSql.isValid) return fromSql
    const fromIso = DateTime.fromISO(raw)
    if (fromIso.isValid) return fromIso
  }
  throw new Error('INVALID_EVENT_DATE')
}
