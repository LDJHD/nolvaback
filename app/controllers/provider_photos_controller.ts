import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import ProviderPhoto from '#models/provider_photo'
import ServiceProvider from '#models/service_provider'

export const MAX_PORTFOLIO_PHOTOS = 7

export default class ProviderPhotosController {
  private async getProviderForUser(userId: number) {
    return ServiceProvider.query().where('user_id', userId).firstOrFail()
  }

  private async countPhotos(providerId: number) {
    const rows = await ProviderPhoto.query().where('provider_id', providerId).count('* as total')
    return Number(rows[0].$extras.total)
  }

  async store({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const provider = await this.getProviderForUser(user.id)
    const current = await this.countPhotos(provider.id)

    if (current >= MAX_PORTFOLIO_PHOTOS) {
      return response.badRequest({
        message: `Maximum ${MAX_PORTFOLIO_PHOTOS} photos dans le portfolio`,
      })
    }

    const schema = vine.object({
      url: vine.string().trim().minLength(100),
      type: vine.string().optional(),
    })
    const data = await vine.validate({ schema, data: request.all() })

    const photo = await ProviderPhoto.create({
      providerId: provider.id,
      url: data.url,
      type: data.type ?? 'photo',
      order: current,
    })

    return response.created({ message: 'Photo ajoutée', photo })
  }

  async storeBatch({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const provider = await this.getProviderForUser(user.id)
    const current = await this.countPhotos(provider.id)

    const schema = vine.object({
      urls: vine.array(vine.string().trim().minLength(100)).minLength(1).maxLength(MAX_PORTFOLIO_PHOTOS),
    })
    const data = await vine.validate({ schema, data: request.all() })

    const slotsLeft = MAX_PORTFOLIO_PHOTOS - current
    if (slotsLeft <= 0) {
      return response.badRequest({
        message: `Maximum ${MAX_PORTFOLIO_PHOTOS} photos dans le portfolio`,
      })
    }

    const toAdd = data.urls.slice(0, slotsLeft)
    const created: ProviderPhoto[] = []
    let order = current

    for (const url of toAdd) {
      const photo = await ProviderPhoto.create({
        providerId: provider.id,
        url,
        type: 'photo',
        order,
      })
      created.push(photo)
      order += 1
    }

    const skipped = data.urls.length - toAdd.length

    return response.created({
      message:
        skipped > 0
          ? `${created.length} photo(s) ajoutée(s). ${skipped} ignorée(s) (limite ${MAX_PORTFOLIO_PHOTOS}).`
          : `${created.length} photo(s) ajoutée(s) au portfolio`,
      photos: created,
      count: created.length,
    })
  }

  async destroy({ auth, params, response }: HttpContext) {
    const user = auth.user!
    const provider = await this.getProviderForUser(user.id)

    const photo = await ProviderPhoto.query()
      .where('id', params.id)
      .where('provider_id', provider.id)
      .firstOrFail()

    await photo.delete()

    return response.ok({ message: 'Photo supprimée' })
  }
}
