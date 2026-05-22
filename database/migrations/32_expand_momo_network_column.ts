import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'service_providers'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('momo_network', 50).nullable().alter()
      table.string('momo_phone', 200).nullable().alter()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('momo_network', 20).nullable().alter()
      table.string('momo_phone', 30).nullable().alter()
    })
  }
}
