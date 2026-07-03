import type { HttpContext } from '@adonisjs/core/http'
import { Exception } from '@adonisjs/core/exceptions'
import vine from '@vinejs/vine'
import { DateTime } from 'luxon'
import QuoteRequest from '#models/quote_request'
import QuoteMessage from '#models/quote_message'
import QuoteActivity from '#models/quote_activity'
import ServiceProvider from '#models/service_provider'
import EventType from '#models/event_type'
import ProviderType from '#models/provider_type'
import { parseEventDateInput } from '#utils/event_date'
import QuoteFlowService, { PAYMENT_SECURITY_NB } from '#services/quote_flow_service'
import MailService from '#services/mail_service'
import NotificationService from '#services/notification_service'
import env from '#start/env'

export default class QuoteRequestsController {
  async store({ auth, request, response }: HttpContext) {
    const user = auth.user!

    const schema = vine.object({
      provider_id: vine.number().optional(),
      provider_type: vine.string().trim().optional(),
      event_type: vine.string().trim(),
      event_date: vine.string().trim(),
      start_time: vine.string().trim().optional(),
      end_time: vine.string().trim().optional(),
      location: vine.string().optional(),
      city: vine.string().trim().optional(),
      guest_count: vine.number().min(1).optional(),
      budget: vine.number().min(1).optional(),
      proposed_price: vine.number().min(1).optional(),
      message: vine.string().trim(),
    })

    const data = await vine.validate({ schema, data: request.all() })

    const priceAmount = data.proposed_price ?? data.budget ?? null
    if (data.provider_id && priceAmount === null) {
      return response.badRequest({
        message: 'Indiquez un prix proposé (montant en FCFA).',
      })
    }

    if (!data.provider_id && !data.provider_type) {
      return response.badRequest({
        message: 'Indiquez un prestataire ou un type de prestataire.',
      })
    }

    let eventDate: DateTime
    try {
      eventDate = parseEventDateInput(data.event_date)
    } catch {
      return response.badRequest({ message: 'Date d\'événement invalide' })
    }

    const eventType = await EventType.query()
      .where('slug', data.event_type)
      .where('is_active', true)
      .first()
    if (!eventType) {
      return response.badRequest({ message: 'Type d\'événement invalide' })
    }

    let providerId: number | null = null
    let providerType: string | null = data.provider_type ?? null

    if (data.provider_id) {
      const provider = await ServiceProvider.query()
        .where('id', data.provider_id)
        .where('status', 'active')
        .first()
      if (!provider) {
        return response.badRequest({ message: 'Prestataire introuvable ou inactif' })
      }
      providerId = provider.id
      providerType = provider.type
    } else if (providerType) {
      const typeRow = await ProviderType.query()
        .where('slug', providerType)
        .where('is_active', true)
        .first()
      if (!typeRow) {
        return response.badRequest({ message: 'Type de prestataire invalide' })
      }
    }

    const quoteRequest = await QuoteRequest.create({
      userId: user.id,
      providerId,
      providerType,
      eventType: data.event_type,
      eventDate,
      startTime: data.start_time ?? null,
      endTime: data.end_time ?? null,
      location: data.location ?? data.city ?? null,
      proposedPrice: priceAmount,
      budget: priceAmount,
      message: data.message,
      status: 'pending',
    })

    await QuoteFlowService.addMessage(
      quoteRequest.id,
      user.id,
      'client',
      data.message,
      false
    )
    await QuoteFlowService.logActivity(quoteRequest.id, 'quote_created', user.id, 'client', {
      provider_id: providerId,
      proposed_price: priceAmount,
      budget: data.budget,
      event_type: data.event_type,
    })

    if (providerId) {
      await quoteRequest.load('provider', (q) => q.preload('user'))
      const providerUser = quoteRequest.provider?.user
      if (providerUser) {
        await NotificationService.notifyUser(
          providerUser.id,
          'quote_request_created',
          'Nouvelle demande de devis',
          `${user.firstName} ${user.lastName} vous a envoye une demande de devis.`,
          { quote_request_id: quoteRequest.id, url: `/devis/${quoteRequest.id}` }
        )
        if (providerUser.email) {
          const quoteUrl = `${env.get('FRONTEND_URL')}/devis/${quoteRequest.id}`
          await MailService.send({
            to: providerUser.email,
            subject: 'Nouvelle demande de devis - NOLVA',
            html: `
              <p>Bonjour ${providerUser.firstName},</p>
              <p>Vous avez recu une nouvelle demande de devis sur NOLVA.</p>
              <p><strong>Evenement :</strong> ${data.event_type}</p>
              <p><strong>Message client :</strong> ${data.message}</p>
              <p><a href="${quoteUrl}">Consulter la demande</a></p>
            `,
            text: `Nouvelle demande de devis NOLVA. Consultez-la ici : ${quoteUrl}`,
          })
        }
      }
    } else if (providerType) {
      const providers = await ServiceProvider.query()
        .where('type', providerType)
        .where('status', 'active')
        .preload('user')
      for (const provider of providers) {
        const providerUser = provider.user
        if (!providerUser) continue
        await NotificationService.notifyUser(
          providerUser.id,
          'quote_request_created',
          'Nouvelle demande de devis',
          `${user.firstName} ${user.lastName} a envoye une demande de devis correspondant a votre activite.`,
          { quote_request_id: quoteRequest.id, url: `/devis/${quoteRequest.id}` }
        )
        if (providerUser.email) {
          const quoteUrl = `${env.get('FRONTEND_URL')}/devis/${quoteRequest.id}`
          await MailService.send({
            to: providerUser.email,
            subject: 'Nouvelle demande de devis - NOLVA',
            html: `
              <p>Bonjour ${providerUser.firstName},</p>
              <p>Une nouvelle demande de devis correspond a votre type de prestation sur NOLVA.</p>
              <p><strong>Evenement :</strong> ${data.event_type}</p>
              <p><strong>Message client :</strong> ${data.message}</p>
              <p><a href="${quoteUrl}">Consulter la demande</a></p>
            `,
            text: `Nouvelle demande de devis NOLVA. Consultez-la ici : ${quoteUrl}`,
          })
        }
      }
    }

    return response.created({
      message: providerId
        ? 'Demande de devis envoyée au prestataire.'
        : 'Demande envoyée aux prestataires du type choisi.',
      quoteRequest,
    })
  }

