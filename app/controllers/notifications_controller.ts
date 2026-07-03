import type { HttpContext } from '@adonisjs/core/http'
import PlatformNotification from '#models/platform_notification'
import { DateTime } from 'luxon'

export default class NotificationsController {
  async index({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const limit = Number(request.input('limit', 12))

    const notifications = await PlatformNotification.query()
      .where('user_id', user.id)
      .orderBy('created_at', 'desc')
      .limit(Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 30) : 12)

    const unread = await PlatformNotification.query()
      .where('user_id', user.id)
      .whereNull('read_at')
      .count('* as total')

    return response.ok({
      data: notifications,
      unread: Number(unread[0].$extras.total || 0),
    })
  }

  async markRead({ auth, params, response }: HttpContext) {
    const user = auth.user!
    const notification = await PlatformNotification.query()
      .where('id', params.id)
      .where('user_id', user.id)
      .firstOrFail()

    notification.readAt = DateTime.now()
    await notification.save()

    return response.ok({ message: 'Notification lue' })
  }

  async markAllRead({ auth, response }: HttpContext) {
    const user = auth.user!
    await PlatformNotification.query()
      .where('user_id', user.id)
      .whereNull('read_at')
      .update({ read_at: DateTime.now().toSQL() })

    return response.ok({ message: 'Notifications lues' })
  }
}
