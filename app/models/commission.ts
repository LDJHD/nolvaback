import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class Commission extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare label: string

  @column()
  declare targetType: 'provider' | 'ticket'

  @column()
  declare targetValue: string | null

  @column()
  declare rate: number

  @column()
  declare isDefault: boolean

  @column()
  declare isActive: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  /**
   * Récupère le taux de commission applicable.
   * Cherche d'abord un taux spécifique pour la valeur donnée,
   * sinon retourne le taux par défaut pour le type.
   */
  static async getRate(targetType: 'provider' | 'ticket', targetValue?: string): Promise<number> {
    // Chercher un taux spécifique
    if (targetValue) {
      const specific = await Commission.query()
        .where('target_type', targetType)
        .where('target_value', targetValue)
        .where('is_active', true)
        .first()
      if (specific) return Number(specific.rate)
    }

    // Sinon taux par défaut
    const defaultRate = await Commission.query()
      .where('target_type', targetType)
      .where('is_default', true)
      .where('is_active', true)
      .first()

    if (defaultRate) return Number(defaultRate.rate)

    // Fallback codé en dur si rien en BDD
    return targetType === 'ticket' ? 12 : 15
  }
}
