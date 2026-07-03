import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'transactions'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('proof_code', 80).nullable().unique()
      table.string('proof_qr_code', 255).nullable().unique()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('proof_code')
      table.dropColumn('proof_qr_code')
    })
  }
}
