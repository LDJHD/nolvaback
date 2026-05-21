import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import QuoteRequest from '#models/quote_request'

export default class QuoteActivity extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare quoteRequestId: number

  @column()
  declare action: string

  @column()
  declare actorId: number | null

  @column()
  declare actorRole: string | null

  @column({
    prepare: (value: unknown) => (value ? JSON.stringify(value) : null),
    consume: (value: string | Record<string, unknown> | null) => {
      if (!value) return null
      if (typeof value === 'object') return value
      try {
        return JSON.parse(value)
      } catch {
        return null
      }
    },
  })
  declare metadata: Record<string, unknown> | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => QuoteRequest)
  declare quoteRequest: BelongsTo<typeof QuoteRequest>

  @belongsTo(() => User, { foreignKey: 'actorId' })
  declare actor: BelongsTo<typeof User>
}
