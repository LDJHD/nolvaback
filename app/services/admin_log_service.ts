import AdminActionLog from '#models/admin_action_log'

export default class AdminLogService {
  static async log(
    adminId: number,
    actionType: string,
    entityType: string,
    entityId: number | null,
    options?: {
      transactionId?: number | null
      note?: string | null
      metadata?: Record<string, unknown> | null
    }
  ) {
    return AdminActionLog.create({
      adminId,
      actionType,
      entityType,
      entityId,
      transactionId: options?.transactionId ?? null,
      note: options?.note ?? null,
      metadata: options?.metadata ?? null,
    })
  }
}
