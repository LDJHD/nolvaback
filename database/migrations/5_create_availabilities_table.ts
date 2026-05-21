import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'availabilities'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('provider_id').unsigned().notNullable().references('id').inTable('service_providers').onDelete('CASCADE')
      table.json('days').nullable()
      table.json('slots').nullable()
      table.boolean('urgent_available').defaultTo(false)
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
