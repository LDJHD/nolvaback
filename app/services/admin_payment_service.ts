import env from '#start/env'
import { DateTime } from 'luxon'
import Transaction from '#models/transaction'
import Ticket from '#models/ticket'
import Event from '#models/event'
import EventTicketType from '#models/event_ticket_type'
import {
  createAndSendFedaPayPayout,
  createFedaPayTransaction,
  retrieveFedaPayTransaction,
} from '#services/fedapay_service'
import {
  normalizePayoutPhone,
  payoutPhoneCountry,
  toFedaPayPayoutMode,
} from '#utils/fedapay_payout_mode'
import { payoutNeedsPhone } from '#utils/payout_methods'
import AdminLogService from '#services/admin_log_service'
import NotificationService from '#services/notification_service'

export default class AdminPaymentService {
  static async executeProviderPayout(
    adminId: number,
    data: {
      transaction_id: number
      amount?: number
      payout_method: string
      payout_destination: string
      note?: string
    }
  ) {
    const transaction = await Transaction.query()
      .where('id', data.transaction_id)
      .where('type', 'provider_payment')
      .whereIn('status', ['paid', 'disputed'])
      .preload('reservation', (q) =>
        q.preload('provider', (pq) => pq.preload('user'))
      )
      .preload('user')
      .firstOrFail()

    const provider = transaction.reservation?.provider
    if (!provider) {
      throw new Error('Prestataire introuvable pour cette transaction')
    }

    const payoutAmount = Math.round(data.amount ?? Number(transaction.netAmount))
    if (payoutAmount < 1) {
      throw new Error('Montant de reversement invalide')
    }
    if (payoutAmount > Number(transaction.netAmount)) {
      throw new Error(
        `Le montant ne peut pas dépasser le net prestataire (${transaction.netAmount} FCFA)`
      )
    }

    const needsPhone = payoutNeedsPhone(data.payout_method)
    const destination = data.payout_destination.trim()
    if (!destination) {
      throw new Error('Coordonnées de versement requises')
    }

    const providerUser = provider.user
    const customerPayload: Record<string, unknown> = {
      firstname: providerUser?.firstName || provider.businessName || 'Prestataire',
      lastname: providerUser?.lastName || 'NOLVA',
      email: providerUser?.email || `provider${provider.id}@nolva.bj`,
    }

    if (needsPhone) {
      customerPayload.phone_number = {
        number: normalizePayoutPhone(destination, data.payout_method),
        country: payoutPhoneCountry(data.payout_method),
      }
    }

    let fedapayPayoutId: string
    const isSandbox = env.get('FEDAPAY_ENVIRONMENT') === 'sandbox'

    try {
      const payout = await createAndSendFedaPayPayout({
        amount: payoutAmount,
        currency: { iso: 'XOF' },
        mode: toFedaPayPayoutMode(data.payout_method),
        description: `Reversement NOLVA ${transaction.reference}`,
        customer: customerPayload,
      })
      fedapayPayoutId = String(payout.id)
    } catch (err: unknown) {
      if (!isSandbox) {
        const msg = err instanceof Error ? err.message : 'Erreur FedaPay payout'
        throw new Error(msg)
      }
      fedapayPayoutId = `SANDBOX_PAYOUT_${Date.now()}`
    }

    transaction.status = 'released'
    transaction.releasedAt = DateTime.now()
    transaction.fedapayPayoutId = fedapayPayoutId
    transaction.payoutMethod = data.payout_method
    transaction.payoutDestination = destination
    transaction.payoutStatus = 'sent'
    transaction.payoutAt = DateTime.now()
    if (data.note) transaction.adminNote = data.note
    await transaction.save()

    if (transaction.reservationId) {
      const reservation = transaction.reservation
      if (reservation) {
        reservation.status = 'completed'
        await reservation.save()
      }
    }

    await AdminLogService.log(adminId, 'payout_executed', 'transaction', transaction.id, {
      transactionId: transaction.id,
      note: data.note,
      metadata: {
        amount: payoutAmount,
        commission_amount: transaction.commissionAmount,
        payout_method: data.payout_method,
        payout_destination: destination,
        fedapay_payout_id: fedapayPayoutId,
      },
    })

    const providerUserId = provider.userId
    await NotificationService.notifyUser(
      providerUserId,
      'payout_sent',
      'Reversement effectué',
      `NOLVA vous a reversé ${payoutAmount.toLocaleString('fr-FR')} FCFA (réf. ${transaction.reference}).`,
      { transaction_ref: transaction.reference, amount: payoutAmount }
    )

    return { transaction, payoutAmount, fedapayPayoutId }
  }

