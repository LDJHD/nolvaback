import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { DateTime } from 'luxon'
import Reservation from '#models/reservation'
import ServiceProvider from '#models/service_provider'
import Transaction from '#models/transaction'
import NotificationService from '#services/notification_service'

export default class ReservationsController {
  // Créer une réservation
  async store({ auth, request, response }: HttpContext) {
    const user = auth.user!

    const schema = vine.object({
      provider_id: vine.number(),
      quote_request_id: vine.number().optional(),
      total_amount: vine.number(),
    })

    const data = await vine.validate({ schema, data: request.all() })

    await ServiceProvider.query()
      .where('id', data.provider_id)
      .where('status', 'active')
      .firstOrFail()

    const depositAmount = Math.round(data.total_amount * 0.3)

    const reservation = await Reservation.create({
      userId: user.id,
      providerId: data.provider_id,
      quoteRequestId: data.quote_request_id ?? null,
      totalAmount: data.total_amount,
      depositAmount,
      currency: 'FCFA',
      status: 'pending',
      paymentStatus: 'unpaid',
    })

    return response.created({
      message: 'Réservation créée',
      reservation,
      depositAmount,
      instructions: `Paiement sécurisé via NOLVA (FedaPay) : ${data.total_amount.toLocaleString()} FCFA — fonds bloqués jusqu'à validation du service.`,
    })
  }

  // Mes réservations (utilisateur)
  async myReservations({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const page = request.input('page', 1)

    const reservations = await Reservation.query()
      .where('user_id', user.id)
      .preload('provider', (q) => q.preload('user'))
      .orderBy('created_at', 'desc')
      .paginate(page, 10)

    const rows = reservations.all()
    const transactions = rows.length
      ? await Transaction.query()
          .whereIn(
            'reservation_id',
            rows.map((reservation) => reservation.id)
          )
          .orderBy('id', 'desc')
      : []
    const transactionByReservation = new Map<number, Transaction>()
    for (const transaction of transactions) {
      if (transaction.reservationId && !transactionByReservation.has(transaction.reservationId)) {
        transactionByReservation.set(transaction.reservationId, transaction)
      }
    }

    return response.ok({
      ...reservations.serialize(),
      data: rows.map((reservation) => ({
        ...reservation.serialize(),
        payment_transaction: transactionByReservation.get(reservation.id)?.serialize() || null,
      })),
    })
  }

  // Réservations reçues (prestataire)
  async providerReservations({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const provider = await ServiceProvider.query().where('user_id', user.id).firstOrFail()
    const page = request.input('page', 1)

    const reservations = await Reservation.query()
      .where('provider_id', provider.id)
      .preload('user', (q) => q.select(['id', 'first_name', 'last_name', 'phone', 'email']))
      .orderBy('created_at', 'desc')
      .paginate(page, 10)

    const rows = reservations.all()
    const transactions = rows.length
      ? await Transaction.query()
          .whereIn(
            'reservation_id',
            rows.map((reservation) => reservation.id)
          )
          .orderBy('id', 'desc')
      : []
    const transactionByReservation = new Map<number, Transaction>()
    for (const transaction of transactions) {
      if (transaction.reservationId && !transactionByReservation.has(transaction.reservationId)) {
        transactionByReservation.set(transaction.reservationId, transaction)
      }
    }

    return response.ok({
      ...reservations.serialize(),
      data: rows.map((reservation) => ({
        ...reservation.serialize(),
        payment_transaction: transactionByReservation.get(reservation.id)?.serialize() || null,
      })),
    })
  }

  async show({ auth, params, response }: HttpContext) {
    const user = auth.user!

    const reservation = await Reservation.query()
      .where('id', params.id)
      .where((q) => {
        q.where('user_id', user.id).orWhereHas('provider', (pq) => {
          pq.where('user_id', user.id)
        })
      })
      .preload('user', (q) => q.select(['id', 'first_name', 'last_name', 'phone']))
      .preload('provider', (q) => q.preload('user'))
      .firstOrFail()

    return response.ok(reservation)
  }

  async awardProviderPoints({ auth, params, request, response }: HttpContext) {
    const user = auth.user!

    const schema = vine.object({
      points: vine.enum([0, 3, 5]),
    })
    const data = await vine.validate({ schema, data: request.all() })

    const reservation = await Reservation.query()
      .where('id', params.id)
      .where('user_id', user.id)
      .where('status', 'completed')
      .where('payment_status', 'fully_paid')
      .preload('provider', (q) => q.preload('user'))
      .firstOrFail()

    if (reservation.providerPointsAwardedAt) {
      return response.badRequest({ message: 'Vous avez deja attribue des points pour cette prestation.' })
    }

    const points = Number(data.points)
    reservation.providerPointsAwarded = points
    reservation.providerPointsAwardedAt = DateTime.now()

    const provider = reservation.provider
    provider.ratingPoints = Number(provider.ratingPoints || 0) + points

    await provider.save()
    await reservation.save()

    if (provider.userId) {
      await NotificationService.notifyUser(
        provider.userId,
        'provider_points_awarded',
        'Points recus',
        `${user.firstName} ${user.lastName} vous a attribue ${points} point(s) apres une prestation terminee.`,
        { reservation_id: reservation.id, provider_id: provider.id, points }
      )
    }

    return response.ok({
      message: 'Points attribues au prestataire',
      reservation,
      provider_points: provider.ratingPoints,
    })
  }
}
