import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import User from '#models/user'
import ServiceProvider from '#models/service_provider'
import ProviderType from '#models/provider_type'
import PasswordResetService from '#services/password_reset_service'
import { duplicateFieldMessage } from '#utils/db_errors'

const FORGOT_PASSWORD_MESSAGE =
  'Si un compte existe avec cet email, vous recevrez un lien de réinitialisation sous peu.'

export default class AuthController {
  async register({ request, response }: HttpContext) {
    const schema = vine.object({
      first_name: vine.string().trim().minLength(2),
      last_name: vine.string().trim().minLength(2),
      email: vine.string().trim().email(),
      phone: vine.string().trim().optional(),
      password: vine.string().minLength(8),
      role: vine.enum(['user', 'provider']).optional(),
      city: vine.string().optional(),
      business_name: vine.string().trim().optional(),
      type: vine.string().trim().optional(),
      description: vine.string().optional(),
    })

    let data: Awaited<ReturnType<typeof vine.validate>>
    try {
      data = await vine.validate({ schema, data: request.all() })
    } catch (err: any) {
      if (err.messages) {
        const first = err.messages[0]
        return response.unprocessableEntity({
          message: first?.message || 'Données invalides',
          errors: err.messages,
        })
      }
      throw err
    }

    const emailTaken = await User.query().where('email', data.email).first()
    if (emailTaken) {
      return response.conflict({
        message: 'Cette adresse email est déjà utilisée. Connectez-vous ou utilisez une autre adresse.',
        field: 'email',
      })
    }

    let user: User
    try {
      user = await User.create({
        firstName: data.first_name,
        lastName: data.last_name,
        email: data.email,
        phone: data.phone || null,
        password: data.password,
        role: data.role ?? 'user',
        city: data.city ?? null,
      })
    } catch (err) {
      const dupMsg = duplicateFieldMessage(err)
      if (dupMsg) {
        return response.conflict({
          message: dupMsg,
          field: dupMsg.includes('email') ? 'email' : undefined,
        })
      }
      throw err
    }

    let serviceProvider = null
    if (user.role === 'provider') {
      const typeSlug = data.type ?? 'autre'
      const providerType = await ProviderType.query()
        .where('slug', typeSlug)
        .where('is_active', true)
        .first()
      if (!providerType) {
        return response.badRequest({ message: 'Type de prestataire invalide' })
      }

      const hasProfile = Boolean(data.business_name && data.type)
      serviceProvider = await ServiceProvider.create({
        userId: user.id,
        businessName: data.business_name ?? null,
        type: typeSlug,
        description: data.description ?? null,
        city: data.city ?? user.city ?? null,
        statusCompte: 'individuel',
        status: hasProfile ? 'active' : 'pending',
        isVerified: false,
        isAvailable: hasProfile,
        travelPossible: false,
        travelFees: false,
      })
    }

    const token = await User.accessTokens.create(user)

    return response.created({
      message: 'Compte créé avec succès',
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        city: user.city,
        serviceProvider,
      },
      token: token.value!.release(),
    })
  }

  async login({ request, response }: HttpContext) {
    const schema = vine.object({
      uid: vine.string().trim(),
      password: vine.string(),
    })

    const { uid, password } = await vine.validate({ schema, data: request.all() })

    const user = await User.query()
      .where((q) => {
        q.where('email', uid).orWhere('phone', uid)
      })
      .where('is_active', true)
      .first()

    if (!user) {
      return response.unauthorized({ message: 'Identifiants incorrects' })
    }

    const { default: hash } = await import('@adonisjs/core/services/hash')
    const isValid = await hash.verify(user.password, password)

    if (!isValid) {
      return response.unauthorized({ message: 'Identifiants incorrects' })
    }

    await user.load('serviceProvider')
    const token = await User.accessTokens.create(user)

    return response.ok({
      message: 'Connexion réussie',
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        city: user.city,
        avatar: user.avatar,
        serviceProvider: user.serviceProvider ?? null,
      },
      token: token.value!.release(),
    })
  }

  async logout({ auth, response }: HttpContext) {
    const user = auth.user!
    await User.accessTokens.delete(user, user.currentAccessToken.identifier)
    return response.ok({ message: 'Déconnexion réussie' })
  }

  async me({ auth, response }: HttpContext) {
    const user = auth.user!
    await user.load('serviceProvider')

    return response.ok({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      city: user.city,
      avatar: user.avatar,
      interests: user.interests,
      serviceProvider: user.serviceProvider ?? null,
    })
  }

  async forgotPassword({ request, response }: HttpContext) {
    const schema = vine.object({
      uid: vine.string().trim(),
    })
    const { uid } = await vine.validate({ schema, data: request.all() })

    const result = await PasswordResetService.requestReset(uid)

    const body: Record<string, string> = {
      message: FORGOT_PASSWORD_MESSAGE,
    }
    if (result.resetUrl) {
      body.reset_url = result.resetUrl
    }

    return response.ok(body)
  }

  async verifyResetToken({ request, response }: HttpContext) {
    const token = String(request.input('token', '')).trim()
    if (!token) {
      return response.badRequest({ message: 'Token manquant' })
    }
    const valid = await PasswordResetService.verifyToken(token)
    return response.ok({ valid })
  }

  async resetPassword({ request, response }: HttpContext) {
    const schema = vine.object({
      token: vine.string().trim(),
      password: vine.string().minLength(8),
      password_confirmation: vine.string(),
    })
    const data = await vine.validate({ schema, data: request.all() })

    if (data.password !== data.password_confirmation) {
      return response.badRequest({ message: 'Les mots de passe ne correspondent pas' })
    }

    try {
      await PasswordResetService.resetPassword(data.token, data.password)
      return response.ok({
        message: 'Mot de passe mis à jour. Vous pouvez vous connecter.',
      })
    } catch (e: any) {
      if (e.message === 'INVALID_OR_EXPIRED_TOKEN') {
        return response.badRequest({
          message: 'Lien invalide ou expiré. Demandez un nouveau lien.',
        })
      }
      throw e
    }
  }

  async updateProfile({ auth, request, response }: HttpContext) {
    const user = auth.user!

    const schema = vine.object({
      first_name: vine.string().trim().optional(),
      last_name: vine.string().trim().optional(),
      email: vine.string().email().optional(),
      phone: vine.string().trim().optional(),
      city: vine.string().optional(),
      avatar: vine.string().optional(),
      interests: vine.array(vine.string()).optional(),
    })

    let data: Awaited<ReturnType<typeof vine.validate>>
    try {
      data = await vine.validate({ schema, data: request.all() })
    } catch (err: any) {
      if (err.messages) {
        const first = err.messages[0]
        return response.unprocessableEntity({
          message: first?.message || 'Données invalides',
          errors: err.messages,
        })
      }
      throw err
    }

    if (data.email && data.email !== user.email) {
      const emailTaken = await User.query().where('email', data.email).whereNot('id', user.id).first()
      if (emailTaken) {
        return response.conflict({
          message: 'Cette adresse email est déjà utilisée par un autre compte.',
          field: 'email',
        })
      }
    }

    user.merge({
      firstName: data.first_name ?? user.firstName,
      lastName: data.last_name ?? user.lastName,
      email: data.email ?? user.email,
      phone: data.phone ?? user.phone,
      city: data.city ?? user.city,
      avatar: data.avatar ?? user.avatar,
      interests: data.interests ?? user.interests,
    })

    try {
      await user.save()
    } catch (err) {
      const dupMsg = duplicateFieldMessage(err)
      if (dupMsg) {
        return response.conflict({ message: dupMsg, field: 'email' })
      }
      throw err
    }

    return response.ok({
      message: 'Profil mis à jour',
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        city: user.city,
        avatar: user.avatar,
      },
    })
  }
}
