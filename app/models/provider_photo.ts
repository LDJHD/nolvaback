import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import ServiceProvider from '#models/service_provider'

export default class ProviderPhoto extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare providerId: number

  @column()
  declare url: string

  @column()
  declare type: string

  @column()
  declare order: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => ServiceProvider, { foreignKey: 'providerId' })
  declare provider: BelongsTo<typeof ServiceProvider>
}
