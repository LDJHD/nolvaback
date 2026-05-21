import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import Reservation from '#models/reservation'
import Ticket from '#models/ticket'
import Event from '#models/event'
import Transaction from '#models/transaction'
import Commission from '#models/commission'
import ServiceProvider from '#models/service_provider'
import env from '#start/env'
import crypto from 'node:crypto'
import { DateTime } from 'luxon'
import EscrowReleaseService from '#services/escrow_release_service'
import QuoteRequest from '#models/quote_request'
import QuoteFlowService from '#services/quote_flow_service'
import { createFedaPayTransaction, retrieveFedaPayTransaction } from '#services/fedapay_service'

export default class PaymentsController {
  // ═══════════════════════════════════════════════════════════
  // 1 - MODULE ACHAT DE TICKET
  // ═══════════════════════════════════════════════════════════

  /**
   * Initier l'achat d'un ticket via FedaPay
   * PDF Étape 1-3 : Sélection, calcul commission, paiement
   */
  async buyTicket({ auth, request, response }: HttpContext) {
    const user = auth.user!

    const schema = vine.object({
      event_id: vine.number(),
      type: vine.enum(['solo', 'couple', 'vip', 'standard']),
      quantity: vine.number().min(1).max(20).optional(),
    })

    const data = await vine.validate({ schema, data: request.all() })
    const quantity = data.quantity ?? 1

    const event = await Event.query()
      .where('id', data.event_id)
      .where('status', 'upcoming')
      .where('is_approved', true)
      .firstOrFail()

    // Vérifier disponibilité
    const remaining =
      event.ticketCount > 0 ? event.ticketCount - event.ticketsSold : 999
    if (event.ticketCount > 0 && remaining < quantity) {
      return response.badRequest({
        message: `Il ne reste que ${remaining} billet(s) disponible(s)`,
      })
    }

    const unitPrice = Number(event.ticketPrice)
    const amount = unitPrice * quantity
    if (amount <= 0) {
      return this.createFreeTicket(user, event, data.type, quantity, response)
    }

    // Calculer la commission NOLVA (PDF section 4)
    const commissionRate = await Commission.getRate('ticket', event.city || undefined)
    const commissionAmount = Math.round(amount * commissionRate / 100)
    const netAmount = amount - commissionAmount

    // Créer la transaction en statut pending (escrow)
    const txnRef = Transaction.generateReference()
    const transaction = await Transaction.create({
      reference: txnRef,
      type: 'ticket_purchase',
      userId: user.id,
      eventId: event.id,
      ticketType: data.type,
      quantity,
      amount,
      commissionAmount,
      commissionRate,
      netAmount,
      currency: 'XOF',
      beneficiaryId: event.organizerId,
      beneficiaryType: 'organizer',
      status: 'pending',
    })

    // Créer la transaction FedaPay
    try {
      const fedapayTxn = await createFedaPayTransaction({
        description: `Billet ${data.type} x${quantity} - ${event.title}`,
        amount: amount,
        currency: { iso: 'XOF' },
        callback_url: `${env.get('FRONTEND_URL')}/paiement/confirmation?type=ticket&ref=${txnRef}`,
        customer: {
          firstname: user.firstName,
          lastname: user.lastName,
          email: user.email || `user${user.id}@nolva.bj`,
          phone_number: { number: user.phone || '', country: 'BJ' },
        },
      })

      // Générer le lien de paiement
      const paymentToken = await fedapayTxn.generateToken()

      transaction.fedapayTransactionId = String(fedapayTxn.id)
      await transaction.save()

      return response.ok({
        message: 'Paiement initié',
        paymentUrl: paymentToken.url,
        transactionRef: txnRef,
        amount,
        quantity,
        commissionNolva: commissionAmount,
        netOrganisateur: netAmount,
        currency: 'FCFA',
        mention: 'Paiement sécurisé via NOLVA',
      })
    } catch (err: any) {
      // Fallback sandbox si FedaPay échoue
      console.error('[FedaPay] Erreur création transaction:', err.message)
      return this.fallbackSandboxTicket(transaction, event, data.type, quantity, user, response)
    }
  }

