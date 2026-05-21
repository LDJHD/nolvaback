import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import PayoutMessage from '#models/payout_message'
import ServiceProvider from '#models/service_provider'
import Transaction from '#models/transaction'

export default class PayoutMessagesController {
  async adminPendingPayouts({ response }: HttpContext) {
    const transactions = await Transaction.query()
      .where('status', 'paid')
      .where('type', 'provider_payment')
      .preload('user', (q) => q.select(['id', 'first_name', 'last_name', 'email']))
      .preload('reservation', (q) =>
        q.preload('provider', (pq) =>
          pq.preload('user', (uq) => uq.select(['id', 'first_name', 'last_name', 'email', 'phone']))
        )
      )
      .orderBy('paid_at', 'desc')
      .limit(50)

    return response.ok(transactions)
  }

  async list({ request, response, auth }: HttpContext) {
    const providerId = Number(request.input('provider_id'))
    const transactionId = request.input('transaction_id')
      ? Number(request.input('transaction_id'))
      : null

    if (!providerId) {
      return response.badRequest({ message: 'provider_id requis' })
    }

    const user = auth.user!
    if (user.role === 'provider') {
      const mine = await ServiceProvider.query().where('user_id', user.id).firstOrFail()
      if (mine.id !== providerId) {
        return response.forbidden({ message: 'Accès refusé' })
      }
    } else if (user.role !== 'admin') {
      return response.forbidden({ message: 'Accès refusé' })
    }

    const query = PayoutMessage.query()
      .where('provider_id', providerId)
      .preload('sender', (q) => q.select(['id', 'first_name', 'last_name', 'role']))
      .orderBy('created_at', 'asc')

    if (transactionId) {
      query.where((q) => {
        q.where('transaction_id', transactionId).orWhereNull('transaction_id')
      })
    }

    const messages = await query.limit(200)
    return response.ok(messages)
  }

  async store({ request, response, auth }: HttpContext) {
    const schema = vine.object({
      provider_id: vine.number(),
      transaction_id: vine.number().optional(),
      body: vine.string().trim().minLength(1).maxLength(2000),
    })
    const data = await vine.validate({ schema, data: request.all() })
    const user = auth.user!

    let senderRole: 'admin' | 'provider'
    if (user.role === 'admin') {
      senderRole = 'admin'
    } else if (user.role === 'provider') {
      const mine = await ServiceProvider.query().where('user_id', user.id).firstOrFail()
      if (mine.id !== data.provider_id) {
        return response.forbidden({ message: 'Accès refusé' })
      }
      senderRole = 'provider'
    } else {
      return response.forbidden({ message: 'Accès refusé' })
    }

    if (data.transaction_id) {
      const txn = await Transaction.query()
        .where('id', data.transaction_id)
        .where('type', 'provider_payment')
        .preload('reservation')
        .first()
      if (!txn?.reservation || txn.reservation.providerId !== data.provider_id) {
        return response.badRequest({ message: 'Transaction invalide pour ce prestataire' })
      }
    }

    const message = await PayoutMessage.create({
      providerId: data.provider_id,
      transactionId: data.transaction_id ?? null,
      senderId: user.id,
      senderRole,
      body: data.body,
    })

    await message.load('sender', (q) => q.select(['id', 'first_name', 'last_name', 'role']))

    return response.created({ message: 'Message envoyé', payoutMessage: message })
  }
}
