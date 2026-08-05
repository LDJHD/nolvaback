import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'event_registrations'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('event_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('events')
        .onDelete('CASCADE')
      table
        .integer('user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.string('first_name', 100).notNullable()
      table.string('last_name', 100).notNullable()
      table.string('phone', 30).notNullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')

      table.index(['event_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
