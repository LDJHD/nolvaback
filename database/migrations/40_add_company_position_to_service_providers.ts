import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'service_providers'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('company_position', 150).nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('company_position')
    })
  }
}
