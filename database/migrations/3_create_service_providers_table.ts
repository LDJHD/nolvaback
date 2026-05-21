import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'service_providers'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.string('business_name', 200).nullable()
      table.enum('type', ['dj', 'animateur', 'hotesse', 'securite', 'photographe', 'organisateur', 'location_materiel', 'artiste', 'comedien', 'autre']).notNullable()
      table.enum('status_compte', ['individuel', 'entreprise']).defaultTo('individuel')
      table.text('description').nullable()
      table.string('specialty', 200).nullable()
      table.string('experience_years', 50).nullable()
      table.json('event_types').nullable()
      table.json('added_value').nullable()
      table.string('profile_photo').nullable()
      table.string('logo').nullable()
      table.string('city', 100).nullable()
      table.json('zones').nullable()
      table.boolean('travel_possible').defaultTo(false)
      table.boolean('travel_fees').defaultTo(false)
      table.string('instagram').nullable()
      table.string('facebook').nullable()
      table.string('tiktok').nullable()
      table.enum('status', ['active', 'pending', 'inactive']).defaultTo('pending')
      table.boolean('is_verified').defaultTo(false)
      table.boolean('is_available').defaultTo(true)
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
