import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('first_name', 100).notNullable()
      table.string('last_name', 100).notNullable()
      table.string('email', 255).nullable().unique()
      table.string('phone', 20).nullable().unique()
      table.string('password').notNullable()
      table.enum('role', ['user', 'provider', 'admin']).defaultTo('user')
      table.string('city', 100).nullable()
      table.json('interests').nullable()
      table.string('avatar').nullable()
      table.boolean('is_active').defaultTo(true)
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
