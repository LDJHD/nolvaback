import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
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
const LOGO_CID = 'nolva-logo@nolva'
const LOGO_PATH = fileURLToPath(new URL('../../public/nolva-logo.png', import.meta.url))

function getLogoSrc(): string | null {
  if (existsSync(LOGO_PATH)) return `cid:${LOGO_CID}`
  const frontendUrl = env.get('FRONTEND_URL')
  if (!frontendUrl) return null
  return `${frontendUrl.replace(/\/$/, '')}/assets/img/logo/nolva-logo.png`
}

function withNolvaLogo(html: string): string {
  const logoSrc = getLogoSrc()
  if (!logoSrc) return html

  return `
    <div style="margin:0;padding:0;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#f6f7fb;padding:24px 0;">
        <tr>
          <td align="center" style="padding:0 16px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;max-width:680px;">
              <tr>
                <td align="center" style="padding:0 0 16px;">
                  <img src="${logoSrc}" alt="NOLVA" width="132" style="display:block;width:132px;max-width:44%;height:auto;border:0;outline:none;text-decoration:none;" />
                </td>
              </tr>
              <tr>
                <td>
                  ${html}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `
}

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
        html: withNolvaLogo(options.html),
        text: options.text,
        attachments: existsSync(LOGO_PATH)
          ? [
              {
                filename: 'nolva-logo.png',
                path: LOGO_PATH,
                cid: LOGO_CID,
              },
            ]
          : undefined,
      })
      return true
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      logger.warn(`[NOLVA] Échec envoi email: ${message}`)
      return false
    }
  }
}