  static async requestOrganizerRefundConfirmation(
    adminId: number,
    data: {
      transaction_ref: string
      note?: string
    }
  ) {
    const transaction = await Transaction.query()
      .where('reference', data.transaction_ref)
      .where('type', 'ticket_purchase')
      .where('status', 'disputed')
      .preload('user')
      .firstOrFail()

    if (!transaction.eventId) {
      throw new Error('Evenement introuvable pour cette transaction')
    }

    const event = await Event.query()
      .where('id', transaction.eventId)
      .preload('organizer')
      .firstOrFail()

    if (!event.organizerId) {
      throw new Error('Organisateur introuvable pour cet evenement')
    }

    const clientName = [transaction.user?.firstName, transaction.user?.lastName]
      .filter(Boolean)
      .join(' ')
      .trim()

    await NotificationService.notifyUser(
      event.organizerId,
      'refund_confirmation_requested',
      'Confirmation de paiement demandee',
      `NOLVA examine une demande de remboursement pour ${event.title}. Merci de confirmer que ${clientName || 'ce client'} avait bien paye avant la decision finale.`,
      {
        transaction_ref: transaction.reference,
        event_id: event.id,
        client_id: transaction.userId,
        amount: transaction.amount,
        note: data.note,
      }
    )

    await AdminLogService.log(adminId, 'refund_confirmation_requested', 'transaction', transaction.id, {
      transactionId: transaction.id,
      note: data.note,
      metadata: { event_id: event.id, organizer_id: event.organizerId },
    })

    return { transaction, event }
  }

