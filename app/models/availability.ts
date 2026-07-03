import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import ServiceProvider from '#models/service_provider'

export default class Availability extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare providerId: number

  @column({
    prepare: (value: any) => JSON.stringify(value),
    consume: (value: string) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare days: string[] | null

  @column({
    prepare: (value: any) => JSON.stringify(value),
    consume: (value: string) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare slots: string[] | null

  @column({
    prepare: (value: any) => JSON.stringify(value),
    consume: (value: string) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare weeklySchedule: Record<string, unknown>[] | null

  @column()
  declare urgentAvailable: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => ServiceProvider, { foreignKey: 'providerId' })
  declare provider: BelongsTo<typeof ServiceProvider>
}
