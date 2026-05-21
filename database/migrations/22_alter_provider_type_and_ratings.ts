import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.defer(async (db) => {
      await db.rawQuery(
        'ALTER TABLE service_providers MODIFY type VARCHAR(80) NOT NULL'
      )
    })

    this.schema.alterTable('service_providers', (table) => {
      table.decimal('rating_avg', 3, 2).defaultTo(0)
      table.integer('rating_count').defaultTo(0)
      table.integer('rating_points').defaultTo(0)
    })
  }

  async down() {
    this.schema.alterTable('service_providers', (table) => {
      table.dropColumn('rating_avg')
      table.dropColumn('rating_count')
      table.dropColumn('rating_points')
    })
  }
}
