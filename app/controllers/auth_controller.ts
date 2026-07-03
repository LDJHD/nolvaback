import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import User from '#models/user'
import ServiceProvider from '#models/service_provider'
import ProviderType from '#models/provider_type'
import PasswordResetService from '#services/password_reset_service'
import MailService from '#services/mail_service'
import { duplicateFieldMessage } from '#utils/db_errors'
import env from '#start/env'

const FORGOT_PASSWORD_MESSAGE =
  'Si un compte existe avec cet email, vous recevrez un lien de réinitialisation sous peu.'

function escapeHtml(value: string | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

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
      company_position: vine.string().trim().optional(),
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
        companyPosition: data.company_position ?? null,
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
    if (user.email) {
      const firstName = escapeHtml(user.firstName)
      const frontendUrl = env.get('FRONTEND_URL').replace(/\/$/, '')
      const exploreUrl = `${frontendUrl}/home`

      await MailService.send({
        to: user.email,
        subject: 'Bienvenue sur NOLVA',
        html: `
          <div style="margin:0;padding:0;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#f6f7fb;padding:32px 0;">
              <tr>
                <td align="center" style="padding:0 16px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;max-width:640px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e5e7eb;">
                    <tr>
                      <td style="background:#111827;padding:28px 32px;color:#ffffff;">
                        <div style="font-size:24px;font-weight:800;letter-spacing:0.5px;">NOLVA</div>
                        <div style="margin-top:8px;font-size:14px;color:#d1d5db;">Votre plateforme evenementielle au Benin</div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:32px;">
                        <h1 style="margin:0 0 18px;font-size:24px;line-height:1.3;color:#111827;">Bonjour ${firstName}</h1>
                        <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">
                          Bienvenue sur NOLVA, votre nouvelle plateforme dediee a l'univers de l'evenementiel au Benin.
                        </p>
                        <p style="margin:0 0 22px;font-size:16px;line-height:1.7;">
                          Que vous prepariez un mariage, un anniversaire, une conference, un concert ou un simple moment special,
                          NOLVA vous aide a trouver les bons prestataires, decouvrir des evenements et organiser vos projets plus
                          facilement grace a une assistance intelligente.
                        </p>

                        <div style="margin:24px 0;padding:22px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:14px;">
                          <p style="margin:0 0 14px;font-size:16px;line-height:1.6;font-weight:700;color:#111827;">Sur NOLVA, vous pouvez :</p>
                          <ul style="margin:0;padding-left:20px;font-size:15px;line-height:1.8;color:#374151;">
                            <li>Trouver des prestataires verifies</li>
                            <li>Explorer des evenements a venir</li>
                            <li>Organiser votre evenement etape par etape</li>
                            <li>Recevoir des suggestions intelligentes adaptees a vos besoins</li>
                            <li>Gagner du temps et eviter les erreurs de debutant</li>
                          </ul>
                        </div>

                        <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">
                          Chaque grand evenement commence par une idee. Et nous sommes heureux de vous accompagner dans cette aventure.
                        </p>
                        <p style="margin:0 0 28px;font-size:16px;line-height:1.7;">
                          Explorez des maintenant l'univers NOLVA et decouvrez tout ce que la plateforme peut vous offrir.
                        </p>

                        <table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:0 0 28px;">
                          <tr>
                            <td style="border-radius:999px;background:#111827;">
                              <a href="${exploreUrl}" style="display:inline-block;padding:14px 24px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;">
                                Explorer NOLVA
                              </a>
                            </td>
                          </tr>
                        </table>

                        <p style="margin:0;font-size:15px;line-height:1.7;color:#4b5563;">A tres bientot sur NOLVA,</p>
                        <p style="margin:4px 0 0;font-size:15px;line-height:1.7;color:#111827;font-weight:700;">L'equipe NOLVA</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </div>
        `,
        text: `Bonjour ${user.firstName}

Bienvenue sur NOLVA, votre nouvelle plateforme dediee a l'univers de l'evenementiel au Benin.

Que vous prepariez un mariage, un anniversaire, une conference, un concert ou un simple moment special, NOLVA vous aide a trouver les bons prestataires, decouvrir des evenements et organiser vos projets plus facilement grace a une assistance intelligente.

Sur NOLVA, vous pouvez :
- Trouver des prestataires verifies
- Explorer des evenements a venir
- Organiser votre evenement etape par etape
- Recevoir des suggestions intelligentes adaptees a vos besoins
- Gagner du temps et eviter les erreurs de debutant

Chaque grand evenement commence par une idee. Et nous sommes heureux de vous accompagner dans cette aventure.

Explorez des maintenant l'univers NOLVA : ${exploreUrl}

A tres bientot sur NOLVA,
L'equipe NOLVA`,
      })
    }

    return response.created({
      message: 'Compte créé avec succès. Un email de bienvenue vous a été envoyé.',
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
    let isValid = false

    try {
      isValid = await hash.verify(user.password, password)
    } catch {
      isValid = false
    }

    if (!isValid && user.password === password) {
      isValid = true
      user.password = password
      await user.save()
    }

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
