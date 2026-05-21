import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class AdminMiddleware {
  async handle({ auth, response }: HttpContext, next: NextFn) {
    const user = auth.user!
    if (user.role !== 'admin') {
      return response.forbidden({ message: 'Accès réservé aux administrateurs NOLVA' })
    }
    await next()
  }
}
