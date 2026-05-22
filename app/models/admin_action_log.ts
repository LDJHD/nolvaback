import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Transaction from '#models/transaction'

export default class AdminActionLog extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare adminId: number

  @column()
  declare actionType: string

  @column()
  declare entityType: string

  @column()
  declare entityId: number | null

  @column()
  declare transactionId: number | null

  @column()
  declare note: string | null

  @column({
    prepare: (value: unknown) => (value ? JSON.stringify(value) : null),
    consume: (value: unknown) => {
      if (value === null || value === undefined) return null
      if (typeof value === 'object') return value
      try {
        return JSON.parse(String(value))
      } catch {
        return null
      }
    },
  })
  declare metadata: Record<string, unknown> | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => User, { foreignKey: 'adminId' })
  declare admin: BelongsTo<typeof User>

  @belongsTo(() => Transaction)
  declare transaction: BelongsTo<typeof Transaction>
}