  static async executeClientRefund(
    adminId: number,
    data: {
      transaction_ref: string
      amount?: number
      payout_method: string
      payout_destination: string
      note?: string
    }
  ) {
    const transaction = await Transaction.query()
      .where('reference', data.transaction_ref)
      .where('status', 'disputed')
      .preload('reservation')
      .preload('user')
      .firstOrFail()

    const refundAmount = Math.round(data.amount ?? Number(transaction.amount))
    if (refundAmount < 1) {
      throw new Error('Montant de remboursement invalide')
    }
    if (refundAmount > Number(transaction.amount)) {
      throw new Error(`Le remboursement ne peut pas depasser ${transaction.amount} FCFA`)
    }

    if (!transaction.fedapayTransactionId) {
      throw new Error('Reference FedaPay introuvable pour verifier le paiement')
    }

    const isSandbox = env.get('FEDAPAY_ENVIRONMENT') === 'sandbox'
    const isSandboxTransaction = String(transaction.fedapayTransactionId).startsWith('SANDBOX_')

    if (!isSandboxTransaction) {
      try {
        const fedapayTxn = await retrieveFedaPayTransaction(transaction.fedapayTransactionId)
        const status = fedapayTxn.status
        const paidStatuses = ['approved', 'transferred', 'approved_partially_refunded']
        if (!paidStatuses.includes(status)) {
          throw new Error(`Paiement FedaPay non eligible au remboursement (${status})`)
        }
      } catch (err: unknown) {
        if (!isSandbox) {
          const msg = err instanceof Error ? err.message : 'Verification FedaPay impossible'
          throw new Error(msg)
        }
      }
    }

    const needsPhone = payoutNeedsPhone(data.payout_method)
    const destination = data.payout_destination.trim()
    if (!destination) {
      throw new Error('Coordonnees de remboursement requises')
    }

    const client = transaction.user
    if (!client) {
      throw new Error('Client introuvable')
    }

    const customerPayload: Record<string, unknown> = {
      firstname: client.firstName || 'Client',
      lastname: client.lastName || 'NOLVA',
      email: client.email || `user${client.id}@nolva.bj`,
    }

    if (needsPhone) {
      customerPayload.phone_number = {
        number: normalizePayoutPhone(destination, data.payout_method),
        country: payoutPhoneCountry(data.payout_method),
      }
    }

    let fedapayPayoutId: string
    try {
      const payout = await createAndSendFedaPayPayout({
        amount: refundAmount,
        currency: { iso: 'XOF' },
        mode: toFedaPayPayoutMode(data.payout_method),
        description: `Remboursement NOLVA ${transaction.reference}`,
        customer: customerPayload,
      })
      fedapayPayoutId = String(payout.id)
    } catch (err: unknown) {
      if (!isSandbox) {
        const msg = err instanceof Error ? err.message : 'Erreur FedaPay remboursement'
        throw new Error(msg)
      }
      fedapayPayoutId = `SANDBOX_REFUND_${Date.now()}`
    }

    transaction.status = 'refunded'
    transaction.fedapayPayoutId = fedapayPayoutId
    transaction.payoutMethod = data.payout_method
    transaction.payoutDestination = destination
    transaction.payoutStatus = 'sent'
    transaction.payoutAt = DateTime.now()
    transaction.adminNote = data.note || transaction.adminNote
    await transaction.save()

    if (transaction.reservationId) {
      const reservation = transaction.reservation
      if (reservation) {
        reservation.status = 'cancelled'
        reservation.paymentStatus = 'refunded'
        await reservation.save()
      }
    }

    if (transaction.type === 'ticket_purchase' && transaction.eventId) {
      await Ticket.query()
        .where('event_id', transaction.eventId)
        .where('user_id', transaction.userId)
        .where('fedapay_transaction_id', transaction.fedapayTransactionId)
        .update({ status: 'cancelled' })

      const event = await Event.find(transaction.eventId)
      if (event) {
        event.ticketsSold = Math.max(0, Number(event.ticketsSold || 0) - Number(transaction.quantity || 1))
        await event.save()
      }

      if (transaction.eventTicketTypeId) {
        const ticketType = await EventTicketType.find(transaction.eventTicketTypeId)
        if (ticketType) {
          ticketType.sold = Math.max(0, Number(ticketType.sold || 0) - Number(transaction.quantity || 1))
          await ticketType.save()
        }
      }
    }

    await AdminLogService.log(adminId, 'client_refund_executed', 'transaction', transaction.id, {
      transactionId: transaction.id,
      note: data.note,
      metadata: {
        amount: refundAmount,
        payout_method: data.payout_method,
        payout_destination: destination,
        fedapay_payout_id: fedapayPayoutId,
      },
    })

    await NotificationService.notifyUser(
      client.id,
      'refund_sent',
      'Remboursement envoye',
      `NOLVA a valide et envoye votre remboursement de ${refundAmount.toLocaleString('fr-FR')} FCFA (ref. ${transaction.reference}).`,
      { transaction_ref: transaction.reference, amount: refundAmount }
    )

    if (transaction.type === 'ticket_purchase' && transaction.eventId) {
      const event = await Event.find(transaction.eventId)
      if (event?.organizerId) {
        await NotificationService.notifyUser(
          event.organizerId,
          'ticket_refunded',
          'Billet rembourse',
          `Un billet lie a ${event.title} a ete rembourse par NOLVA (ref. ${transaction.reference}).`,
          { transaction_ref: transaction.reference, amount: refundAmount, event_id: event.id }
        )
      }
    }

    return { transaction, refundAmount, fedapayPayoutId }
  }

