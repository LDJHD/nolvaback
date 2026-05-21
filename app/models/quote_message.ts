import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import QuoteRequest from '#models/quote_request'

export default class QuoteMessage extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare quoteRequestId: number

  @column()
  declare senderId: number | null

  @column()
  declare senderRole: string

  @column()
  declare body: string

  @column()
  declare isSystem: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => QuoteRequest)
  declare quoteRequest: BelongsTo<typeof QuoteRequest>

  @belongsTo(() => User, { foreignKey: 'senderId' })
  declare sender: BelongsTo<typeof User>
}
