import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import Reservation from '#models/reservation'
import ServiceProvider from '#models/service_provider'

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

    return response.ok(reservations)
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

    return response.ok(reservations)
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
}
