import crypto from 'node:crypto'
import Event from '#models/event'
import Reservation from '#models/reservation'
import Ticket from '#models/ticket'
import Transaction from '#models/transaction'
import User from '#models/user'
import MailService from '#services/mail_service'
import NotificationService from '#services/notification_service'

type TicketConfirmationInput = {
  user: User
  event: Event
  transaction: Transaction
  tickets: Ticket[]
}

type ProviderConfirmationInput = {
  user: User
  reservation: Reservation
  transaction: Transaction
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function fullName(user: User): string {
  return [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || 'Client NOLVA'
}

function money(amount: number | string): string {
  return `${Number(amount || 0).toLocaleString('fr-FR')} FCFA`
}

function qrImageUrl(payload: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(payload)}`
}

function ticketCode(ticket: Ticket): string {
  return `NOLVA-TICKET-${String(ticket.id).padStart(6, '0')}`
}

function generateProofCode(): string {
  return `NOLVA-PREST-${Date.now().toString(36).toUpperCase()}-${crypto
    .randomBytes(4)
    .toString('hex')
    .toUpperCase()}`
}

function generateQrPayload(prefix: string, reference: string): string {
  return `${prefix}-${reference}-${crypto.randomBytes(10).toString('hex').toUpperCase()}`
}

async function sendMailIfPossible(to: string | null, subject: string, html: string, text: string) {
  if (!to) return
  await MailService.send({ to, subject, html, text })
}

export default class PaymentConfirmationService {
  static async notifyTicketPayment({ user, event, transaction, tickets }: TicketConfirmationInput) {
    const clientName = fullName(user)
    const ticketLines = tickets.map((ticket) => ({
      code: ticketCode(ticket),
      qrCode: ticket.qrCode || '',
      type: ticket.type,
      amount: Number(ticket.amount || 0),
    }))

    await NotificationService.notifyUser(
      user.id,
      'ticket_payment_confirmed',
      'Paiement confirme',
      `Votre paiement pour ${event.title} est confirme. ${tickets.length} billet(s) ont ete generes.`,
      {
        transaction_ref: transaction.reference,
        event_id: event.id,
        tickets: ticketLines,
      }
    )

    if (event.organizerId) {
      await NotificationService.notifyUser(
        event.organizerId,
        'ticket_sold',
        'Nouveau billet vendu',
        `${clientName} a paye ${money(transaction.amount)} pour ${event.title}. ${tickets.length} billet(s) ont ete generes et envoyes.`,
        {
          transaction_ref: transaction.reference,
          event_id: event.id,
          client_id: user.id,
          tickets: ticketLines,
        }
      )
    }

    const ticketRows = ticketLines
      .map(
        (ticket) => `
          <tr>
            <td>${escapeHtml(ticket.code)}</td>
            <td>${escapeHtml(ticket.type)}</td>
            <td>${money(ticket.amount)}</td>
            <td><code>${escapeHtml(ticket.qrCode)}</code><br><img alt="QR code ${escapeHtml(ticket.code)}" src="${qrImageUrl(ticket.qrCode)}" width="160" height="160"></td>
          </tr>`
      )
      .join('')

    const clientHtml = `
      <h2>Paiement confirme</h2>
      <p>Bonjour ${escapeHtml(clientName)}, votre paiement pour <strong>${escapeHtml(event.title)}</strong> est valide.</p>
      <p><strong>Numero de transaction :</strong> ${escapeHtml(transaction.reference)}</p>
      <table cellpadding="8" cellspacing="0" border="1">
        <thead><tr><th>Ticket</th><th>Type</th><th>Montant</th><th>QR code</th></tr></thead>
        <tbody>${ticketRows}</tbody>
      </table>
    `

    await sendMailIfPossible(
      user.email,
      `Confirmation de paiement - ${event.title}`,
      clientHtml,
      `Paiement confirme. Transaction: ${transaction.reference}. Tickets: ${ticketLines
        .map((ticket) => `${ticket.code} / QR ${ticket.qrCode}`)
        .join(', ')}`
    )

    if (event.organizerId) {
      await event.load('organizer')
      await sendMailIfPossible(
        event.organizer?.email || null,
        `Nouveau paiement billet - ${event.title}`,
        `
          <h2>Nouveau paiement recu</h2>
          <p>${escapeHtml(clientName)} a paye ${money(transaction.amount)} pour <strong>${escapeHtml(event.title)}</strong>.</p>
          <p><strong>Numero de transaction :</strong> ${escapeHtml(transaction.reference)}</p>
          <table cellpadding="8" cellspacing="0" border="1">
            <thead><tr><th>Ticket</th><th>Type</th><th>QR code</th></tr></thead>
            <tbody>${ticketRows}</tbody>
          </table>
        `,
        `${clientName} a paye ${money(transaction.amount)}. Transaction: ${transaction.reference}. Tickets: ${ticketLines
          .map((ticket) => `${ticket.code} / QR ${ticket.qrCode}`)
          .join(', ')}`
      )
    }
  }

  static async notifyProviderPayment({ user, reservation, transaction }: ProviderConfirmationInput) {
    await reservation.load('provider', (query) => query.preload('user'))
    const provider = reservation.provider
    const clientName = fullName(user)
    const providerLabel = provider?.businessName || provider?.user?.fullName || 'Prestataire NOLVA'

    if (!transaction.proofCode) transaction.proofCode = generateProofCode()
    if (!transaction.proofQrCode) {
      transaction.proofQrCode = generateQrPayload('NOLVA-PRESTATION', transaction.reference)
    }
    await transaction.save()

    const metadata = {
      transaction_ref: transaction.reference,
      reservation_id: reservation.id,
      proof_code: transaction.proofCode,
      qr_code: transaction.proofQrCode,
      provider_id: provider?.id,
    }

    await NotificationService.notifyUser(
      user.id,
      'provider_payment_confirmed',
      'Paiement prestation confirme',
      `Votre paiement de ${money(transaction.amount)} pour ${providerLabel} est confirme. Votre justificatif a ete genere.`,
      metadata
    )

    if (provider?.userId) {
      await NotificationService.notifyUser(
        provider.userId,
        'provider_booking_paid',
        'Prestation payee',
        `${clientName} a paye ${money(transaction.amount)}. Justificatif ${transaction.proofCode}, QR ${transaction.proofQrCode}.`,
        { ...metadata, client_id: user.id }
      )
    }

    const qrImg = qrImageUrl(transaction.proofQrCode)
    const clientHtml = `
      <h2>Paiement prestation confirme</h2>
      <p>Bonjour ${escapeHtml(clientName)}, votre paiement pour <strong>${escapeHtml(providerLabel)}</strong> est valide.</p>
      <p><strong>Numero de transaction :</strong> ${escapeHtml(transaction.reference)}</p>
      <p><strong>Justificatif unique :</strong> ${escapeHtml(transaction.proofCode)}</p>
      <p><strong>QR code unique :</strong> <code>${escapeHtml(transaction.proofQrCode)}</code></p>
      <p><img alt="QR code justificatif" src="${qrImg}" width="220" height="220"></p>
    `

    await sendMailIfPossible(
      user.email,
      'Confirmation de paiement prestation',
      clientHtml,
      `Paiement prestation confirme. Transaction: ${transaction.reference}. Justificatif: ${transaction.proofCode}. QR: ${transaction.proofQrCode}.`
    )

    await sendMailIfPossible(
      provider?.user?.email || null,
      'Prestation payee sur NOLVA',
      `
        <h2>Prestation payee</h2>
        <p>${escapeHtml(clientName)} a paye ${money(transaction.amount)} pour votre prestation.</p>
        <p><strong>Numero de transaction :</strong> ${escapeHtml(transaction.reference)}</p>
        <p><strong>Justificatif client :</strong> ${escapeHtml(transaction.proofCode)}</p>
        <p><strong>QR code :</strong> <code>${escapeHtml(transaction.proofQrCode)}</code></p>
        <p><img alt="QR code justificatif" src="${qrImg}" width="220" height="220"></p>
      `,
      `${clientName} a paye ${money(transaction.amount)}. Transaction: ${transaction.reference}. Justificatif: ${transaction.proofCode}. QR: ${transaction.proofQrCode}.`
    )
  }
}
