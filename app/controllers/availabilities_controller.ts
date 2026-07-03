import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import Availability from '#models/availability'
import ServiceProvider from '#models/service_provider'

const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

export default class AvailabilitiesController {
  async update({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const provider = await ServiceProvider.query().where('user_id', user.id).firstOrFail()

    const schema = vine.object({
      days: vine.array(vine.string()).optional(),
      slots: vine.array(vine.string()).optional(),
      weekly_schedule: vine
        .array(
          vine.object({
            day: vine.string().trim(),
            is_available: vine.boolean(),
            start_time: vine.string().trim().optional(),
            end_time: vine.string().trim().optional(),
          })
        )
        .optional(),
      urgent_available: vine.boolean().optional(),
    })

    const data = await vine.validate({ schema, data: request.all() })
    const weeklySchedule = data.weekly_schedule
      ?.filter((item) => DAYS.includes(item.day.toLowerCase()))
      .map((item) => ({
        day: item.day.toLowerCase(),
        is_available: item.is_available,
        start_time: item.is_available ? (item.start_time ?? null) : null,
        end_time: item.is_available ? (item.end_time ?? null) : null,
      }))
    const availableDays = weeklySchedule
      ? weeklySchedule.filter((item) => item.is_available).map((item) => item.day)
      : data.days
    const availableSlots = weeklySchedule
      ? weeklySchedule
          .filter((item) => item.is_available && item.start_time && item.end_time)
          .map((item) => `${item.day}: ${item.start_time}-${item.end_time}`)
      : data.slots

    let availability = await Availability.query()
      .where('provider_id', provider.id)
      .first()

    if (!availability) {
      availability = await Availability.create({
        providerId: provider.id,
        days: availableDays ?? [],
        slots: availableSlots ?? [],
        weeklySchedule: weeklySchedule ?? null,
        urgentAvailable: data.urgent_available ?? false,
      })
    } else {
      availability.merge({
        days: availableDays ?? availability.days,
        slots: availableSlots ?? availability.slots,
        weeklySchedule: weeklySchedule ?? availability.weeklySchedule,
        urgentAvailable: data.urgent_available ?? availability.urgentAvailable,
      })
      await availability.save()
    }

    return response.ok({ message: 'Disponibilités mises à jour', availability })
  }
}
