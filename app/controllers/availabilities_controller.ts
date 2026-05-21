import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import Availability from '#models/availability'
import ServiceProvider from '#models/service_provider'

export default class AvailabilitiesController {
  async update({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const provider = await ServiceProvider.query().where('user_id', user.id).firstOrFail()

    const schema = vine.object({
      days: vine.array(vine.string()).optional(),
      slots: vine.array(vine.string()).optional(),
      urgent_available: vine.boolean().optional(),
    })

    const data = await vine.validate({ schema, data: request.all() })

    let availability = await Availability.query()
      .where('provider_id', provider.id)
      .first()

    if (!availability) {
      availability = await Availability.create({
        providerId: provider.id,
        days: data.days ?? [],
        slots: data.slots ?? [],
        urgentAvailable: data.urgent_available ?? false,
      })
    } else {
      availability.merge({
        days: data.days ?? availability.days,
        slots: data.slots ?? availability.slots,
        urgentAvailable: data.urgent_available ?? availability.urgentAvailable,
      })
      await availability.save()
    }

    return response.ok({ message: 'Disponibilités mises à jour', availability })
  }
}
