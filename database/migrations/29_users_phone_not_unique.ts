import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropUnique(['phone'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('phone', 20).nullable().unique().alter()
    })
  }
}
