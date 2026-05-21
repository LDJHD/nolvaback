import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'service_providers'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('momo_network', 20).nullable()
      table.string('momo_phone', 30).nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('momo_network')
      table.dropColumn('momo_phone')
    })
  }
}
