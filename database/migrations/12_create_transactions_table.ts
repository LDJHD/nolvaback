import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'transactions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('reference', 50).unique().notNullable() // NOLVA-TXN-xxxxx
      table.enum('type', ['ticket_purchase', 'provider_payment']).notNullable()
      table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE')

      // Liens polymorphes : ticket_id ou reservation_id
      table.integer('ticket_id').unsigned().nullable().references('id').inTable('tickets').onDelete('SET NULL')
      table.integer('reservation_id').unsigned().nullable().references('id').inTable('reservations').onDelete('SET NULL')

      // Montants
      table.decimal('amount', 15, 2).notNullable() // montant total payé
      table.decimal('commission_amount', 15, 2).notNullable().defaultTo(0) // commission NOLVA
      table.decimal('commission_rate', 5, 2).notNullable().defaultTo(0) // taux appliqué
      table.decimal('net_amount', 15, 2).notNullable().defaultTo(0) // montant net pour le bénéficiaire
      table.string('currency', 10).defaultTo('XOF')

      // Bénéficiaire (organisateur ou prestataire)
      table.integer('beneficiary_id').unsigned().nullable() // user id du bénéficiaire
      table.string('beneficiary_type', 50).nullable() // 'organizer' ou 'provider'

      // Statut escrow
      table.enum('status', [
        'pending',        // en attente de paiement
        'paid',           // payé, fonds bloqués (escrow)
        'released',       // fonds libérés au bénéficiaire
        'disputed',       // litige ouvert
        'refunded',       // remboursé
        'cancelled',      // annulé
      ]).defaultTo('pending')

      // FedaPay
      table.string('fedapay_transaction_id').nullable()
      table.string('fedapay_status').nullable()

      // Escrow / validation
      table.timestamp('paid_at').nullable()
      table.timestamp('released_at').nullable()
      table.timestamp('disputed_at').nullable()
      table.text('dispute_reason').nullable()
      table.text('admin_note').nullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
