import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('transactions', (table) => {
      table.integer('event_id').unsigned().nullable().references('id').inTable('events').onDelete('SET NULL')
      table.string('ticket_type', 30).nullable()
      table.integer('quantity').unsigned().defaultTo(1)
    })

    this.schema.alterTable('reservations', (table) => {
      table.timestamp('paid_at').nullable()
      table.timestamp('service_completed_at').nullable()
    })
  }

  async down() {
    this.schema.alterTable('transactions', (table) => {
      table.dropColumn('event_id')
      table.dropColumn('ticket_type')
      table.dropColumn('quantity')
    })
    this.schema.alterTable('reservations', (table) => {
      table.dropColumn('paid_at')
      table.dropColumn('service_completed_at')
    })
  }
}
