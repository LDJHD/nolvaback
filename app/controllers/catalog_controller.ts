import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import EventType from '#models/event_type'
import ProviderType from '#models/provider_type'

function slugify(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

export default class CatalogController {
  // ─── Public ───────────────────────────────────────────────

  async eventTypes({ response }: HttpContext) {
    const types = await EventType.query()
      .where('is_active', true)
      .orderBy('sort_order', 'asc')
      .orderBy('label', 'asc')
    return response.ok(types)
  }

  async providerTypes({ response }: HttpContext) {
    const types = await ProviderType.query()
      .where('is_active', true)
      .orderBy('sort_order', 'asc')
      .orderBy('label', 'asc')
    return response.ok(types)
  }

  // ─── Admin — types d'événements ─────────────────────────

  async adminListEventTypes({ response }: HttpContext) {
    const types = await EventType.query().orderBy('sort_order', 'asc').orderBy('label', 'asc')
    return response.ok(types)
  }

  async adminCreateEventType({ request, response }: HttpContext) {
    const schema = vine.object({
      label: vine.string().trim().minLength(2),
      slug: vine.string().trim().optional(),
      sort_order: vine.number().optional(),
    })
    const data = await vine.validate({ schema, data: request.all() })
    const slug = data.slug?.trim() || slugify(data.label)

    const exists = await EventType.query().where('slug', slug).first()
    if (exists) {
      return response.conflict({ message: 'Ce slug existe déjà' })
    }

    const type = await EventType.create({
      slug,
      label: data.label,
      isActive: true,
      sortOrder: data.sort_order ?? 0,
    })

    return response.created({ message: 'Type d\'événement créé', type })
  }

  async adminUpdateEventType({ params, request, response }: HttpContext) {
    const type = await EventType.findOrFail(params.id)
    const schema = vine.object({
      label: vine.string().trim().minLength(2).optional(),
      slug: vine.string().trim().optional(),
      is_active: vine.boolean().optional(),
      sort_order: vine.number().optional(),
    })
    const data = await vine.validate({ schema, data: request.all() })

    if (data.slug && data.slug !== type.slug) {
      const exists = await EventType.query().where('slug', data.slug).whereNot('id', type.id).first()
      if (exists) return response.conflict({ message: 'Ce slug existe déjà' })
      type.slug = data.slug
    }
    if (data.label !== undefined) type.label = data.label
    if (data.is_active !== undefined) type.isActive = data.is_active
    if (data.sort_order !== undefined) type.sortOrder = data.sort_order
    await type.save()

    return response.ok({ message: 'Type mis à jour', type })
  }

  async adminDeleteEventType({ params, response }: HttpContext) {
    const type = await EventType.findOrFail(params.id)
    type.isActive = false
    await type.save()
    return response.ok({ message: 'Type désactivé' })
  }

  // ─── Admin — types de prestataires ──────────────────────

  async adminListProviderTypes({ response }: HttpContext) {
    const types = await ProviderType.query().orderBy('sort_order', 'asc').orderBy('label', 'asc')
    return response.ok(types)
  }

  async adminCreateProviderType({ request, response }: HttpContext) {
    const schema = vine.object({
      label: vine.string().trim().minLength(2),
      slug: vine.string().trim().optional(),
      sort_order: vine.number().optional(),
    })
    const data = await vine.validate({ schema, data: request.all() })
    const slug = data.slug?.trim() || slugify(data.label)

    const exists = await ProviderType.query().where('slug', slug).first()
    if (exists) {
      return response.conflict({ message: 'Ce slug existe déjà' })
    }

    const type = await ProviderType.create({
      slug,
      label: data.label,
      isActive: true,
      sortOrder: data.sort_order ?? 0,
    })

    return response.created({ message: 'Type de prestataire créé', type })
  }

  async adminUpdateProviderType({ params, request, response }: HttpContext) {
    const type = await ProviderType.findOrFail(params.id)
    const schema = vine.object({
      label: vine.string().trim().minLength(2).optional(),
      slug: vine.string().trim().optional(),
      is_active: vine.boolean().optional(),
      sort_order: vine.number().optional(),
    })
    const data = await vine.validate({ schema, data: request.all() })

    if (data.slug && data.slug !== type.slug) {
      const exists = await ProviderType.query()
        .where('slug', data.slug)
        .whereNot('id', type.id)
        .first()
      if (exists) return response.conflict({ message: 'Ce slug existe déjà' })
      type.slug = data.slug
    }
    if (data.label !== undefined) type.label = data.label
    if (data.is_active !== undefined) type.isActive = data.is_active
    if (data.sort_order !== undefined) type.sortOrder = data.sort_order
    await type.save()

    return response.ok({ message: 'Type mis à jour', type })
  }

  async adminDeleteProviderType({ params, response }: HttpContext) {
    const type = await ProviderType.findOrFail(params.id)
    type.isActive = false
    await type.save()
    return response.ok({ message: 'Type désactivé' })
  }
}
