import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'transactions'

  async up() {
    await this.db
      .from(this.tableName)
      .where('type', 'provider_payment')
      .where('status', 'paid')
      .update({ auto_release_at: null })
  }

  async down() {
    // No rollback: restoring old automatic release dates would be unsafe.
  }
}
