import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Ticket from '#models/ticket'
import EventTicketType from '#models/event_ticket_type'

export default class Event extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare organizerId: number | null

  @column()
  declare title: string

  @column()
  declare description: string | null

  @column.dateTime()
  declare eventDate: DateTime

  @column()
  declare location: string | null

  @column()
  declare city: string | null

  @column()
  declare eventType: string

  @column()
  declare image: string | null

  @column()
  declare ticketPrice: number

  @column()
  declare ticketCount: number

  @column()
  declare ticketsSold: number

  @column()
  declare isPublic: boolean

  @column()
  declare isApproved: boolean

  @column()
  declare status: string

  @column()
  declare rejectionReason: string | null

  @column.dateTime()
  declare rejectedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User, { foreignKey: 'organizerId' })
  declare organizer: BelongsTo<typeof User>

  @hasMany(() => Ticket)
  declare tickets: HasMany<typeof Ticket>

  @hasMany(() => EventTicketType)
  declare ticketTypes: HasMany<typeof EventTicketType>
}
