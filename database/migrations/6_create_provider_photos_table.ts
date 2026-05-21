import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'provider_photos'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('provider_id').unsigned().notNullable().references('id').inTable('service_providers').onDelete('CASCADE')
      table.string('url').notNullable()
      table.enum('type', ['photo', 'video']).defaultTo('photo')
      table.integer('order').defaultTo(0)
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
