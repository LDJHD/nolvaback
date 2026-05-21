import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import ServiceProvider from '#models/service_provider'
import Transaction from '#models/transaction'

export default class PayoutMessage extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare providerId: number

  @column()
  declare transactionId: number | null

  @column()
  declare senderId: number | null

  @column()
  declare senderRole: 'admin' | 'provider'

  @column()
  declare body: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => ServiceProvider, { foreignKey: 'providerId' })
  declare provider: BelongsTo<typeof ServiceProvider>

  @belongsTo(() => Transaction, { foreignKey: 'transactionId' })
  declare transaction: BelongsTo<typeof Transaction>

  @belongsTo(() => User, { foreignKey: 'senderId' })
  declare sender: BelongsTo<typeof User>
}
