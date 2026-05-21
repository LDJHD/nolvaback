import crypto from 'node:crypto'
import { DateTime } from 'luxon'
import env from '#start/env'
import logger from '@adonisjs/core/services/logger'
import User from '#models/user'
import PasswordResetToken from '#models/password_reset_token'
import MailService from '#services/mail_service'

const TOKEN_TTL_MINUTES = 60

export default class PasswordResetService {
  static async requestReset(uid: string): Promise<{ sent: boolean; resetUrl?: string }> {
    const user = await User.query()
      .where((q) => {
        q.where('email', uid).orWhere('phone', uid)
      })
      .where('is_active', true)
      .first()

    if (!user || !user.email) {
      return { sent: false }
    }

    await PasswordResetToken.query()
      .where('user_id', user.id)
      .whereNull('used_at')
      .delete()

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = DateTime.now().plus({ minutes: TOKEN_TTL_MINUTES })

    await PasswordResetToken.create({
      userId: user.id,
      token,
      expiresAt,
    })

    const resetUrl = `${env.get('FRONTEND_URL')}/mot-de-passe/reinitialiser?token=${token}`

    const emailed = await this.sendResetEmail(user.email, user.firstName, resetUrl)
    if (!emailed) {
      logger.info(`[NOLVA] Lien réinitialisation mot de passe pour ${user.email}: ${resetUrl}`)
    }

    const exposeInDev = env.get('NODE_ENV') === 'development'
    return { sent: true, resetUrl: exposeInDev ? resetUrl : undefined }
  }

  static async resetPassword(token: string, newPassword: string): Promise<User> {
    const record = await PasswordResetToken.query()
      .where('token', token)
      .whereNull('used_at')
      .where('expires_at', '>', DateTime.now().toSQL())
      .preload('user')
      .first()

    if (!record) {
      throw new Error('INVALID_OR_EXPIRED_TOKEN')
    }

    const user = record.user
    user.password = newPassword
    await user.save()

    record.usedAt = DateTime.now()
    await record.save()

    await PasswordResetToken.query().where('user_id', user.id).whereNull('used_at').delete()

    return user
  }

  static async verifyToken(token: string): Promise<boolean> {
    const record = await PasswordResetToken.query()
      .where('token', token)
      .whereNull('used_at')
      .where('expires_at', '>', DateTime.now().toSQL())
      .first()
    return Boolean(record)
  }

  private static async sendResetEmail(
    to: string,
    firstName: string,
    resetUrl: string
  ): Promise<boolean> {
    return MailService.send({
      to,
      subject: 'Réinitialisation de votre mot de passe NOLVA',
      html: `
        <p>Bonjour ${firstName},</p>
        <p>Vous avez demandé à réinitialiser votre mot de passe NOLVA.</p>
        <p><a href="${resetUrl}">Cliquez ici pour choisir un nouveau mot de passe</a></p>
        <p>Ce lien expire dans ${TOKEN_TTL_MINUTES} minutes.</p>
        <p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
      `,
      text: `Bonjour ${firstName},\n\nRéinitialisez votre mot de passe : ${resetUrl}\n\nLien valide ${TOKEN_TTL_MINUTES} minutes.`,
    })
  }
}
