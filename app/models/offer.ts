import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import ServiceProvider from '#models/service_provider'

export default class Offer extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare providerId: number

  @column()
  declare name: string

  @column({
    prepare: (value: any) => JSON.stringify(value),
    consume: (value: string) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare included: string[] | null

  @column()
  declare duration: string | null

  @column()
  declare priceMin: number | null

  @column()
  declare priceMax: number | null

  @column()
  declare currency: string

  @column()
  declare isActive: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => ServiceProvider, { foreignKey: 'providerId' })
  declare provider: BelongsTo<typeof ServiceProvider>
}
