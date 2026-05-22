import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { DateTime } from 'luxon'
import Event from '#models/event'
import EventType from '#models/event_type'
import EventTicketType from '#models/event_ticket_type'
import ProviderType from '#models/provider_type'
import Ticket from '#models/ticket'
import EventPublishService from '#services/event_publish_service'
import { parseEventDateInput } from '#utils/event_date'

const ticketTypeRowSchema = vine.object({
  label: vine.string().trim().minLength(1).maxLength(120),
  price: vine.number().min(0),
  quantity: vine.number().min(0),
})

export default class EventsController {
  async index({ request, response }: HttpContext) {
    const page = request.input('page', 1)
    const city = request.input('city')
    const type = request.input('type')

    const query = Event.query()
      .where('is_public', true)
      .where('is_approved', true)
      .whereIn('status', ['upcoming', 'ongoing'])
      .preload('organizer', (q) => q.select(['id', 'first_name', 'last_name', 'avatar']))
      .preload('ticketTypes', (q) => q.orderBy('sort_order', 'asc'))
      .orderBy('event_date', 'asc')

    if (city) query.where('city', city)
    if (type) query.where('event_type', type)

    const events = await query.paginate(page, 12)

    return response.ok(events)
  }

  async show({ params, response }: HttpContext) {
    const event = await Event.query()
      .where('id', params.id)
      .where('is_public', true)
      .where('is_approved', true)
      .preload('organizer', (q) => q.select(['id', 'first_name', 'last_name', 'avatar']))
      .preload('ticketTypes', (q) => q.orderBy('sort_order', 'asc'))
      .firstOrFail()

    const ticketTypes = event.ticketTypes.map((tt) => ({
      id: tt.id,
      label: tt.label,
      price: Number(tt.price),
      quantity: tt.quantity,
      sold: tt.sold,
      available: tt.available,
    }))

    const availableTickets =
      ticketTypes.length > 0
        ? ticketTypes.reduce((sum, t) => sum + (t.available === 999999 ? 999 : t.available), 0)
        : event.ticketCount > 0
          ? event.ticketCount - event.ticketsSold
          : null

    return response.ok({
      ...event.serialize(),
      ticket_types: ticketTypes,
      availableTickets,
    })
  }

  async publishSuggestions({ request, response }: HttpContext) {
    const eventType = request.input('event_type', 'autre')
    const title = request.input('title', '')
    const city = request.input('city', '')

    const providerSlugs = EventPublishService.providerSlugsForEvent(eventType)
    const providerTypes = await ProviderType.query()
      .whereIn('slug', providerSlugs)
      .where('is_active', true)
      .orderBy('sort_order', 'asc')

    return response.ok({
      tips: EventPublishService.tipsForEvent(eventType, { title, city }),
      suggested_tickets: EventPublishService.suggestedTicketLabels(eventType),
      provider_types: providerTypes.map((p) => ({ slug: p.slug, label: p.label })),
    })
  }

