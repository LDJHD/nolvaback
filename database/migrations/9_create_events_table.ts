import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'events'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('organizer_id').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL')
      table.string('title', 300).notNullable()
      table.text('description').nullable()
      table.dateTime('event_date').notNullable()
      table.string('location', 300).nullable()
      table.string('city', 100).nullable()
      table.string('image').nullable()
      table.decimal('ticket_price', 15, 2).defaultTo(0)
      table.integer('ticket_count').defaultTo(0)
      table.integer('tickets_sold').defaultTo(0)
      table.boolean('is_public').defaultTo(true)
      table.enum('status', ['upcoming', 'ongoing', 'completed', 'cancelled']).defaultTo('upcoming')
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
