import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { DateTime } from 'luxon'
import Event from '#models/event'
import EventRegistration from '#models/event_registration'
import EventType from '#models/event_type'
import EventTicketType from '#models/event_ticket_type'
import ProviderType from '#models/provider_type'
import Ticket from '#models/ticket'
import Transaction from '#models/transaction'
import EventPublishService from '#services/event_publish_service'
import MailService from '#services/mail_service'
import { parseEventDateInput } from '#utils/event_date'
import env from '#start/env'

const ticketTypeRowSchema = vine.object({
  label: vine.string().trim().minLength(1).maxLength(120),
  price: vine.number().min(0),
  quantity: vine.number().min(0),
})

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function fullName(user: { firstName?: string | null; lastName?: string | null } | null): string {
  return [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || 'Organisateur'
}

function normalizePhone(raw: string): string {
  return String(raw || '').replace(/[\s.\-()]/g, '')
}

export default class EventsController {
  async index({ request, response }: HttpContext) {
    const page = request.input('page', 1)
    const limit = request.input('limit', 12)
    const city = request.input('city')
    const type = request.input('type')
    const search = request.input('search', '').trim()

    const query = Event.query()
      .where('is_public', true)
      .where('is_approved', true)
      .whereIn('status', ['upcoming', 'ongoing'])
      .where('event_date', '>=', DateTime.now().startOf('day').toSQL())
      .preload('organizer', (q) => q.select(['id', 'first_name', 'last_name', 'avatar']))
      .preload('ticketTypes', (q) => q.orderBy('sort_order', 'asc'))
      .orderBy('is_featured', 'desc')
      .orderBy('featured_order', 'desc')
      .orderBy('event_date', 'asc')

    if (city) query.where('city', city)
    if (type) query.where('event_type', type)
    if (search) {
      const term = `%${search}%`
      query.where((q) => {
        q.whereILike('title', term)
          .orWhereILike('description', term)
          .orWhereILike('city', term)
          .orWhereILike('location', term)
          .orWhereILike('event_type', term)
      })
    }

    const events = await query.paginate(page, limit)

    return response.ok(events)
  }

  async show({ params, response }: HttpContext) {
    const event = await Event.query()
      .where((q) => {
        q.where('id', params.id).orWhere('share_slug', params.id)
      })
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

    const event = await Event.create({
      organizerId: user.id,
      title: data.title,
      shareSlug: await this.uniqueShareSlug(data.title),
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
      isApproved: false,
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
      message: 'Événement soumis avec succès. Il sera visible après validation par un administrateur NOLVA.',
      event,
      ticket_types: event.ticketTypes,
      provider_types: providerTypes.map((p) => ({ slug: p.slug, label: p.label })),
      auto_published: false,
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

  async organizerCancel({ auth, params, request, response }: HttpContext) {
    const user = auth.user!
    const schema = vine.object({
      reason: vine.string().trim().maxLength(500).optional(),
    })
    const data = await vine.validate({ schema, data: request.all() })

    const event = await Event.query().where('id', params.id).where('organizer_id', user.id).firstOrFail()

    if (event.status === 'completed') {
      return response.badRequest({ message: 'Un evenement termine ne peut plus etre annule' })
    }
    if (event.status === 'cancelled') {
      return response.badRequest({ message: 'Cet evenement est deja annule' })
    }

    event.status = 'cancelled'
    event.isApproved = false
    if (data.reason) event.rejectionReason = data.reason
    await event.save()

    return response.ok({
      message: 'Evenement annule avec succes',
      event,
    })
  }

  async organizerReschedule({ auth, params, request, response }: HttpContext) {
    const user = auth.user!
    const schema = vine.object({
      event_date: vine.string().trim(),
      location: vine.string().trim().optional(),
      city: vine.string().trim().optional(),
    })
    const data = await vine.validate({ schema, data: request.all() })

    const event = await Event.query().where('id', params.id).where('organizer_id', user.id).firstOrFail()

    if (event.status === 'completed') {
      return response.badRequest({ message: 'Un evenement termine ne peut plus etre reporte' })
    }

    let eventDate: DateTime
    try {
      eventDate = parseEventDateInput(data.event_date)
    } catch {
      return response.badRequest({ message: "Date d'evenement invalide" })
    }

    event.eventDate = eventDate
    if (data.location !== undefined) event.location = data.location || null
    if (data.city !== undefined) event.city = data.city || null
    event.status = 'upcoming'
    event.isApproved = false
    event.rejectionReason = null
    event.rejectedAt = null
    await event.save()

    return response.ok({
      message: "Evenement reporte. Il repasse en validation administrateur avant d'etre visible.",
      event,
    })
  }

  async organizerUpdate({ auth, params, request, response }: HttpContext) {
    const user = auth.user!
    const schema = vine.object({
      title: vine.string().trim().optional(),
      description: vine.string().optional(),
      event_date: vine.string().trim().optional(),
      location: vine.string().optional(),
      city: vine.string().optional(),
      image: vine.string().optional(),
      event_type: vine.string().trim().optional(),
      ticket_price: vine.number().min(0).optional(),
      ticket_count: vine.number().min(0).optional(),
      ticket_types: vine.array(ticketTypeRowSchema).optional(),
    })
    const data = await vine.validate({ schema, data: request.all() })
    const event = await Event.query().where('id', params.id).where('organizer_id', user.id).firstOrFail()

    if (event.isApproved) {
      return response.badRequest({ message: "Cet evenement est deja valide par l'admin." })
    }
    if (['completed', 'cancelled'].includes(event.status)) {
      return response.badRequest({ message: 'Cet evenement ne peut plus etre modifie.' })
    }

    if (data.event_type) {
      const eventType = await EventType.query()
        .where('slug', data.event_type)
        .where('is_active', true)
        .first()
      if (!eventType) {
        return response.badRequest({ message: "Type d'evenement invalide ou inactif" })
      }
      event.eventType = data.event_type
    }

    if (data.event_date) {
      try {
        event.eventDate = parseEventDateInput(data.event_date)
      } catch {
        return response.badRequest({ message: "Date d'evenement invalide" })
      }
    }

    if (data.title !== undefined) {
      event.title = data.title
      event.shareSlug = await this.uniqueShareSlug(data.title, event.id)
    }
    if (data.description !== undefined) event.description = data.description || null
    if (data.location !== undefined) event.location = data.location || null
    if (data.city !== undefined) event.city = data.city || null
    if (data.image !== undefined) event.image = data.image || null

    const rows = data.ticket_types?.filter((row) => row.label.trim())
    if (rows) {
      await EventTicketType.query().where('event_id', event.id).delete()
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
      const prices = rows.map((row) => row.price).filter((price) => price > 0)
      event.ticketPrice = prices.length > 0 ? Math.min(...prices) : 0
      event.ticketCount = rows.reduce((sum, row) => sum + (row.quantity || 0), 0)
    } else {
      if (data.ticket_price !== undefined) event.ticketPrice = data.ticket_price
      if (data.ticket_count !== undefined) event.ticketCount = data.ticket_count
    }

    event.isApproved = false
    event.status = 'upcoming'
    event.rejectionReason = null
    event.rejectedAt = null
    await event.save()
    await event.load('ticketTypes')

    return response.ok({
      message: "Evenement mis a jour. Il reste en attente de validation administrateur.",
      event,
      ticket_types: event.ticketTypes,
    })
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

    if (event.organizerId) {
      await event.load('organizer')
      if (event.organizer?.email) {
        const frontendUrl = env.get('FRONTEND_URL').replace(/\/$/, '')
        const eventUrl = `${frontendUrl}/evenements/${event.shareSlug || event.id}`
        const organizerName = fullName(event.organizer)

        await MailService.send({
          to: event.organizer.email,
          subject: `Votre evenement ${event.title} est valide et publie`,
          html: `
            <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
              <div style="padding:28px 32px;background:#111827;color:#ffffff;">
                <h1 style="margin:0;font-size:24px;line-height:1.3;">Evenement valide</h1>
                <p style="margin:8px 0 0;font-size:14px;line-height:1.6;color:#d1d5db;">Votre evenement est maintenant publie sur NOLVA.</p>
              </div>
              <div style="padding:32px;">
                <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#1f2937;">Bonjour ${escapeHtml(organizerName)},</p>
                <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#1f2937;">
                  Votre evenement <strong>${escapeHtml(event.title)}</strong> a ete valide par l'administrateur et publie sur la plateforme NOLVA.
                </p>
                <p style="margin:0 0 28px;font-size:16px;line-height:1.7;color:#1f2937;">
                  Vous pouvez maintenant consulter sa page publique.
                </p>
                <table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:0;">
                  <tr>
                    <td style="border-radius:999px;background:#111827;">
                      <a href="${eventUrl}" style="display:inline-block;padding:14px 24px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;">
                        Cliquer pour aller voir
                      </a>
                    </td>
                  </tr>
                </table>
              </div>
            </div>
          `,
          text: `Bonjour ${organizerName},

Votre evenement "${event.title}" a ete valide par l'administrateur et publie sur la plateforme NOLVA.

Cliquer pour aller voir : ${eventUrl}`,
        })
      }
    }

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

  /**
   * Inscription à un événement GRATUIT (sans compte requis)
   * Le visiteur renseigne nom, prénom et numéro de téléphone.
   */
  async registerFree({ auth, params, request, response }: HttpContext) {
    const schema = vine.object({
      first_name: vine.string().trim().minLength(1).maxLength(100),
      last_name: vine.string().trim().minLength(1).maxLength(100),
      phone: vine.string().trim().minLength(6).maxLength(30),
    })
    const data = await vine.validate({ schema, data: request.all() })
    const phone = normalizePhone(data.phone)

    const event = await Event.query()
      .where((q) => q.where('id', params.id).orWhere('share_slug', params.id))
      .where('is_public', true)
      .where('is_approved', true)
      .whereIn('status', ['upcoming', 'ongoing'])
      .preload('ticketTypes', (q) => q.orderBy('sort_order', 'asc'))
      .first()

    if (!event) {
      return response.notFound({ message: 'Événement introuvable ou non publié' })
    }

    const ticketTypes = event.ticketTypes
    const isFree =
      ticketTypes.length > 0
        ? ticketTypes.every((t) => Number(t.price) <= 0)
        : Number(event.ticketPrice) <= 0

    if (!isFree) {
      return response.badRequest({
        message: "Cet événement n'est pas gratuit : utilisez l'achat de billets.",
      })
    }

    const existing = await EventRegistration.query()
      .where('event_id', event.id)
      .where('phone', phone)
      .first()
    if (existing) {
      return response.badRequest({
        message: 'Ce numéro est déjà inscrit à cet événement.',
      })
    }

    let userId: number | null = null
    try {
      userId = auth.user ? auth.user.id : null
    } catch {
      userId = null
    }

    const registration = await EventRegistration.create({
      eventId: event.id,
      userId,
      firstName: data.first_name,
      lastName: data.last_name,
      phone,
    })

    return response.created({
      message: `Inscription confirmée ! ${data.first_name}, vous êtes inscrit(e) à « ${event.title} ».`,
      registration: registration.serialize(),
    })
  }

  /**
   * Organisateur : liste des personnes inscrites à un événement gratuit
   */
  async organizerEventRegistrations({ auth, params, response }: HttpContext) {
    const user = auth.user!
    const event = await Event.query()
      .where('id', params.id)
      .where('organizer_id', user.id)
      .first()

    if (!event) {
      return response.notFound({ message: 'Événement introuvable pour cet organisateur' })
    }

    const registrations = await EventRegistration.query()
      .where('event_id', event.id)
      .orderBy('created_at', 'desc')

    return response.ok({
      event: { id: event.id, title: event.title },
      count: registrations.length,
      registrations: registrations.map((r) => r.serialize()),
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

    const rows = tickets.all()
    const fedapayIds = rows
      .map((ticket) => ticket.fedapayTransactionId)
      .filter((id): id is string => Boolean(id))

    const transactions =
      fedapayIds.length > 0
        ? await Transaction.query().whereIn('fedapay_transaction_id', fedapayIds)
        : []
    const transactionsByFedaId = new Map(
      transactions
        .filter((transaction) => transaction.fedapayTransactionId)
        .map((transaction) => [transaction.fedapayTransactionId, transaction])
    )

    return response.ok({
      ...tickets.serialize(),
      data: rows.map((ticket) => {
        const transaction = ticket.fedapayTransactionId
          ? transactionsByFedaId.get(ticket.fedapayTransactionId)
          : null

        return {
          ...ticket.serialize(),
          ticketCode: `NOLVA-TICKET-${String(ticket.id).padStart(6, '0')}`,
          transactionReference: transaction?.reference || null,
          paidAt: transaction?.paidAt || null,
        }
      }),
    })
  }

  async organizerTicketSales({ auth, params, response }: HttpContext) {
    const user = auth.user!
    const event = await Event.query()
      .where('id', params.id)
      .where('organizer_id', user.id)
      .firstOrFail()

    const tickets = await Ticket.query()
      .where('event_id', event.id)
      .preload('user', (q) => q.select(['id', 'first_name', 'last_name', 'email', 'phone']))
      .orderBy('created_at', 'desc')

    const fedapayIds = tickets
      .map((ticket) => ticket.fedapayTransactionId)
      .filter((id): id is string => Boolean(id))

    const transactions =
      fedapayIds.length > 0
        ? await Transaction.query()
            .where('event_id', event.id)
            .whereIn('fedapay_transaction_id', fedapayIds)
            .whereIn('status', ['paid', 'released'])
        : []

    const transactionsByFedaId = new Map(
      transactions
        .filter((transaction) => transaction.fedapayTransactionId)
        .map((transaction) => [transaction.fedapayTransactionId, transaction])
    )

    return response.ok({
      event: {
        id: event.id,
        title: event.title,
        ticketsSold: event.ticketsSold,
      },
      sales: tickets.map((ticket) => {
        const transaction = ticket.fedapayTransactionId
          ? transactionsByFedaId.get(ticket.fedapayTransactionId)
          : null

        return {
          ticketId: ticket.id,
          ticketCode: `NOLVA-TICKET-${String(ticket.id).padStart(6, '0')}`,
          qrCode: ticket.qrCode,
          type: ticket.type,
          amount: ticket.amount,
          status: ticket.status,
          scannedAt: ticket.scannedAt,
          transactionReference: transaction?.reference || null,
          paidAt: transaction?.paidAt || null,
          client: ticket.user
            ? {
                id: ticket.user.id,
                firstName: ticket.user.firstName,
                lastName: ticket.user.lastName,
                email: ticket.user.email,
                phone: ticket.user.phone,
              }
            : null,
        }
      }),
    })
  }

  async organizerScanTicket({ auth, params, request, response }: HttpContext) {
    const user = auth.user!
    const schema = vine.object({
      qr_code: vine.string().trim().minLength(1),
    })
    const data = await vine.validate({ schema, data: request.all() })

    const event = await Event.query()
      .where('id', params.id)
      .where('organizer_id', user.id)
      .firstOrFail()

    const ticket = await Ticket.query()
      .where('event_id', event.id)
      .where('qr_code', data.qr_code)
      .preload('user', (q) => q.select(['id', 'first_name', 'last_name', 'email', 'phone']))
      .first()

    if (!ticket) {
      return response.notFound({
        message: "Ticket introuvable pour cet evenement ou non vendu par cet organisateur.",
      })
    }

    if (ticket.status === 'cancelled' || ticket.status === 'expired') {
      return response.badRequest({ message: `Ticket non valide (${ticket.status}).` })
    }

    if (ticket.scannedAt) {
      return response.badRequest({
        message: 'Ce ticket a deja ete valide.',
        ticket: {
          id: ticket.id,
          ticketCode: `NOLVA-TICKET-${String(ticket.id).padStart(6, '0')}`,
          scannedAt: ticket.scannedAt,
        },
      })
    }

    ticket.scannedAt = DateTime.now()
    await ticket.save()

    return response.ok({
      message: 'Ticket valide avec succes.',
      event: {
        id: event.id,
        title: event.title,
      },
      ticket: {
        id: ticket.id,
        ticketCode: `NOLVA-TICKET-${String(ticket.id).padStart(6, '0')}`,
        qrCode: ticket.qrCode,
        type: ticket.type,
        amount: ticket.amount,
        status: ticket.status,
        scannedAt: ticket.scannedAt,
        client: ticket.user
          ? {
              id: ticket.user.id,
              firstName: ticket.user.firstName,
              lastName: ticket.user.lastName,
              email: ticket.user.email,
              phone: ticket.user.phone,
            }
          : null,
      },
    })
  }

  private slugify(value: string) {
    return (
      value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 120) || 'evenement'
    )
  }

  private async uniqueShareSlug(title: string, ignoreId?: number) {
    const base = this.slugify(title)
    let slug = base
    let index = 2
    while (true) {
      const query = Event.query().where('share_slug', slug)
      if (ignoreId) query.whereNot('id', ignoreId)
      const exists = await query.first()
      if (!exists) return slug
      slug = `${base}-${index}`
      index += 1
    }
  }
}