  static async initiateDisputeRepayment(
    adminId: number,
    data: {
      transaction_ref: string
      amount: number
      payout_method?: string
      payout_destination?: string
      note?: string
      mode: 'collect_client' | 'payout_provider'
    }
  ) {
    const transaction = await Transaction.query()
      .where('reference', data.transaction_ref)
      .whereIn('status', ['disputed', 'refunded', 'released', 'paid'])
      .preload('reservation', (q) => q.preload('provider', (pq) => pq.preload('user')))
      .preload('user')
      .firstOrFail()

    if (data.mode === 'payout_provider') {
      if (!data.payout_method || !data.payout_destination) {
        throw new Error('Mode et coordonnées de versement requis pour payer le prestataire')
      }
      if (transaction.status !== 'paid' && transaction.status !== 'disputed') {
        if (transaction.status === 'released') {
          throw new Error('Cette transaction a déjà été libérée')
        }
      }
      if (transaction.status === 'refunded') {
        transaction.status = 'paid'
        await transaction.save()
      }
      const result = await this.executeProviderPayout(adminId, {
        transaction_id: transaction.id,
        amount: data.amount,
        payout_method: data.payout_method,
        payout_destination: data.payout_destination,
        note: data.note,
      })
      await AdminLogService.log(adminId, 'dispute_repayout_provider', 'transaction', transaction.id, {
        transactionId: transaction.id,
        note: data.note,
        metadata: { amount: data.amount, mode: data.mode },
      })
      return { type: 'payout', ...result }
    }

    const client = transaction.user
    if (!client) throw new Error('Client introuvable')

    const isSandbox = env.get('FEDAPAY_ENVIRONMENT') === 'sandbox'
    let paymentUrl: string
    let fedapayId: string

    try {
      const fedapayTxn = await createFedaPayTransaction({
        description: `Paiement NOLVA (après litige) ${transaction.reference}`,
        amount: data.amount,
        currency: { iso: 'XOF' },
        callback_url: `${env.get('FRONTEND_URL')}/paiement/confirmation?type=reservation&ref=${transaction.reference}&dispute=1`,
        customer: {
          firstname: client.firstName,
          lastname: client.lastName,
          email: client.email || `user${client.id}@nolva.bj`,
          phone_number: { number: client.phone || '', country: 'BJ' },
        },
      })
      const token = await fedapayTxn.generateToken()
      paymentUrl = token.url
      fedapayId = String(fedapayTxn.id)
    } catch {
      if (!isSandbox) throw new Error('Impossible de créer le paiement FedaPay')
      fedapayId = `SANDBOX_DISPUTE_${Date.now()}`
      paymentUrl = `${env.get('FRONTEND_URL')}/paiement/confirmation?type=reservation&ref=${transaction.reference}&sandbox=1&dispute=1`
    }

    transaction.amount = data.amount
    transaction.status = 'pending'
    transaction.fedapayTransactionId = fedapayId
    transaction.adminNote = data.note || transaction.adminNote
    await transaction.save()

    await AdminLogService.log(adminId, 'dispute_recollect_client', 'transaction', transaction.id, {
      transactionId: transaction.id,
      note: data.note,
      metadata: { amount: data.amount, payment_url: paymentUrl },
    })

    await NotificationService.notifyUser(
      client.id,
      'payment_required',
      'Nouveau paiement requis',
      `Suite au règlement du litige, veuillez payer ${data.amount.toLocaleString('fr-FR')} FCFA sur NOLVA (réf. ${transaction.reference}).`,
      { transaction_ref: transaction.reference, payment_url: paymentUrl }
    )

    return { type: 'collect', paymentUrl, transaction, amount: data.amount }
  }

  static async notifyFreeze(
    transaction: Transaction,
    reason: string,
    adminId: number
  ) {
    const userIds: number[] = [transaction.userId]
    if (transaction.reservationId) {
      await transaction.load('reservation', (q) => q.preload('provider'))
      const pid = transaction.reservation?.provider?.userId
      if (pid) userIds.push(pid)
    }

    await NotificationService.notifyUsers(
      userIds,
      'payment_frozen',
      'Paiement gelé par NOLVA',
      reason,
      { transaction_ref: transaction.reference }
    )

    await AdminLogService.log(adminId, 'transaction_frozen', 'transaction', transaction.id, {
      transactionId: transaction.id,
      note: reason,
    })
  }
}
