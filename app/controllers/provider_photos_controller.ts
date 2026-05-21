import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import ProviderPhoto from '#models/provider_photo'
import ServiceProvider from '#models/service_provider'

const MAX_PHOTOS = 7

export default class ProviderPhotosController {
  async store({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const provider = await ServiceProvider.query().where('user_id', user.id).firstOrFail()

    const count = await ProviderPhoto.query().where('provider_id', provider.id).count('* as total')
    if (Number(count[0].$extras.total) >= MAX_PHOTOS) {
      return response.badRequest({ message: `Maximum ${MAX_PHOTOS} photos dans le portfolio` })
    }

    const schema = vine.object({
      url: vine.string().trim(),
      type: vine.string().optional(),
    })
    const data = await vine.validate({ schema, data: request.all() })

    const photo = await ProviderPhoto.create({
      providerId: provider.id,
      url: data.url,
      type: data.type ?? 'portfolio',
      order: Number(count[0].$extras.total),
    })

    return response.created({ message: 'Photo ajoutée', photo })
  }

  async destroy({ auth, params, response }: HttpContext) {
    const user = auth.user!
    const provider = await ServiceProvider.query().where('user_id', user.id).firstOrFail()

    const photo = await ProviderPhoto.query()
      .where('id', params.id)
      .where('provider_id', provider.id)
      .firstOrFail()

    await photo.delete()

    return response.ok({ message: 'Photo supprimée' })
  }
}
