import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('events', (table) => {
      table.dropColumn('image')
    })

    this.schema.alterTable('events', (table) => {
      table.specificType('image', 'LONGTEXT').nullable()
    })
  }

  async down() {
    this.schema.alterTable('events', (table) => {
      table.dropColumn('image')
    })

    this.schema.alterTable('events', (table) => {
      table.string('image').nullable()
    })
  }
}
