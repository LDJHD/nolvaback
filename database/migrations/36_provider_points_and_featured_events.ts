import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('reservations', (table) => {
      table.integer('provider_points_awarded').nullable()
      table.timestamp('provider_points_awarded_at').nullable()
    })

    this.schema.alterTable('events', (table) => {
      table.boolean('is_featured').defaultTo(false)
      table.integer('featured_order').defaultTo(0)
    })
  }

  async down() {
    this.schema.alterTable('events', (table) => {
      table.dropColumn('is_featured')
      table.dropColumn('featured_order')
    })

    this.schema.alterTable('reservations', (table) => {
      table.dropColumn('provider_points_awarded')
      table.dropColumn('provider_points_awarded_at')
    })
  }
}
