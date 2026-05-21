import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('users', (table) => {
      table.dropColumn('avatar')
    })

    this.schema.alterTable('users', (table) => {
      table.specificType('avatar', 'LONGTEXT').nullable()
    })
  }

  async down() {
    this.schema.alterTable('users', (table) => {
      table.dropColumn('avatar')
    })

    this.schema.alterTable('users', (table) => {
      table.string('avatar').nullable()
    })
  }
}
