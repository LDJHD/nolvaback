import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Offer from '#models/offer'
import ProviderPhoto from '#models/provider_photo'
import Availability from '#models/availability'

const boolColumn = {
  prepare: (value: unknown) => (value === true || value === 1 || value === '1' ? 1 : 0),
  consume: (value: unknown) => value === true || value === 1 || value === '1',
}

export default class ServiceProvider extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare businessName: string | null

  @column()
  declare companyPosition: string | null

  @column()
  declare type: string

  @column()
  declare statusCompte: string

  @column()
  declare description: string | null

  @column()
  declare specialty: string | null

  @column()
  declare experienceYears: string | null

  @column({
    prepare: (value: any) => JSON.stringify(value),
    consume: (value: string) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare eventTypes: string[] | null

  @column({
    prepare: (value: any) => JSON.stringify(value),
    consume: (value: string) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare addedValue: string[] | null

  @column()
  declare profilePhoto: string | null

  @column()
  declare logo: string | null

  @column()
  declare city: string | null

  @column({
    prepare: (value: any) => JSON.stringify(value),
    consume: (value: string) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare zones: string[] | null

  @column(boolColumn)
  declare travelPossible: boolean

  @column(boolColumn)
  declare travelFees: boolean

  @column()
  declare instagram: string | null

  @column()
  declare facebook: string | null

  @column()
  declare tiktok: string | null

  @column()
  declare momoNetwork: string | null

  @column()
  declare momoPhone: string | null

  @column()
  declare status: string

  @column(boolColumn)
  declare isVerified: boolean

  @column(boolColumn)
  declare isAvailable: boolean

  @column()
  declare ratingAvg: number

  @column()
  declare ratingCount: number

  @column()
  declare ratingPoints: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User, { foreignKey: 'userId' })
  declare user: BelongsTo<typeof User>

  @hasMany(() => Offer, { foreignKey: 'providerId' })
  declare offers: HasMany<typeof Offer>

  @hasMany(() => ProviderPhoto, { foreignKey: 'providerId' })
  declare photos: HasMany<typeof ProviderPhoto>

  @hasMany(() => Availability, { foreignKey: 'providerId' })
  declare availabilities: HasMany<typeof Availability>
}
