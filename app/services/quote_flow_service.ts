import QuoteRequest from '#models/quote_request'
import QuoteMessage from '#models/quote_message'
import QuoteActivity from '#models/quote_activity'
import Reservation from '#models/reservation'
import ServiceProvider from '#models/service_provider'

export const PAYMENT_SECURITY_NB = `NB : Pour garantir votre sécurité, le paiement doit obligatoirement être effectué via la plateforme NOLVA (FedaPay). Sans paiement sur la plateforme, NOLVA ne pourra être tenue responsable en cas de litige ou de problème.`

export const QUOTE_ACCEPTED_CLIENT_MSG = `Votre devis a été validé par le prestataire. Vous pouvez maintenant procéder au paiement sur la plateforme pour confirmer la prestation.`

export default class QuoteFlowService {
  static async logActivity(
    quoteRequestId: number,
    action: string,
    actorId: number | null,
    actorRole: string | null,
    metadata?: Record<string, unknown>
  ) {
    return QuoteActivity.create({
      quoteRequestId,
      action,
      actorId,
      actorRole,
      metadata: metadata ?? null,
    })
  }

  static async addMessage(
    quoteRequestId: number,
    senderId: number | null,
    senderRole: string,
    body: string,
    isSystem = false
  ) {
    const quote = await QuoteRequest.findOrFail(quoteRequestId)
    if (!isSystem && quote.status === 'pending') {
      quote.status = 'negotiating'
      await quote.save()
    }

    const message = await QuoteMessage.create({
      quoteRequestId,
      senderId,
      senderRole,
      body,
      isSystem,
    })

    await this.logActivity(quoteRequestId, isSystem ? 'system_message' : 'message_sent', senderId, senderRole, {
      preview: body.slice(0, 120),
    })

    return message
  }

  static async acceptQuote(quote: QuoteRequest, provider: ServiceProvider, agreedPrice?: number) {
    const price = agreedPrice ?? Number(quote.agreedPrice) ?? Number(quote.proposedPrice)
    if (!price || price <= 0) {
      throw new Error('PRICE_REQUIRED')
    }

    if (!quote.providerId) {
      quote.providerId = provider.id
    }

    quote.agreedPrice = price
    quote.status = 'accepted'

    let reservation = quote.reservationId
      ? await Reservation.find(quote.reservationId)
      : null

    if (!reservation) {
      reservation = await Reservation.create({
        userId: quote.userId,
        providerId: quote.providerId!,
        quoteRequestId: quote.id,
        totalAmount: price,
        depositAmount: Math.round(price * 0.3),
        currency: 'FCFA',
        status: 'pending',
        paymentStatus: 'unpaid',
      })
      quote.reservationId = reservation.id
    } else {
      reservation.totalAmount = price
      reservation.depositAmount = Math.round(price * 0.3)
      reservation.paymentStatus = 'unpaid'
      reservation.status = 'pending'
      await reservation.save()
    }

    await quote.save()

    await this.addMessage(quote.id, null, 'system', QUOTE_ACCEPTED_CLIENT_MSG, true)
    await this.addMessage(quote.id, null, 'system', PAYMENT_SECURITY_NB, true)

    await this.logActivity(quote.id, 'quote_accepted', provider.userId, 'provider', {
      agreed_price: price,
      reservation_id: reservation.id,
    })

    return { quote, reservation }
  }
}
