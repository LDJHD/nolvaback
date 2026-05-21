import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class AuthMiddleware {
  async handle({ auth, response }: HttpContext, next: NextFn) {
    try {
      await auth.authenticate()
      await next()
    } catch {
      return response.unauthorized({ message: 'Authentification requise. Veuillez vous connecter.' })
    }
  }
}
