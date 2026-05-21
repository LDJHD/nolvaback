import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import Offer from '#models/offer'
import ServiceProvider from '#models/service_provider'

export default class OffersController {
  async store({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const provider = await ServiceProvider.query().where('user_id', user.id).firstOrFail()

    const existingOffers = await Offer.query().where('provider_id', provider.id).count('* as total')
    if (Number(existingOffers[0].$extras.total) >= 3) {
      return response.badRequest({ message: 'Maximum 3 offres par prestataire' })
    }

    const schema = vine.object({
      name: vine.string().trim(),
      included: vine.array(vine.string()).optional(),
      duration: vine.string().optional(),
      price_min: vine.number().optional(),
      price_max: vine.number().optional(),
    })

    const data = await vine.validate({ schema, data: request.all() })

    const offer = await Offer.create({
      providerId: provider.id,
      name: data.name,
      included: data.included ?? null,
      duration: data.duration ?? null,
      priceMin: data.price_min ?? null,
      priceMax: data.price_max ?? null,
      currency: 'FCFA',
      isActive: true,
    })

    return response.created({ message: 'Offre créée', offer })
  }

  async update({ auth, params, request, response }: HttpContext) {
    const user = auth.user!
    const provider = await ServiceProvider.query().where('user_id', user.id).firstOrFail()
    const offer = await Offer.query()
      .where('id', params.id)
      .where('provider_id', provider.id)
      .firstOrFail()

    const schema = vine.object({
      name: vine.string().trim().optional(),
      included: vine.array(vine.string()).optional(),
      duration: vine.string().optional(),
      price_min: vine.number().optional(),
      price_max: vine.number().optional(),
      is_active: vine.boolean().optional(),
    })

    const data = await vine.validate({ schema, data: request.all() })

    offer.merge({
      name: data.name ?? offer.name,
      included: data.included ?? offer.included,
      duration: data.duration ?? offer.duration,
      priceMin: data.price_min ?? offer.priceMin,
      priceMax: data.price_max ?? offer.priceMax,
      isActive: data.is_active ?? offer.isActive,
    })

    await offer.save()

    return response.ok({ message: 'Offre mise à jour', offer })
  }

  async destroy({ auth, params, response }: HttpContext) {
    const user = auth.user!
    const provider = await ServiceProvider.query().where('user_id', user.id).firstOrFail()
    const offer = await Offer.query()
      .where('id', params.id)
      .where('provider_id', provider.id)
      .firstOrFail()

    await offer.delete()

    return response.ok({ message: 'Offre supprimée' })
  }
}
