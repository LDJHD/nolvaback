import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'tickets'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('type', 120).notNullable().defaultTo('standard').alter()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.enum('type', ['solo', 'couple', 'vip', 'standard']).defaultTo('standard').alter()
    })
  }
}
