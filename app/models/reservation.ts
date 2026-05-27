import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import ServiceProvider from '#models/service_provider'
import QuoteRequest from '#models/quote_request'

export default class Reservation extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare quoteRequestId: number | null

  @column()
  declare userId: number

  @column()
  declare providerId: number

  @column()
  declare totalAmount: number

  @column()
  declare depositAmount: number

  @column()
  declare currency: string

  @column()
  declare status: string

  @column()
  declare paymentStatus: string

  @column()
  declare fedapayTransactionId: string | null

  @column.dateTime()
  declare serviceCompletedAt: DateTime | null

  @column()
  declare providerPointsAwarded: number | null

  @column.dateTime()
  declare providerPointsAwardedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User, { foreignKey: 'userId' })
  declare user: BelongsTo<typeof User>

  @belongsTo(() => ServiceProvider, { foreignKey: 'providerId' })
  declare provider: BelongsTo<typeof ServiceProvider>

  @belongsTo(() => QuoteRequest, { foreignKey: 'quoteRequestId' })
  declare quoteRequest: BelongsTo<typeof QuoteRequest>
}
