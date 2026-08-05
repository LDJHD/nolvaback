import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import Event from '#models/event'
import ServiceProvider from '#models/service_provider'
import QuoteRequest from '#models/quote_request'
import User from '#models/user'
import QuoteFlowService from '#services/quote_flow_service'
import NotificationService from '#services/notification_service'
import { DateTime } from 'luxon'

function likeTerm(raw: string) {
  const s = raw.replace(/[%_]/g, '').trim()
  return s.length ? `%${s}%` : ''
}

export default class AdminDirectoryController {
  async listMembersHistory({ request, response }: HttpContext) {
    const page = request.input('page', 1)
    const limit = Math.min(Number(request.input('limit', 20)) || 20, 100)
    const defaultStart = '2026-01-01'
    const defaultEnd = DateTime.now().toISODate()
    const rawStart = String(request.input('start_date', defaultStart)).trim() || defaultStart
    const rawEnd = String(request.input('end_date', defaultEnd)).trim() || defaultEnd

    const startDate = DateTime.fromISO(rawStart, { zone: 'local' })
    const endDate = DateTime.fromISO(rawEnd, { zone: 'local' })

    if (!startDate.isValid || !endDate.isValid) {
      return response.badRequest({ message: 'Dates invalides. Format attendu : YYYY-MM-DD.' })
    }

    const start = startDate.startOf('day')
    const end = endDate.endOf('day')

    if (start > end) {
      return response.badRequest({
        message: 'La date de debut doit etre anterieure ou egale a la date de fin.',
      })
    }

    const members = await User.query()
      .select([
        'id',
        'first_name',
        'last_name',
        'email',
        'phone',
        'role',
        'city',
        'is_active',
        'created_at',
      ])
      .whereIn('role', ['user', 'provider'])
      .whereBetween('created_at', [start.toSQL()!, end.toSQL()!])
      .orderBy('created_at', 'desc')
      .paginate(page, limit)

    const totalRow = await User.query()
      .whereIn('role', ['user', 'provider'])
      .whereBetween('created_at', [start.toSQL()!, end.toSQL()!])
      .count('* as total')
      .first()

    return response.ok({
      filters: {
        start_date: start.toISODate(),
        end_date: end.toISODate(),
      },
      total: Number(totalRow?.$extras.total || 0),
      data: members,
    })
  }
  /** Tous les événements (recherche, type, statut, validation) */
  async listEvents({ request, response }: HttpContext) {
    const page = request.input('page', 1)
    const limit = Math.min(Number(request.input('limit', 20)) || 20, 100)
    const search = String(request.input('search', '')).trim()
    const eventType = request.input('event_type')
    const status = request.input('status')
    const approved = request.input('approved')

    const query = Event.query()
      .preload('organizer', (q) => q.select(['id', 'first_name', 'last_name', 'email', 'phone']))
      .preload('ticketTypes', (q) => q.orderBy('sort_order', 'asc'))
      .orderBy('created_at', 'desc')

    if (search) {
      const t = likeTerm(search)
      query.where((q) => {
        q.where('title', 'like', t).orWhere('city', 'like', t).orWhere('location', 'like', t)
      })
    }
    if (eventType) query.where('eventType', eventType)
    if (status) query.where('status', status)
    if (approved === 'true') query.where('isApproved', true)
    if (approved === 'false') query.where('isApproved', false)

    const events = await query.paginate(page, limit)
    return response.ok(events)
  }

  /** Modération d'un événement (hors flux simple approve/reject si besoin) */
  async updateEvent({ params, request, response }: HttpContext) {
    const event = await Event.findOrFail(params.id)
    const schema = vine.object({
      is_approved: vine.boolean().optional(),
      is_public: vine.boolean().optional(),
      is_featured: vine.boolean().optional(),
      featured_order: vine.number().min(0).optional(),
      status: vine.enum(['upcoming', 'ongoing', 'completed', 'cancelled']).optional(),
    })
    const data = await vine.validate({ schema, data: request.all() })

    if (data.is_approved !== undefined) event.isApproved = data.is_approved
    if (data.is_public !== undefined) event.isPublic = data.is_public
    if (data.is_featured !== undefined) event.isFeatured = data.is_featured
    if (data.featured_order !== undefined) event.featuredOrder = data.featured_order
    if (data.status !== undefined) event.status = data.status
    await event.save()

    return response.ok({ message: 'Événement mis à jour', event })
  }

