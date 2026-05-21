import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'quote_requests'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.integer('provider_id').unsigned().notNullable().references('id').inTable('service_providers').onDelete('CASCADE')
      table.string('event_type', 200).notNullable()
      table.date('event_date').nullable()
      table.string('location', 300).nullable()
      table.decimal('budget', 15, 2).nullable()
      table.text('message').nullable()
      table.enum('status', ['pending', 'accepted', 'declined', 'completed', 'cancelled']).defaultTo('pending')
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
