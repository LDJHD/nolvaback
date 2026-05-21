import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.defer(async (db) => {
      await db
        .from('service_providers')
        .where('status', 'pending')
        .whereNotNull('business_name')
        .whereNot('business_name', '')
        .whereNotNull('type')
        .whereNot('type', '')
        .update({ status: 'active', is_available: true })
    })
  }

  async down() {}
}
