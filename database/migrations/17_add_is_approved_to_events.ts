import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('events', (table) => {
      table.boolean('is_approved').defaultTo(false)
    })

    // Les événements existants (seed) restent visibles
    this.defer(async (db) => {
      await db.from('events').update({ is_approved: true })
    })
  }

  async down() {
    this.schema.alterTable('events', (table) => {
      table.dropColumn('is_approved')
    })
  }
}
