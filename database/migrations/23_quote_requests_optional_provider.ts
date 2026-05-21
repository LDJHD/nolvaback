import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'quote_requests'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('provider_id').unsigned().nullable().alter()
      table.string('provider_type', 100).nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('provider_type')
      table.integer('provider_id').unsigned().notNullable().alter()
    })
  }
}
