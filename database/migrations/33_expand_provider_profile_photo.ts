import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'service_providers'

  async up() {
    await this.db.rawQuery(
      `ALTER TABLE \`${this.tableName}\` MODIFY \`profile_photo\` LONGTEXT NULL`
    )
  }

  async down() {
    await this.db.rawQuery(
      `ALTER TABLE \`${this.tableName}\` MODIFY \`profile_photo\` VARCHAR(255) NULL`
    )
  }
}
