import env from '#start/env'
import logger from '@adonisjs/core/services/logger'
import type { Transporter } from 'nodemailer'

type SendMailOptions = {
  to: string
  subject: string
  html: string
  text?: string
}

let transporter: Transporter | null = null

function getGmailCredentials(): { user: string; pass: string } | null {
  const user = env.get('GMAIL_USER')
  const pass = env.get('GMAIL_APP_PASSWORD')
  if (!user || !pass) return null
  return { user, pass }
}

async function getTransporter(): Promise<Transporter | null> {
  const auth = getGmailCredentials()
  if (!auth) return null

  if (!transporter) {
    const nodemailer = await import('nodemailer')
    transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth,
    })
  }

  return transporter
}

export default class MailService {
  static isConfigured(): boolean {
    return getGmailCredentials() !== null
  }

  static async send(options: SendMailOptions): Promise<boolean> {
    const transport = await getTransporter()
    if (!transport) return false

    const fromUser = env.get('GMAIL_USER')!
    try {
      await transport.sendMail({
        from: `NOLVA <${fromUser}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      })
      return true
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      logger.warn(`[NOLVA] Échec envoi email: ${message}`)
      return false
    }
  }
}
