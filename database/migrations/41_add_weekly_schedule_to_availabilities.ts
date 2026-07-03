import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'availabilities'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.json('weekly_schedule').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('weekly_schedule')
    })
  }
}
