import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'reservations'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('quote_request_id').unsigned().nullable().references('id').inTable('quote_requests').onDelete('SET NULL')
      table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.integer('provider_id').unsigned().notNullable().references('id').inTable('service_providers').onDelete('CASCADE')
      table.decimal('total_amount', 15, 2).notNullable()
      table.decimal('deposit_amount', 15, 2).notNullable()
      table.string('currency', 10).defaultTo('FCFA')
      table.enum('status', ['pending', 'confirmed', 'completed', 'cancelled', 'disputed']).defaultTo('pending')
      table.enum('payment_status', ['unpaid', 'deposit_paid', 'fully_paid', 'refunded']).defaultTo('unpaid')
      table.string('fedapay_transaction_id').nullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
