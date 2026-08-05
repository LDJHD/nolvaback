import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Event from '#models/event'

export default class EventRegistration extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare eventId: number

  @column()
  declare userId: number | null

  @column()
  declare firstName: string

  @column()
  declare lastName: string

  @column()
  declare phone: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Event)
  declare event: BelongsTo<typeof Event>
}
