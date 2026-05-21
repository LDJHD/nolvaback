import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { DateTime } from 'luxon'
import Event from '#models/event'
import EventType from '#models/event_type'
import Ticket from '#models/ticket'
import { parseEventDateInput } from '#utils/event_date'

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
      .firstOrFail()

    const availableTickets = event.ticketCount > 0 ? event.ticketCount - event.ticketsSold : null

    return response.ok({ ...event.serialize(), availableTickets })
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
      event_type: vine.string().trim(),
    })

    const data = await vine.validate({ schema, data: request.all() })

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
      return response.badRequest({ message: 'Type d\'événement invalide ou inactif' })
    }

    const event = await Event.create({
      organizerId: user.id,
      title: data.title,
      description: data.description ?? null,
      eventDate,
      eventType: data.event_type,
      location: data.location ?? null,
      city: data.city ?? null,
      image: data.image ?? null,
      ticketPrice: data.ticket_price ?? 0,
      ticketCount: data.ticket_count ?? 0,
      ticketsSold: 0,
      isPublic: true,
      isApproved: false,
      status: 'upcoming',
    })

    return response.created({
      message:
        'Événement soumis avec succès. Il sera visible après validation par un administrateur NOLVA.',
      event,
    })
  }

  async myEvents({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const page = request.input('page', 1)

    const events = await Event.query()
      .where('organizer_id', user.id)
      .orderBy('created_at', 'desc')
      .paginate(page, 20)

    return response.ok(events)
  }

  async adminPending({ response }: HttpContext) {
    const events = await Event.query()
      .where('is_approved', false)
      .whereNot('status', 'cancelled')
      .preload('organizer', (q) => q.select(['id', 'first_name', 'last_name', 'email', 'phone']))
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

  async adminReject({ params, request, response }: HttpContext) {
    const schema = vine.object({
      note: vine.string().optional(),
    })
    const data = await vine.validate({ schema, data: request.all() })

    const event = await Event.findOrFail(params.id)
    event.isApproved = false
    event.status = 'cancelled'
    if (data.note) {
      event.description = `${event.description || ''}\n\n[Refus admin] ${data.note}`.trim()
    }
    await event.save()

    return response.ok({
      message: 'Événement refusé',
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
