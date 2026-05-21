import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import ServiceProvider from '#models/service_provider'
import QuoteMessage from '#models/quote_message'
import QuoteActivity from '#models/quote_activity'
import Reservation from '#models/reservation'

export default class QuoteRequest extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare providerId: number | null

  @column()
  declare providerType: string | null

  @column()
  declare eventType: string

  @column.date()
  declare eventDate: DateTime | null

  @column()
  declare startTime: string | null

  @column()
  declare endTime: string | null

  @column()
  declare location: string | null

  @column()
  declare budget: number | null

  @column()
  declare proposedPrice: number | null

  @column()
  declare agreedPrice: number | null

  @column()
  declare message: string | null

  @column()
  declare status: string

  @column()
  declare reservationId: number | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User, { foreignKey: 'userId' })
  declare user: BelongsTo<typeof User>

  @belongsTo(() => ServiceProvider, { foreignKey: 'providerId' })
  declare provider: BelongsTo<typeof ServiceProvider>

  @belongsTo(() => Reservation, { foreignKey: 'reservationId' })
  declare reservation: BelongsTo<typeof Reservation>

  @hasMany(() => QuoteMessage)
  declare messages: HasMany<typeof QuoteMessage>

  @hasMany(() => QuoteActivity)
  declare activities: HasMany<typeof QuoteActivity>
}
