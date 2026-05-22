import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'provider_photos'

  async up() {
    await this.db.rawQuery(
      `ALTER TABLE \`${this.tableName}\` MODIFY \`url\` LONGTEXT NOT NULL`
    )
    await this.db.rawQuery(
      `ALTER TABLE \`${this.tableName}\` MODIFY \`type\` VARCHAR(30) NOT NULL DEFAULT 'photo'`
    )
  }

  async down() {
    await this.db.rawQuery(
      `ALTER TABLE \`${this.tableName}\` MODIFY \`url\` VARCHAR(255) NOT NULL`
    )
    await this.db.rawQuery(
      `ALTER TABLE \`${this.tableName}\` MODIFY \`type\` ENUM('photo','video') NOT NULL DEFAULT 'photo'`
    )
  }
}
