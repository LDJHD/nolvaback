import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'quote_messages'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('quote_request_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('quote_requests')
        .onDelete('CASCADE')
      table.integer('sender_id').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL')
      table.string('sender_role', 20).notNullable()
      table.text('body').notNullable()
      table.boolean('is_system').defaultTo(false)
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
