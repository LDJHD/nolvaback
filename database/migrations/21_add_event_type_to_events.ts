import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('events', (table) => {
      table.string('event_type', 80).notNullable().defaultTo('autre')
    })
  }

  async down() {
    this.schema.alterTable('events', (table) => {
      table.dropColumn('event_type')
    })
  }
}
