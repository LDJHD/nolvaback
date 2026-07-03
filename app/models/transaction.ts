import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Ticket from '#models/ticket'
import Reservation from '#models/reservation'

export default class Transaction extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare reference: string

  @column()
  declare type: 'ticket_purchase' | 'provider_payment'

  @column()
  declare userId: number

  @column()
  declare ticketId: number | null

  @column()
  declare reservationId: number | null

  @column()
  declare eventId: number | null

  @column()
  declare ticketType: string | null

  @column()
  declare eventTicketTypeId: number | null

  @column()
  declare quantity: number

  @column()
  declare amount: number

  @column()
  declare commissionAmount: number

  @column()
  declare commissionRate: number

  @column()
  declare netAmount: number

  @column()
  declare currency: string

  @column()
  declare beneficiaryId: number | null

  @column()
  declare beneficiaryType: string | null

  @column()
  declare status: string

  @column()
  declare fedapayTransactionId: string | null

  @column()
  declare fedapayStatus: string | null

  @column()
  declare proofCode: string | null

  @column()
  declare proofQrCode: string | null

  @column.dateTime()
  declare paidAt: DateTime | null

  @column.dateTime()
  declare autoReleaseAt: DateTime | null

  @column.dateTime()
  declare releasedAt: DateTime | null

  @column.dateTime()
  declare disputedAt: DateTime | null

  @column()
  declare disputeReason: string | null

  @column()
  declare adminNote: string | null

  @column()
  declare fedapayPayoutId: string | null

  @column()
  declare payoutMethod: string | null

  @column()
  declare payoutDestination: string | null

  @column()
  declare payoutStatus: string | null

  @column.dateTime()
  declare payoutAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Ticket)
  declare ticket: BelongsTo<typeof Ticket>

  @belongsTo(() => Reservation)
  declare reservation: BelongsTo<typeof Reservation>

  /**
   * Génère une référence unique NOLVA-TXN-xxxxxx
   */
  static generateReference(): string {
    const timestamp = Date.now().toString(36).toUpperCase()
    const random = Math.random().toString(36).substring(2, 6).toUpperCase()
    return `NOLVA-TXN-${timestamp}${random}`
  }
}
