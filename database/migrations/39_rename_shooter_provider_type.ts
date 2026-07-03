import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    const existing = await this.db
      .from('provider_types')
      .where((query) => {
        query.where('slug', 'shooter').orWhereRaw('LOWER(label) = ?', ['shooter'])
      })
      .first()

    if (!existing) {
      await this.db.rawQuery(
        'INSERT INTO provider_types (slug, label, is_active, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
        ['shooter', 'ESPACE/Salle des fêtes', true, 13]
      )
      return
    }

    await this.db
      .from('provider_types')
      .where('id', existing.id)
      .update({
        slug: 'shooter',
        label: 'ESPACE/Salle des fêtes',
        is_active: true,
      })
  }

  async down() {
    await this.db.from('provider_types').where('slug', 'shooter').update({
      label: 'SHOOTER',
    })
  }
}