  async show({ auth, params, response }: HttpContext) {
    const user = auth.user!
    let quote: QuoteRequest
    try {
      quote = await this.findQuoteForUser(params.id, user)
    } catch (error: any) {
      if (error?.code === 'E_ROW_NOT_FOUND') {
        return response.notFound({ message: 'Demande de devis introuvable.' })
      }
      return response.forbidden({ message: 'Accès refusé à cette demande.' })
    }

    await quote.load('provider', (q) => q.preload('user'))
    await quote.load('user', (q) => q.select(['id', 'first_name', 'last_name', 'email', 'phone']))
    await quote.load('reservation')
    await quote.load('messages', (mq) => {
      mq.orderBy('created_at', 'asc').preload('sender', (sq) =>
        sq.select(['id', 'first_name', 'last_name', 'role'])
      )
    })

    return response.ok(quote)
  }

  async messages({ auth, params, response }: HttpContext) {
    const user = auth.user!
    try {
      await this.findQuoteForUser(params.id, user)
    } catch (error: any) {
      if (error?.code === 'E_ROW_NOT_FOUND') {
        return response.notFound({ message: 'Demande de devis introuvable.' })
      }
      return response.forbidden({ message: 'Accès refusé à cette demande.' })
    }

    const messages = await QuoteMessage.query()
      .where('quote_request_id', params.id)
      .orderBy('created_at', 'asc')
      .preload('sender', (q) => q.select(['id', 'first_name', 'last_name', 'role']))

    return response.ok(messages)
  }

