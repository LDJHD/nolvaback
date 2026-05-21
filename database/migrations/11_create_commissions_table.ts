import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'commissions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('label', 100).notNullable() // Ex: "DJ", "Ticket standard"
      table.enum('target_type', ['provider', 'ticket']).notNullable() // commission sur prestataire ou ticket
      table.string('target_value', 100).nullable() // Ex: "dj", "photographe", "divertissement_animation", ou null = taux par defaut
      table.decimal('rate', 5, 2).notNullable() // pourcentage, ex: 12.00
      table.boolean('is_default').defaultTo(false) // si c'est le taux par defaut pour ce target_type
      table.boolean('is_active').defaultTo(true)
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
