import Transaction from '#models/transaction'
import Event from '#models/event'
import { DateTime } from 'luxon'

/**
 * Libération automatique des fonds (PDF : 48h après événement / 24h sans validation client).
 */
export default class EscrowReleaseService {
  async releaseDueTransactions(): Promise<{ tickets: number; providers: number }> {
    const now = DateTime.now()
    let tickets = 0
    let providers = 0

    const due = await Transaction.query()
      .where('status', 'paid')
      .where('type', 'ticket_purchase')
      .whereNotNull('auto_release_at')
      .where('auto_release_at', '<=', now.toSQL()!)

    for (const transaction of due) {
      transaction.status = 'released'
      transaction.releasedAt = now
      transaction.adminNote =
        transaction.adminNote || 'Libération automatique (délai PDF écoulé)'
      await transaction.save()

      if (transaction.type === 'ticket_purchase') {
        tickets++
      }
    }

    return { tickets, providers }
  }

  static ticketAutoReleaseAt(event: Event): DateTime {
    const eventEnd = event.eventDate
    return eventEnd.plus({ hours: 48 })
  }

  static providerAutoReleaseAt(): DateTime {
    return DateTime.now().plus({ hours: 24 })
  }
}