  async postMessage({ auth, params, request, response }: HttpContext) {
    const user = auth.user!
    let quote: QuoteRequest
    try {
      quote = await this.findQuoteForUser(params.id, user)
    } catch (error: any) {
      if (error?.code === 'E_ROW_NOT_FOUND') {
        return response.notFound({ message: 'Demande de devis introuvable.' })
      }
      return response.forbidden({ message: 'Accès refusé à cette demande.' })
    }

    if (['declined', 'cancelled', 'completed'].includes(quote.status)) {
      return response.badRequest({ message: 'Cette demande est clôturée.' })
    }

    const schema = vine.object({
      body: vine.string().trim().minLength(1),
    })
    const { body } = await vine.validate({ schema, data: request.all() })

    const role = await this.actorRole(user, quote)

    const message = await QuoteFlowService.addMessage(quote.id, user.id, role, body)

    await message.load('sender', (q) => q.select(['id', 'first_name', 'last_name', 'role']))

    return response.created({ message: 'Message envoyé', quoteMessage: message })
  }

  async myRequests({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const page = request.input('page', 1)

    const requests = await QuoteRequest.query()
      .where('user_id', user.id)
      .preload('provider', (q) => q.preload('user'))
      .preload('reservation')
      .orderBy('created_at', 'desc')
      .paginate(page, 10)

    return response.ok(requests)
  }

  async providerShow({ auth, params, response }: HttpContext) {
    const user = auth.user!
    const provider = await ServiceProvider.query().where('user_id', user.id).firstOrFail()
    const quote = await this.findQuoteForProvider(params.id, provider)

    await quote.load('user', (q) => q.select(['id', 'first_name', 'last_name', 'email', 'phone']))
    await quote.load('reservation')
    await quote.load('messages', (mq) => {
      mq.orderBy('created_at', 'asc').preload('sender', (sq) =>
        sq.select(['id', 'first_name', 'last_name', 'role'])
      )
    })

    return response.ok(quote)
  }

  async providerMessages({ auth, params, response }: HttpContext) {
    const user = auth.user!
    const provider = await ServiceProvider.query().where('user_id', user.id).firstOrFail()
    await this.findQuoteForProvider(params.id, provider)

    const messages = await QuoteMessage.query()
      .where('quote_request_id', params.id)
      .orderBy('created_at', 'asc')
      .preload('sender', (q) => q.select(['id', 'first_name', 'last_name', 'role']))

    return response.ok(messages)
  }

  async providerPostMessage({ auth, params, request, response }: HttpContext) {
    const user = auth.user!
    const provider = await ServiceProvider.query().where('user_id', user.id).firstOrFail()
    const quote = await this.findQuoteForProvider(params.id, provider)

    if (['declined', 'cancelled', 'completed'].includes(quote.status)) {
      return response.badRequest({ message: 'Cette demande est clôturée.' })
    }

    const schema = vine.object({
      body: vine.string().trim().minLength(1),
    })
    const { body } = await vine.validate({ schema, data: request.all() })

    const message = await QuoteFlowService.addMessage(quote.id, user.id, 'provider', body)
    await message.load('sender', (q) => q.select(['id', 'first_name', 'last_name', 'role']))

    return response.created({ message: 'Message envoyé', quoteMessage: message })
  }

  async providerRequests({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const page = request.input('page', 1)
    const status = request.input('status')

    const provider = await ServiceProvider.query().where('user_id', user.id).firstOrFail()

    const query = QuoteRequest.query()
      .where((q) => {
        q.where('provider_id', provider.id).orWhere((open) => {
          open.whereNull('provider_id').where('provider_type', provider.type)
        })
      })
      .preload('user', (q) => q.select(['id', 'first_name', 'last_name', 'phone', 'email']))
      .preload('reservation')
      .orderBy('created_at', 'desc')

    if (status) query.where('status', status)

    const requests = await query.paginate(page, 10)

    return response.ok(requests)
  }

  async updateStatus({ auth, params, request, response }: HttpContext) {
    const user = auth.user!
    const provider = await ServiceProvider.query().where('user_id', user.id).firstOrFail()

    const quoteRequest = await this.findQuoteForProvider(params.id, provider)

    const schema = vine.object({
      status: vine.enum(['accepted', 'declined']),
      agreed_price: vine.number().min(1).optional(),
    })

    const data = await vine.validate({ schema, data: request.all() })

    if (data.status === 'declined') {
      quoteRequest.status = 'declined'
      await quoteRequest.save()
      await QuoteFlowService.addMessage(
        quoteRequest.id,
        user.id,
        'provider',
        'Le prestataire a décliné cette demande de devis.',
        true
      )
      await QuoteFlowService.logActivity(quoteRequest.id, 'quote_declined', user.id, 'provider')
      return response.ok({ message: 'Demande refusée', quoteRequest })
    }

    try {
      const { quote, reservation } = await QuoteFlowService.acceptQuote(
        quoteRequest,
        provider,
        data.agreed_price
      )
      await quote.load('user')
      if (quote.user) {
        await NotificationService.notifyUser(
          quote.user.id,
          'quote_request_accepted',
          'Devis valide',
          'Le prestataire a valide votre devis. Vous pouvez maintenant proceder au paiement.',
          { quote_request_id: quote.id, reservation_id: reservation.id, url: `/devis/${quote.id}` }
        )
        if (quote.user.email) {
          const quoteUrl = `${env.get('FRONTEND_URL')}/devis/${quote.id}`
          await MailService.send({
            to: quote.user.email,
            subject: 'Votre devis a ete valide - NOLVA',
            html: `
              <p>Bonjour ${quote.user.firstName},</p>
              <p>Le prestataire a valide votre devis sur NOLVA.</p>
              <p>Vous pouvez maintenant proceder au paiement securise sur la plateforme.</p>
              <p><a href="${quoteUrl}">Voir le devis</a></p>
            `,
            text: `Votre devis a ete valide. Voir le devis : ${quoteUrl}`,
          })
        }
      }
      await quote.load('reservation')
      return response.ok({
        message: 'Devis validé. Le client peut payer sur la plateforme.',
        quoteRequest: quote,
        reservation,
        nb: PAYMENT_SECURITY_NB,
      })
    } catch (e: any) {
      if (e.message === 'PRICE_REQUIRED') {
        return response.badRequest({ message: 'Indiquez un prix convenu ou validez le prix proposé par le client.' })
      }
      throw e
    }
  }

  async listActivities({ request, response }: HttpContext) {
    const page = request.input('page', 1)
    const limit = Math.min(Number(request.input('limit', 30)) || 30, 100)
    const activities = await QuoteActivity.query()
      .preload('quoteRequest', (q) => {
        q.preload('user', (uq) => uq.select(['id', 'first_name', 'last_name']))
        q.preload('provider', (pq) => pq.preload('user', (pu) => pu.select(['id', 'first_name', 'last_name'])))
      })
      .preload('actor', (a) => a.select(['id', 'first_name', 'last_name', 'role']))
      .orderBy('created_at', 'desc')
      .paginate(page, limit)

    return response.ok(activities)
  }

  private async findQuoteForUser(id: string | number, user: { id: number; role: string }) {
    const quote = await QuoteRequest.findOrFail(id)
    if (quote.userId === user.id) return quote

    if (user.role === 'provider') {
      const provider = await ServiceProvider.query().where('user_id', user.id).first()
      if (provider) {
        return this.findQuoteForProvider(id, provider)
      }
    }

    throw new Exception('Accès refusé', { status: 403 })
  }

  private async findQuoteForProvider(id: string | number, provider: ServiceProvider) {
    const quote = await QuoteRequest.query()
      .where('id', id)
      .where((q) => {
        q.where('provider_id', provider.id).orWhere((open) => {
          open.whereNull('provider_id').where('provider_type', provider.type)
        })
      })
      .firstOrFail()

    return quote
  }

  private async actorRole(
    user: { id: number; role: string },
    quote: QuoteRequest
  ): Promise<string> {
    if (quote.userId === user.id) return 'client'
    if (user.role === 'provider') return 'provider'
    return 'admin'
  }
}