  async store({ auth, request, response }: HttpContext) {
    const user = auth.user!

    const schema = vine.object({
      title: vine.string().trim(),
      description: vine.string().optional(),
      event_date: vine.string().trim(),
      location: vine.string().optional(),
      city: vine.string().optional(),
      image: vine.string().optional(),
      ticket_price: vine.number().min(0).optional(),
      ticket_count: vine.number().min(0).optional(),
      ticket_types: vine.array(ticketTypeRowSchema).optional(),
      event_type: vine.string().trim(),
      auto_publish: vine.boolean().optional(),
    })

    const data = await vine.validate({ schema, data: request.all() })

    let eventDate: DateTime
    try {
      eventDate = parseEventDateInput(data.event_date)
    } catch {
      return response.badRequest({ message: "Date d'événement invalide" })
    }

    const eventType = await EventType.query()
      .where('slug', data.event_type)
      .where('is_active', true)
      .first()
    if (!eventType) {
      return response.badRequest({ message: "Type d'événement invalide ou inactif" })
    }

    const rows = data.ticket_types?.filter((r) => r.label.trim()) || []
    let ticketPrice = data.ticket_price ?? 0
    let ticketCount = data.ticket_count ?? 0

    if (rows.length > 0) {
      const prices = rows.map((r) => r.price).filter((p) => p > 0)
      ticketPrice = prices.length > 0 ? Math.min(...prices) : 0
      ticketCount = rows.reduce((s, r) => s + (r.quantity || 0), 0)
    }

    const autoPublish = data.auto_publish === true

    const event = await Event.create({
      organizerId: user.id,
      title: data.title,
      description: data.description ?? null,
      eventDate,
      eventType: data.event_type,
      location: data.location ?? null,
      city: data.city ?? null,
      image: data.image ?? null,
      ticketPrice,
      ticketCount,
      ticketsSold: 0,
      isPublic: true,
      isApproved: autoPublish,
      status: 'upcoming',
    })

    if (rows.length > 0) {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]!
        await EventTicketType.create({
          eventId: event.id,
          label: row.label.trim(),
          price: row.price,
          quantity: row.quantity,
          sold: 0,
          sortOrder: i,
        })
      }
      await event.load('ticketTypes')
    }

    const providerSlugs = EventPublishService.providerSlugsForEvent(data.event_type)
    const providerTypes = await ProviderType.query()
      .whereIn('slug', providerSlugs)
      .where('is_active', true)
      .orderBy('sort_order', 'asc')

    return response.created({
      message: autoPublish
        ? 'Événement publié sur la plateforme NOLVA.'
        : 'Événement soumis avec succès. Il sera visible après validation par un administrateur NOLVA.',
      event,
      ticket_types: event.ticketTypes,
      provider_types: providerTypes.map((p) => ({ slug: p.slug, label: p.label })),
      auto_published: autoPublish,
    })
  }

  async myEvents({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const page = request.input('page', 1)

    const events = await Event.query()
      .where('organizer_id', user.id)
      .preload('ticketTypes', (q) => q.orderBy('sort_order', 'asc'))
      .orderBy('created_at', 'desc')
      .paginate(page, 20)

    return response.ok(events)
  }

  async adminPending({ response }: HttpContext) {
    const events = await Event.query()
      .where('is_approved', false)
      .whereNot('status', 'cancelled')
      .preload('organizer', (q) => q.select(['id', 'first_name', 'last_name', 'email', 'phone']))
      .preload('ticketTypes')
      .orderBy('created_at', 'desc')

    return response.ok(events)
  }

  async adminApprove({ params, response }: HttpContext) {
    const event = await Event.findOrFail(params.id)

    if (event.isApproved) {
      return response.badRequest({ message: 'Cet événement est déjà validé' })
    }

    event.isApproved = true
    event.status = 'upcoming'
    await event.save()

    return response.ok({
      message: 'Événement validé et publié sur la plateforme',
      event,
    })
  }

  async adminReject({ auth, params, request, response }: HttpContext) {
    const schema = vine.object({
      note: vine.string().trim().minLength(5),
    })
    const data = await vine.validate({ schema, data: request.all() })

    const event = await Event.findOrFail(params.id)
    event.isApproved = false
    event.status = 'cancelled'
    event.rejectionReason = data.note
    event.rejectedAt = DateTime.now()
    await event.save()

    if (event.organizerId) {
      const NotificationService = (await import('#services/notification_service')).default
      const AdminLogService = (await import('#services/admin_log_service')).default
      await NotificationService.notifyUser(
        event.organizerId,
        'event_rejected',
        'Événement refusé',
        `Votre événement « ${event.title} » a été refusé. Motif : ${data.note}`,
        { event_id: event.id }
      )
      await AdminLogService.log(auth.user!.id, 'event_rejected', 'event', event.id, {
        note: data.note,
      })
    }

    return response.ok({
      message: 'Événement refusé — l’organisateur a été notifié',
      event,
    })
  }

  async myTickets({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const page = request.input('page', 1)

    const tickets = await Ticket.query()
      .where('user_id', user.id)
      .preload('event')
      .orderBy('created_at', 'desc')
      .paginate(page, 10)

    return response.ok(tickets)
  }
}