  /** Tous les prestataires */
  async listProviders({ request, response }: HttpContext) {
    const page = request.input('page', 1)
    const limit = Math.min(Number(request.input('limit', 20)) || 20, 100)
    const search = String(request.input('search', '')).trim()
    const type = request.input('type')
    const status = request.input('status')

    const query = ServiceProvider.query()
      .preload('user', (q) => q.select(['id', 'first_name', 'last_name', 'email', 'phone', 'avatar']))
      .orderBy('created_at', 'desc')

    if (search) {
      const t = likeTerm(search)
      query.where((q) => {
        q.where('businessName', 'like', t).orWhereHas('user', (uq) => {
          uq.where('firstName', 'like', t).orWhere('lastName', 'like', t).orWhere('email', 'like', t)
        })
      })
    }
    if (type) query.where('type', type)
    if (status) query.where('status', status)

    const providers = await query.paginate(page, limit)
    return response.ok(providers)
  }

  async updateProvider({ params, request, response }: HttpContext) {
    const provider = await ServiceProvider.findOrFail(params.id)
    const schema = vine.object({
      status: vine.enum(['active', 'pending', 'inactive']).optional(),
      is_verified: vine.boolean().optional(),
      is_available: vine.boolean().optional(),
      rating_points_delta: vine.number().min(1).optional(),
    })
    const data = await vine.validate({ schema, data: request.all() })

    if (data.status !== undefined) provider.status = data.status
    if (data.is_verified !== undefined) provider.isVerified = data.is_verified
    if (data.is_available !== undefined) provider.isAvailable = data.is_available
    if (data.rating_points_delta !== undefined) {
      provider.ratingPoints = Number(provider.ratingPoints || 0) + data.rating_points_delta
    }
    await provider.save()

    if (data.rating_points_delta !== undefined && data.rating_points_delta !== 0) {
      await NotificationService.notifyUser(
        provider.userId,
        'admin_provider_points',
        'Points ajustes par NOLVA',
        `NOLVA a ajoute ${data.rating_points_delta} point(s) a votre profil prestataire.`,
        { provider_id: provider.id, points: data.rating_points_delta }
      )
    }

    return response.ok({ message: 'Prestataire mis à jour', provider })
  }

  /** Toutes les demandes de devis */
  async listQuoteRequests({ request, response }: HttpContext) {
    const page = request.input('page', 1)
    const limit = Math.min(Number(request.input('limit', 20)) || 20, 100)
    const search = String(request.input('search', '')).trim()
    const status = request.input('status')
    const eventType = request.input('event_type')

    const query = QuoteRequest.query()
      .preload('user', (q) => q.select(['id', 'first_name', 'last_name', 'email', 'phone']))
      .preload('provider', (q) =>
        q.preload('user', (uq) => uq.select(['id', 'first_name', 'last_name', 'email']))
      )
      .orderBy('created_at', 'desc')

    if (search) {
      const t = likeTerm(search)
      query.where((q) => {
        q.where('message', 'like', t).orWhere('location', 'like', t)
      })
    }
    if (status) query.where('status', status)
    if (eventType) query.where('eventType', eventType)

    const requests = await query.paginate(page, limit)
    return response.ok(requests)
  }

  /** Admin : ajuster le statut d'une demande (suivi / clôture) */
  async updateQuoteRequest({ params, request, response }: HttpContext) {
    const quoteRequest = await QuoteRequest.findOrFail(params.id)
    const schema = vine.object({
      status: vine.enum([
        'pending',
        'negotiating',
        'accepted',
        'paid',
        'declined',
        'completed',
        'cancelled',
      ]),
    })
    const data = await vine.validate({ schema, data: request.all() })

    quoteRequest.status = data.status
    await quoteRequest.save()
    await QuoteFlowService.logActivity(
      quoteRequest.id,
      'admin_status_update',
      null,
      'admin',
      { status: data.status }
    )
    await quoteRequest.load('provider', (q) => q.preload('user'))
    await quoteRequest.load('user')

    return response.ok({ message: 'Demande de devis mise à jour', quoteRequest })
  }
}
