import PlatformNotification from '#models/platform_notification'

export default class NotificationService {
  static async notifyUser(
    userId: number,
    kind: string,
    title: string,
    body: string,
    metadata?: Record<string, unknown>
  ) {
    return PlatformNotification.create({
      userId,
      kind,
      title,
      body,
      metadata: metadata ?? null,
    })
  }

  static async notifyUsers(
    userIds: number[],
    kind: string,
    title: string,
    body: string,
    metadata?: Record<string, unknown>
  ) {
    const unique = [...new Set(userIds.filter((id) => id > 0))]
    for (const userId of unique) {
      await this.notifyUser(userId, kind, title, body, metadata)
    }
  }
}
