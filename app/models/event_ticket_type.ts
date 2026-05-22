import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Event from '#models/event'

export default class EventTicketType extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare eventId: number

  @column()
  declare label: string

  @column()
  declare price: number

  @column()
  declare quantity: number

  @column()
  declare sold: number

  @column()
  declare sortOrder: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Event)
  declare event: BelongsTo<typeof Event>

  get available(): number {
    if (this.quantity <= 0) return 999999
    return Math.max(0, this.quantity - this.sold)
  }
}
