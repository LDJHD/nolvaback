import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('transactions', (table) => {
      table.timestamp('auto_release_at').nullable()
    })
  }

  async down() {
    this.schema.alterTable('transactions', (table) => {
      table.dropColumn('auto_release_at')
    })
  }
}
