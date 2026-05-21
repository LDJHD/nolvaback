import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'quote_requests'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('start_time', 10).nullable()
      table.string('end_time', 10).nullable()
      table.decimal('proposed_price', 15, 2).nullable()
      table.decimal('agreed_price', 15, 2).nullable()
      table.integer('reservation_id').unsigned().nullable().references('id').inTable('reservations').onDelete('SET NULL')
    })

    this.defer(async (db) => {
      await db.rawQuery(
        `ALTER TABLE quote_requests MODIFY status VARCHAR(32) NOT NULL DEFAULT 'pending'`
      )
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('start_time')
      table.dropColumn('end_time')
      table.dropColumn('proposed_price')
      table.dropColumn('agreed_price')
      table.dropColumn('reservation_id')
    })
  }
}
