import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'offers'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('provider_id').unsigned().notNullable().references('id').inTable('service_providers').onDelete('CASCADE')
      table.string('name', 200).notNullable()
      table.json('included').nullable()
      table.string('duration', 100).nullable()
      table.decimal('price_min', 15, 2).nullable()
      table.decimal('price_max', 15, 2).nullable()
      table.string('currency', 10).defaultTo('FCFA')
      table.boolean('is_active').defaultTo(true)
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
