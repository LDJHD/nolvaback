import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'

export default class PlatformNotification extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare kind: string

  @column()
  declare title: string

  @column()
  declare body: string

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

  @column.dateTime()
  declare readAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
