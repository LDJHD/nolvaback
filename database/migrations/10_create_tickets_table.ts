import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'tickets'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('event_id').unsigned().notNullable().references('id').inTable('events').onDelete('CASCADE')
      table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.enum('type', ['solo', 'couple', 'vip', 'standard']).defaultTo('standard')
      table.decimal('amount', 15, 2).notNullable()
      table.string('qr_code').nullable().unique()
      table.enum('status', ['valid', 'upcoming', 'expired', 'cancelled']).defaultTo('upcoming')
      table.string('fedapay_transaction_id').nullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
