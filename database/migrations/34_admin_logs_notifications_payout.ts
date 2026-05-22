import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('admin_action_logs', (table) => {
      table.increments('id')
      table
        .integer('admin_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.string('action_type', 64).notNullable()
      table.string('entity_type', 64).notNullable()
      table.integer('entity_id').unsigned().nullable()
      table.integer('transaction_id').unsigned().nullable().references('id').inTable('transactions').onDelete('SET NULL')
      table.text('note').nullable()
      table.json('metadata').nullable()
      table.timestamp('created_at')
    })

    this.schema.createTable('platform_notifications', (table) => {
      table.increments('id')
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.string('kind', 64).notNullable()
      table.string('title', 255).notNullable()
      table.text('body').notNullable()
      table.json('metadata').nullable()
      table.timestamp('read_at').nullable()
      table.timestamp('created_at')
    })

    this.schema.alterTable('transactions', (table) => {
      table.string('fedapay_payout_id', 64).nullable()
      table.string('payout_method', 64).nullable()
      table.string('payout_destination', 255).nullable()
      table.string('payout_status', 32).nullable()
      table.timestamp('payout_at').nullable()
    })

    this.schema.alterTable('events', (table) => {
      table.text('rejection_reason').nullable()
      table.timestamp('rejected_at').nullable()
    })
  }

  async down() {
    this.schema.alterTable('events', (table) => {
      table.dropColumn('rejection_reason')
      table.dropColumn('rejected_at')
    })
    this.schema.alterTable('transactions', (table) => {
      table.dropColumn('fedapay_payout_id')
      table.dropColumn('payout_method')
      table.dropColumn('payout_destination')
      table.dropColumn('payout_status')
      table.dropColumn('payout_at')
    })
    this.schema.dropTable('platform_notifications')
    this.schema.dropTable('admin_action_logs')
  }
}