  /**
   * Confirmer le paiement d'un ticket (callback FedaPay)
   * PDF Étape 4 : Blocage des fonds + génération QR
   */
  async confirmTicketPayment({ auth, request, response }: HttpContext) {
    const user = auth.user!

    const schema = vine.object({
      transaction_ref: vine.string(),
    })

    const data = await vine.validate({ schema, data: request.all() })

    const transaction = await Transaction.query()
      .where('reference', data.transaction_ref)
      .where('user_id', user.id)
      .where('type', 'ticket_purchase')
      .firstOrFail()

    if (transaction.status !== 'pending') {
      return response.badRequest({ message: 'Cette transaction a déjà été traitée' })
    }

    const isSandboxTicket = env.get('FEDAPAY_ENVIRONMENT') === 'sandbox'
    let fedapayConfirmed = false
    if (!transaction.fedapayTransactionId || String(transaction.fedapayTransactionId).startsWith('SANDBOX_')) {
      fedapayConfirmed = true
    } else {
      try {
        const fedapayTxn = await retrieveFedaPayTransaction(transaction.fedapayTransactionId)
        fedapayConfirmed = fedapayTxn.status === 'approved' || isSandboxTicket
      } catch {
        fedapayConfirmed = isSandboxTicket
      }
    }

    if (!fedapayConfirmed) {
      return response.badRequest({ message: 'Paiement non confirmé par FedaPay' })
    }

    if (!transaction.eventId) {
      return response.badRequest({ message: 'Événement introuvable pour cette transaction' })
    }

    const event = await Event.findOrFail(transaction.eventId)
    const quantity = transaction.quantity || 1
    const ticketType = transaction.ticketType || 'standard'

    const existingCount = await Ticket.query()
      .where('user_id', user.id)
      .where('event_id', event.id)
      .where('fedapay_transaction_id', transaction.fedapayTransactionId || '')
      .count('* as total')

    if (Number(existingCount[0].$extras.total) > 0) {
      return response.badRequest({ message: 'Ces billets ont déjà été créés' })
    }

    const tickets = []
    const unitAmount = Math.round(Number(transaction.amount) / quantity)

    for (let i = 0; i < quantity; i++) {
      const qrCode = `NOLVA-${crypto.randomBytes(12).toString('hex').toUpperCase()}`
      const ticket = await Ticket.create({
        eventId: event.id,
        userId: user.id,
        type: ticketType,
        amount: unitAmount,
        qrCode,
        status: 'valid',
        fedapayTransactionId: transaction.fedapayTransactionId,
      })
      tickets.push(ticket)
    }

    event.ticketsSold += quantity
    await event.save()

    transaction.ticketId = tickets[0].id
    transaction.status = 'paid'
    transaction.fedapayStatus = 'approved'
    transaction.paidAt = DateTime.now()
    transaction.autoReleaseAt = EscrowReleaseService.ticketAutoReleaseAt(event)
    await transaction.save()

    return response.ok({
      message: `${quantity} billet(s) acheté(s) avec succès ! Paiement sécurisé via NOLVA.`,
      tickets: tickets.map((t) => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        qrCode: t.qrCode,
        status: t.status,
      })),
      transaction: {
        reference: transaction.reference,
        amount: transaction.amount,
        commissionNolva: transaction.commissionAmount,
        status: transaction.status,
        autoReleaseAt: transaction.autoReleaseAt,
      },
    })
  }

  // ═══════════════════════════════════════════════════════════
  // 2 - MODULE PAIEMENT PRESTATAIRE
  // ═══════════════════════════════════════════════════════════

  /**
   * Initier le paiement d'une réservation prestataire via FedaPay
   * PDF Étape 1-2 : Réservation + paiement 100%
   */
  async initiateReservationPayment({ auth, params, response }: HttpContext) {
    const user = auth.user!

    const reservation = await Reservation.query()
      .where('id', params.id)
      .where('user_id', user.id)
      .preload('provider', (q) => q.preload('user'))
      .firstOrFail()

    if (reservation.paymentStatus !== 'unpaid') {
      return response.badRequest({ message: 'Cette réservation a déjà été payée' })
    }

    const amount = Number(reservation.totalAmount)

    // Commission selon le type de prestataire (PDF section 4)
    const commissionRate = await Commission.getRate('provider', reservation.provider.type)
    const commissionAmount = Math.round(amount * commissionRate / 100)
    const netAmount = amount - commissionAmount

    // Créer la transaction escrow
    const txnRef = Transaction.generateReference()
    const transaction = await Transaction.create({
      reference: txnRef,
      type: 'provider_payment',
      userId: user.id,
      reservationId: reservation.id,
      amount,
      commissionAmount,
      commissionRate,
      netAmount,
      currency: 'XOF',
      beneficiaryId: reservation.provider.userId,
      beneficiaryType: 'provider',
      status: 'pending',
    })

    // Créer la transaction FedaPay
    try {
      const fedapayTxn = await createFedaPayTransaction({
        description: `Prestation ${reservation.provider.businessName} - Réservation #${reservation.id}`,
        amount: amount,
        currency: { iso: 'XOF' },
        callback_url: `${env.get('FRONTEND_URL')}/paiement/confirmation?type=reservation&ref=${txnRef}`,
        customer: {
          firstname: user.firstName,
          lastname: user.lastName,
          email: user.email || `user${user.id}@nolva.bj`,
          phone_number: { number: user.phone || '', country: 'BJ' },
        },
      })

      const paymentToken = await fedapayTxn.generateToken()

      transaction.fedapayTransactionId = String(fedapayTxn.id)
      await transaction.save()

      return response.ok({
        message: 'Paiement initié',
        paymentUrl: paymentToken.url,
        transactionRef: txnRef,
        amount,
        commissionNolva: commissionAmount,
        tauxCommission: `${commissionRate}%`,
        netPrestataire: netAmount,
        currency: 'FCFA',
        mention: 'Paiement sécurisé via NOLVA',
      })
    } catch (err: any) {
      console.error('[FedaPay] Erreur:', err.message)
      return this.fallbackSandboxReservation(transaction, reservation, response)
    }
  }

  /**
   * Confirmer le paiement d'une réservation (callback FedaPay)
   * PDF Étape 2 : Confirmer + bloquer fonds en séquestre
   */
  async confirmReservationPayment({ auth, request, response }: HttpContext) {
    const user = auth.user!

    const schema = vine.object({
      transaction_ref: vine.string(),
    })

    const data = await vine.validate({ schema, data: request.all() })

    const transaction = await Transaction.query()
      .where('reference', data.transaction_ref)
      .where('user_id', user.id)
      .where('type', 'provider_payment')
      .firstOrFail()

    if (transaction.status !== 'pending') {
      return response.badRequest({ message: 'Transaction déjà traitée' })
    }

    // Vérification FedaPay (PDF section 5)
    const isSandbox = env.get('FEDAPAY_ENVIRONMENT') === 'sandbox'
    let confirmed = false
    if (!transaction.fedapayTransactionId || String(transaction.fedapayTransactionId).startsWith('SANDBOX_')) {
      confirmed = true
    } else {
      try {
        const fedapayTxn = await retrieveFedaPayTransaction(transaction.fedapayTransactionId)
        confirmed = fedapayTxn.status === 'approved' || isSandbox
      } catch {
        confirmed = isSandbox
      }
    }

    if (!confirmed) {
      return response.badRequest({ message: 'Paiement non confirmé' })
    }

    // Fonds en escrow (PDF Étape 4 : Blocage des fonds)
    transaction.status = 'paid'
    transaction.fedapayStatus = 'approved'
    transaction.paidAt = DateTime.now()
    transaction.autoReleaseAt = EscrowReleaseService.providerAutoReleaseAt()
    await transaction.save()

    if (transaction.reservationId) {
      const reservation = await Reservation.find(transaction.reservationId)
      if (reservation) {
        reservation.paymentStatus = 'fully_paid'
        reservation.status = 'confirmed'
        reservation.fedapayTransactionId = transaction.fedapayTransactionId
        await reservation.save()

        if (reservation.quoteRequestId) {
          const quote = await QuoteRequest.find(reservation.quoteRequestId)
          if (quote) {
            quote.status = 'paid'
            await quote.save()
            await QuoteFlowService.logActivity(quote.id, 'payment_confirmed', user.id, 'client', {
              reservation_id: reservation.id,
              transaction_ref: transaction.reference,
              amount: transaction.amount,
            })
            await QuoteFlowService.addMessage(
              quote.id,
              null,
              'system',
              `Paiement confirmé (${Number(transaction.amount).toLocaleString()} FCFA). La prestation est sécurisée par NOLVA.`,
              true
            )
          }
        }
      }
    }

    return response.ok({
      message: 'Paiement confirmé ! Les fonds sont sécurisés par NOLVA.',
      transaction: {
        reference: transaction.reference,
        amount: transaction.amount,
        commissionNolva: transaction.commissionAmount,
        netPrestataire: transaction.netAmount,
        status: 'Fonds en séquestre - en attente de validation du service',
      },
    })
  }

  /**
   * Validation du service par le client (PDF Étape 4)
   * Le client confirme que le service est terminé
   */
  async validateService({ auth, request, response }: HttpContext) {
    const user = auth.user!

    const schema = vine.object({
      reservation_id: vine.number(),
      rating: vine.number().min(1).max(5).optional(),
    })

    const data = await vine.validate({ schema, data: request.all() })

    const reservation = await Reservation.query()
      .where('id', data.reservation_id)
      .where('user_id', user.id)
      .where('status', 'confirmed')
      .where('payment_status', 'fully_paid')
      .firstOrFail()

    // Trouver la transaction associée
    const transaction = await Transaction.query()
      .where('reservation_id', reservation.id)
      .where('status', 'paid')
      .firstOrFail()

    transaction.status = 'released'
    transaction.releasedAt = DateTime.now()
    transaction.autoReleaseAt = null
    await transaction.save()

    reservation.status = 'completed'
    reservation.serviceCompletedAt = DateTime.now()
    await reservation.save()

    await reservation.load('provider')
    const provider = reservation.provider
    const rating = data.rating ?? 5
    const newCount = provider.ratingCount + 1
    const newAvg =
      Math.round(((provider.ratingAvg * provider.ratingCount + rating) / newCount) * 100) / 100
    provider.ratingCount = newCount
    provider.ratingAvg = newAvg
    provider.ratingPoints = provider.ratingPoints + 10 + rating * 5
    await provider.save()

    return response.ok({
      message: 'Service validé ! Le prestataire sera payé automatiquement.',
      netPrestataire: transaction.netAmount,
      commissionNolva: transaction.commissionAmount,
    })
  }

  // ═══════════════════════════════════════════════════════════
  // 3 - GESTION DES LITIGES
  // ═══════════════════════════════════════════════════════════

  /**
   * Ouvrir un litige (PDF section 3)
   */
  async getReservationTransaction({ auth, params, response }: HttpContext) {
    const user = auth.user!
    const transaction = await Transaction.query()
      .where('reservation_id', params.id)
      .where('user_id', user.id)
      .orderBy('id', 'desc')
      .first()

    if (!transaction) {
      return response.notFound({ message: 'Aucune transaction pour cette réservation' })
    }

    return response.ok({
      reference: transaction.reference,
      status: transaction.status,
      amount: transaction.amount,
    })
  }

  async openDispute({ auth, request, response }: HttpContext) {
    const user = auth.user!

    const schema = vine.object({
      transaction_ref: vine.string(),
      reason: vine.string().minLength(10),
    })

    const data = await vine.validate({ schema, data: request.all() })

    const transaction = await Transaction.query()
      .where('reference', data.transaction_ref)
      .where('user_id', user.id)
      .whereIn('status', ['paid']) // Seulement sur les fonds bloqués
      .firstOrFail()

    // PDF : Bloquer immédiatement le transfert
    transaction.status = 'disputed'
    transaction.disputedAt = DateTime.now()
    transaction.disputeReason = data.reason
    await transaction.save()

    // Mettre la réservation en litige si applicable
    if (transaction.reservationId) {
      const reservation = await Reservation.find(transaction.reservationId)
      if (reservation) {
        reservation.status = 'disputed'
        await reservation.save()
      }
    }

    return response.ok({
      message: 'Litige ouvert. L\'administrateur NOLVA va examiner votre demande. Les fonds restent bloqués.',
      transaction: {
        reference: transaction.reference,
        status: 'en investigation',
      },
    })
  }

  // ═══════════════════════════════════════════════════════════
  // 4 - ADMIN : Résolution litiges + gestion commissions
  // ═══════════════════════════════════════════════════════════

  /**
   * Admin : Résoudre un litige (PDF section 3)
   * Seul un administrateur peut : libérer, rembourser, ou partager
   */
  async resolveDispute({ request, response }: HttpContext) {
    const schema = vine.object({
      transaction_ref: vine.string(),
      action: vine.enum(['release', 'refund', 'split']),
      split_percentage: vine.number().optional(), // Si action = split
      note: vine.string().optional(),
    })

    const data = await vine.validate({ schema, data: request.all() })

    const transaction = await Transaction.query()
      .where('reference', data.transaction_ref)
      .where('status', 'disputed')
      .firstOrFail()

    switch (data.action) {
      case 'release':
        // Libérer les fonds au bénéficiaire
        transaction.status = 'released'
        transaction.releasedAt = DateTime.now()
        break

      case 'refund':
        // Rembourser le client
        transaction.status = 'refunded'
        break

      case 'split':
        // Partager le montant (% au prestataire, reste au client)
        transaction.status = 'released'
        transaction.releasedAt = DateTime.now()
        if (data.split_percentage) {
          transaction.netAmount = Math.round(transaction.amount * data.split_percentage / 100)
        }
        break
    }

    transaction.adminNote = data.note || null
    await transaction.save()

    if (transaction.reservationId) {
      const reservation = await Reservation.find(transaction.reservationId)
      if (reservation) {
        if (data.action === 'refund') {
          reservation.status = 'cancelled'
          reservation.paymentStatus = 'refunded'
        } else if (data.action === 'release') {
          reservation.status = 'completed'
        }
        await reservation.save()
      }
    }

    return response.ok({
      message: `Litige résolu : ${data.action}`,
      transaction,
    })
  }

  /**
   * Admin : Voir toutes les transactions (PDF section 6)
   */
  async adminTransactions({ request, response }: HttpContext) {
    const page = request.input('page', 1)
    const status = request.input('status')
    const type = request.input('type')

    const query = Transaction.query()
      .preload('user')
      .preload('reservation', (q) => q.preload('provider'))
      .orderBy('created_at', 'desc')

    if (status) query.where('status', status)
    if (type) query.where('type', type)

    const transactions = await query.paginate(page, 20)

    return response.ok(transactions)
  }

  /**
   * Admin : reversements effectués
   */
  async adminRunEscrowRelease({ response }: HttpContext) {
    const service = new EscrowReleaseService()
    const result = await service.releaseDueTransactions()
    return response.ok({
      message: 'Libération automatique exécutée',
      ...result,
    })
  }

  async adminPayouts({ request, response }: HttpContext) {
    const page = request.input('page', 1)
    const payouts = await Transaction.query()
      .where('status', 'released')
      .preload('user')
      .orderBy('released_at', 'desc')
      .paginate(page, 20)

    return response.ok(payouts)
  }

  /**
   * Admin : Voir les commissions générées
   */
  async adminCommissionStats({ response }: HttpContext) {
    const { default: db } = await import('@adonisjs/lucid/services/db')
    const [row] = await db
      .from('transactions')
      .whereIn('status', ['paid', 'released'])
      .select(
        db.raw('COALESCE(SUM(commission_amount), 0) as total_commissions'),
        db.raw('COALESCE(SUM(amount), 0) as total_volume'),
        db.raw('COUNT(*) as total_transactions')
      )

    return response.ok(row || {})
  }

  /**
   * Admin : Geler un paiement
   */
  async freezeTransaction({ request, response }: HttpContext) {
    const schema = vine.object({
      transaction_ref: vine.string(),
      note: vine.string().optional(),
    })

    const data = await vine.validate({ schema, data: request.all() })

    const transaction = await Transaction.query()
      .where('reference', data.transaction_ref)
      .where('status', 'paid')
      .firstOrFail()

    transaction.status = 'disputed'
    transaction.disputedAt = DateTime.now()
    transaction.adminNote = data.note || 'Gelé par un administrateur'
    await transaction.save()

    return response.ok({ message: 'Paiement gelé', transaction })
  }

  // ═══════════════════════════════════════════════════════════
  // COMMISSIONS CRUD (Admin)
  // ═══════════════════════════════════════════════════════════

  async listCommissions({ response }: HttpContext) {
    const commissions = await Commission.query().orderBy('target_type').orderBy('is_default', 'desc')
    return response.ok(commissions)
  }

  async createCommission({ request, response }: HttpContext) {
    const schema = vine.object({
      label: vine.string(),
      target_type: vine.enum(['provider', 'ticket']),
      target_value: vine.string().optional(),
      rate: vine.number().min(0).max(100),
      is_default: vine.boolean().optional(),
    })

    const data = await vine.validate({ schema, data: request.all() })

    const commission = await Commission.create({
      label: data.label,
      targetType: data.target_type,
      targetValue: data.target_value ?? null,
      rate: data.rate,
      isDefault: data.is_default ?? false,
      isActive: true,
    })

    return response.created({ message: 'Commission créée', commission })
  }

  async updateCommission({ params, request, response }: HttpContext) {
    const commission = await Commission.findOrFail(params.id)

    const schema = vine.object({
      label: vine.string().optional(),
      rate: vine.number().min(0).max(100).optional(),
      is_active: vine.boolean().optional(),
      is_default: vine.boolean().optional(),
    })

    const data = await vine.validate({ schema, data: request.all() })

    if (data.label !== undefined) commission.label = data.label
    if (data.rate !== undefined) commission.rate = data.rate
    if (data.is_active !== undefined) commission.isActive = data.is_active
    if (data.is_default !== undefined) commission.isDefault = data.is_default

    await commission.save()

    return response.ok({ message: 'Commission mise à jour', commission })
  }

  // ═══════════════════════════════════════════════════════════
  // WEBHOOK FedaPay
  // ═══════════════════════════════════════════════════════════

  async webhook({ request, response }: HttpContext) {
    const payload = request.body()
    const webhookSecret = env.get('FEDAPAY_WEBHOOK_SECRET', '')
    if (webhookSecret) {
      const signature = request.header('x-fedapay-signature') || request.header('fedapay-signature')
      if (!signature) {
        return response.unauthorized({ message: 'Signature webhook manquante' })
      }
    }
    console.log('[FedaPay Webhook]', JSON.stringify(payload))

    // Chercher la transaction par fedapay_transaction_id
    if (payload?.entity?.id) {
      const transaction = await Transaction.query()
        .where('fedapay_transaction_id', String(payload.entity.id))
        .first()

      if (transaction && payload.entity.status === 'approved' && transaction.status === 'pending') {
        transaction.status = 'paid'
        transaction.fedapayStatus = 'approved'
        transaction.paidAt = DateTime.now()
        await transaction.save()
      }
    }

    return response.ok({ received: true })
  }

  // ═══════════════════════════════════════════════════════════
  // HELPERS PRIVÉS
  // ═══════════════════════════════════════════════════════════

  /**
   * Ticket gratuit - pas besoin de paiement
   */
  private async createFreeTicket(
    user: any,
    event: any,
    type: string,
    quantity: number,
    response: any
  ) {
    const tickets = []
    for (let i = 0; i < quantity; i++) {
      const qrCode = `NOLVA-${crypto.randomBytes(12).toString('hex').toUpperCase()}`
      const ticket = await Ticket.create({
        eventId: event.id,
        userId: user.id,
        type,
        amount: 0,
        qrCode,
        status: 'valid',
      })
      tickets.push(ticket)
    }

    event.ticketsSold += quantity
    await event.save()

    return response.created({
      message: `${quantity} billet(s) gratuit(s) obtenu(s) !`,
      tickets: tickets.map((t) => ({ id: t.id, type: t.type, qrCode: t.qrCode, status: t.status })),
    })
  }

  private async fallbackSandboxTicket(
    transaction: Transaction,
    event: any,
    type: string,
    quantity: number,
    user: any,
    response: any
  ) {
    const fakeId = `SANDBOX_${Date.now()}`
    transaction.fedapayTransactionId = fakeId
    await transaction.save()

    const paymentUrl = `${env.get('FRONTEND_URL')}/paiement/confirmation?type=ticket&ref=${transaction.reference}&sandbox=1`

    return response.ok({
      message: 'Paiement initié (mode sandbox)',
      paymentUrl,
      transactionRef: transaction.reference,
      amount: transaction.amount,
      commissionNolva: transaction.commissionAmount,
      currency: 'FCFA',
      mention: 'Paiement sécurisé via NOLVA',
    })
  }

  /**
   * Fallback sandbox pour réservations
   */
  private async fallbackSandboxReservation(transaction: Transaction, reservation: any, response: any) {
    const fakeId = `SANDBOX_${Date.now()}`
    transaction.fedapayTransactionId = fakeId
    await transaction.save()

    const paymentUrl = `${env.get('FRONTEND_URL')}/paiement/confirmation?type=reservation&ref=${transaction.reference}&sandbox=1`

    return response.ok({
      message: 'Paiement initié (mode sandbox)',
      paymentUrl,
      transactionRef: transaction.reference,
      amount: transaction.amount,
      commissionNolva: transaction.commissionAmount,
      tauxCommission: `${transaction.commissionRate}%`,
      netPrestataire: transaction.netAmount,
      currency: 'FCFA',
      mention: 'Paiement sécurisé via NOLVA',
    })
  }
}
