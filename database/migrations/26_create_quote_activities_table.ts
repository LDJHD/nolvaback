import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'quote_activities'

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
      table.string('action', 60).notNullable()
      table.integer('actor_id').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL')
      table.string('actor_role', 20).nullable()
      table.json('metadata').nullable()
      table.timestamp('created_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
