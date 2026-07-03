import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import ServiceProvider from '#models/service_provider'
import ProviderType from '#models/provider_type'
import { PAYOUT_METHODS } from '#utils/payout_methods'

export default class ProvidersController {
  async index({ request, response }: HttpContext) {
    const page = request.input('page', 1)
    const limit = request.input('limit', 12)
    const type = request.input('type')
    const city = request.input('city')
    const priceMin = request.input('price_min')
    const priceMax = request.input('price_max')
    const available = request.input('available')
    const search = request.input('search', '').trim()

    const query = ServiceProvider.query()
      .where('status', 'active')
      .preload('user', (q) => q.select(['id', 'first_name', 'last_name', 'avatar']))
      .preload('offers', (q) => q.where('is_active', true))
      .preload('photos', (q) => q.orderBy('order', 'asc').limit(1))

    if (type) query.where('type', type)
    if (city) query.where('city', city)
    if (available === 'true') query.where('is_available', true)
    if (search) {
      const term = `%${search}%`
      query.where((q) => {
        q.whereILike('business_name', term)
          .orWhereILike('specialty', term)
          .orWhereILike('description', term)
          .orWhereILike('city', term)
          .orWhereILike('type', term)
      })
    }

    if (priceMin || priceMax) {
      query.whereHas('offers', (q) => {
        if (priceMin) q.where('price_min', '>=', priceMin)
        if (priceMax) q.where('price_max', '<=', priceMax)
      })
    }

    const providers = await query.paginate(page, limit)

    return response.ok(providers)
  }

  async show({ params, response }: HttpContext) {
    const provider = await ServiceProvider.query()
      .where('id', params.id)
      .where('status', 'active')
      .preload('user', (q) => q.select(['id', 'first_name', 'last_name', 'avatar']))
      .preload('offers', (q) => q.where('is_active', true))
      .preload('photos', (q) => q.where('type', 'photo').orderBy('order', 'asc').orderBy('id', 'asc'))
      .preload('availabilities')
      .firstOrFail()

    return response.ok(provider)
  }

  async popular({ response }: HttpContext) {
    const providers = await ServiceProvider.query()
      .where('status', 'active')
      .where('is_available', true)
      .preload('user', (q) => q.select(['id', 'first_name', 'last_name', 'avatar']))
      .preload('offers', (q) => q.where('is_active', true).limit(1))
      .preload('photos', (q) => q.orderBy('order', 'asc').limit(1))
      .limit(6)
      .orderBy('rating_points', 'desc')
      .orderBy('rating_avg', 'desc')
      .orderBy('created_at', 'desc')

    return response.ok(providers)
  }

  // Espace prestataire - voir son propre profil
  async myProfile({ auth, response }: HttpContext) {
    const user = auth.user!

    let provider = await ServiceProvider.query()
      .where('user_id', user.id)
      .preload('offers')
      .preload('photos', (q) => q.orderBy('order', 'asc').orderBy('id', 'asc'))
      .preload('availabilities')
      .first()

    if (!provider) {
      provider = await ServiceProvider.create({
        userId: user.id,
        businessName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Prestataire NOLVA',
        type: 'autre',
        statusCompte: 'individuel',
        city: user.city || null,
        status: 'pending',
        isAvailable: true,
      })
      await provider.load('offers')
      await provider.load('photos', (q) => q.orderBy('order', 'asc').orderBy('id', 'asc'))
      await provider.load('availabilities')
    }

    return response.ok(provider)
  }

  // Espace prestataire - mettre à jour son profil
  async updateMyProfile({ auth, request, response }: HttpContext) {
    const user = auth.user!

    const provider = await ServiceProvider.query()
      .where('user_id', user.id)
      .firstOrFail()

    const schema = vine.object({
      business_name: vine.string().optional(),
      company_position: vine.string().trim().optional(),
      type: vine.string().optional(),
      status_compte: vine.enum(['individuel', 'entreprise']).optional(),
      description: vine.string().optional(),
      specialty: vine.string().optional(),
      experience_years: vine.string().optional(),
      event_types: vine.array(vine.string()).optional(),
      added_value: vine.array(vine.string()).optional(),
      city: vine.string().optional(),
      zones: vine.array(vine.string()).optional(),
      travel_possible: vine.boolean().optional(),
      travel_fees: vine.boolean().optional(),
      instagram: vine.string().optional(),
      facebook: vine.string().optional(),
      tiktok: vine.string().optional(),
      is_available: vine.boolean().optional(),
      profile_photo: vine.string().trim().minLength(50).optional(),
      momo_network: vine.enum(PAYOUT_METHODS).optional(),
      momo_phone: vine.string().trim().maxLength(200).optional(),
    })

    const data = await vine.validate({ schema, data: request.all() })

    if (data.type) {
      const pt = await ProviderType.query().where('slug', data.type).where('is_active', true).first()
      if (!pt) {
        return response.badRequest({ message: 'Type de prestataire invalide ou inactif' })
      }
    }

    provider.merge({
      businessName: data.business_name ?? provider.businessName,
      companyPosition: data.company_position ?? provider.companyPosition,
      type: data.type ?? provider.type,
      statusCompte: data.status_compte ?? provider.statusCompte,
      description: data.description ?? provider.description,
      specialty: data.specialty ?? provider.specialty,
      experienceYears: data.experience_years ?? provider.experienceYears,
      eventTypes: data.event_types ?? provider.eventTypes,
      addedValue: data.added_value ?? provider.addedValue,
      city: data.city ?? provider.city,
      zones: data.zones ?? provider.zones,
      travelPossible: data.travel_possible ?? provider.travelPossible,
      travelFees: data.travel_fees ?? provider.travelFees,
      instagram: data.instagram ?? provider.instagram,
      facebook: data.facebook ?? provider.facebook,
      tiktok: data.tiktok ?? provider.tiktok,
      isAvailable: data.is_available ?? provider.isAvailable,
      profilePhoto: data.profile_photo ?? provider.profilePhoto,
      momoNetwork: data.momo_network ?? provider.momoNetwork,
      momoPhone: data.momo_phone ?? provider.momoPhone,
    })

    // Activer le profil dès que nom commercial + type sont renseignés
    if (provider.businessName && provider.type) {
      provider.status = 'active'
      if (data.is_available === undefined && !provider.isAvailable) {
        provider.isAvailable = true
      }
    }

    await provider.save()

    return response.ok({ message: 'Profil mis à jour', provider })
  }
}
