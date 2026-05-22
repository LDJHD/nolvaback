import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'event_ticket_types'

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
      table.string('label', 120).notNullable()
      table.decimal('price', 12, 2).notNullable().defaultTo(0)
      table.integer('quantity').notNullable().defaultTo(0)
      table.integer('sold').notNullable().defaultTo(0)
      table.integer('sort_order').notNullable().defaultTo(0)
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })

    this.schema.alterTable('transactions', (table) => {
      table
        .integer('event_ticket_type_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('event_ticket_types')
        .onDelete('SET NULL')
    })
  }

  async down() {
    this.schema.alterTable('transactions', (table) => {
      table.dropForeign(['event_ticket_type_id'])
      table.dropColumn('event_ticket_type_id')
    })
    this.schema.dropTable(this.tableName)
  }
}
