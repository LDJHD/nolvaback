import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

router.get('/', async () => ({ status: 'ok', app: 'NOLVA API', version: '1.0.0' }))
router.get('/health', async () => ({ status: 'ok' }))

// CATALOGUE (types publics)
router.group(() => {
  router.get('/event-types', '#controllers/catalog_controller.eventTypes')
  router.get('/provider-types', '#controllers/catalog_controller.providerTypes')
}).prefix('/api/catalog')

// AUTH
router.group(() => {
  router.post('/register', '#controllers/auth_controller.register')
  router.post('/login', '#controllers/auth_controller.login')
  router.post('/forgot-password', '#controllers/auth_controller.forgotPassword')
  router.get('/verify-reset-token', '#controllers/auth_controller.verifyResetToken')
  router.post('/reset-password', '#controllers/auth_controller.resetPassword')
  router.post('/logout', '#controllers/auth_controller.logout').use(middleware.auth())
  router.get('/me', '#controllers/auth_controller.me').use(middleware.auth())
  router.put('/profile', '#controllers/auth_controller.updateProfile').use(middleware.auth())
}).prefix('/api/auth')

// PRESTATAIRES (PUBLIC)
router.group(() => {
  router.get('/', '#controllers/providers_controller.index')
  router.get('/popular', '#controllers/providers_controller.popular')
  router.get('/:id', '#controllers/providers_controller.show')
}).prefix('/api/providers')

// ESPACE PRESTATAIRE (auth + role provider)
router.group(() => {
  router.get('/profile', '#controllers/providers_controller.myProfile')
  router.put('/profile', '#controllers/providers_controller.updateMyProfile')
  router.post('/offers', '#controllers/offers_controller.store')
  router.put('/offers/:id', '#controllers/offers_controller.update')
  router.delete('/offers/:id', '#controllers/offers_controller.destroy')
  router.post('/photos', '#controllers/provider_photos_controller.store')
  router.post('/photos/batch', '#controllers/provider_photos_controller.storeBatch')
  router.delete('/photos/:id', '#controllers/provider_photos_controller.destroy')
  router.get('/quote-requests', '#controllers/quote_requests_controller.providerRequests')
  router.get('/quote-requests/:id', '#controllers/quote_requests_controller.providerShow')
  router.get('/quote-requests/:id/messages', '#controllers/quote_requests_controller.providerMessages')
  router.post('/quote-requests/:id/messages', '#controllers/quote_requests_controller.providerPostMessage')
  router.put('/quote-requests/:id/status', '#controllers/quote_requests_controller.updateStatus')
  router.get('/reservations', '#controllers/reservations_controller.providerReservations')
  router.put('/availability', '#controllers/availabilities_controller.update')
  router.get('/payout-messages', '#controllers/payout_messages_controller.list')
  router.post('/payout-messages', '#controllers/payout_messages_controller.store')
}).prefix('/api/provider').use([middleware.auth(), middleware.provider()])

// ESPACE UTILISATEUR (auth)
router.group(() => {
  router.post('/quote-requests', '#controllers/quote_requests_controller.store')
  router.get('/quote-requests', '#controllers/quote_requests_controller.myRequests')
  router.get('/quote-requests/:id', '#controllers/quote_requests_controller.show')
  router.get('/quote-requests/:id/messages', '#controllers/quote_requests_controller.messages')
  router.post('/quote-requests/:id/messages', '#controllers/quote_requests_controller.postMessage')
  router.post('/reservations', '#controllers/reservations_controller.store')
  router.get('/reservations', '#controllers/reservations_controller.myReservations')
  router.get('/reservations/:id', '#controllers/reservations_controller.show')
  router.post('/reservations/:id/provider-points', '#controllers/reservations_controller.awardProviderPoints')
  router.get('/tickets', '#controllers/events_controller.myTickets')
  router.get('/events', '#controllers/events_controller.myEvents')
  router.put('/events/:id', '#controllers/events_controller.organizerUpdate')
  router.get('/events/:id/ticket-sales', '#controllers/events_controller.organizerTicketSales')
  router.post('/events/:id/tickets/scan', '#controllers/events_controller.organizerScanTicket')
  router.post('/events/:id/cancel', '#controllers/events_controller.organizerCancel')
  router.post('/events/:id/reschedule', '#controllers/events_controller.organizerReschedule')
  router.get('/events/:id/registrations', '#controllers/events_controller.organizerEventRegistrations')
}).prefix('/api/user').use(middleware.auth())

// NOTIFICATIONS UTILISATEUR / PRESTATAIRE
router.group(() => {
  router.get('/', '#controllers/notifications_controller.index')
  router.post('/read-all', '#controllers/notifications_controller.markAllRead')
  router.post('/:id/read', '#controllers/notifications_controller.markRead')
}).prefix('/api/notifications').use(middleware.auth())

// PAIEMENTS
router.group(() => {
  // Achat ticket
  router.post('/ticket/buy', '#controllers/payments_controller.buyTicket').use(middleware.auth())
  router.post('/ticket/confirm', '#controllers/payments_controller.confirmTicketPayment').use(middleware.auth())
  // Paiement prestataire
  router.post('/reservation/:id/initiate', '#controllers/payments_controller.initiateReservationPayment').use(middleware.auth())
  router.post('/reservation/confirm', '#controllers/payments_controller.confirmReservationPayment').use(middleware.auth())
  // Validation du service (client confirme)
  router.post('/service/validate', '#controllers/payments_controller.validateService').use(middleware.auth())
  // Litiges
  router.post('/dispute/open', '#controllers/payments_controller.openDispute').use(middleware.auth())
  router
    .get('/transaction/reservation/:id', '#controllers/payments_controller.getReservationTransaction')
    .use(middleware.auth())
  // Webhook FedaPay (public)
  router.post('/webhook', '#controllers/payments_controller.webhook')
}).prefix('/api/payments')

// ADMIN NOLVA (tableau de bord - PDF section 6)
router.group(() => {
  // Transactions
  router.get('/transactions', '#controllers/payments_controller.adminTransactions')
  router.get('/payouts', '#controllers/payments_controller.adminPayouts')
  router.get('/payouts/pending', '#controllers/payout_messages_controller.adminPendingPayouts')
  router.get('/payout-messages', '#controllers/payout_messages_controller.list')
  router.post('/payout-messages', '#controllers/payout_messages_controller.store')
  router.post('/escrow/release', '#controllers/payments_controller.adminRunEscrowRelease')
  router.get('/commissions/stats', '#controllers/payments_controller.adminCommissionStats')
  router.post('/transactions/freeze', '#controllers/payments_controller.freezeTransaction')
  router.post('/payouts/execute', '#controllers/payments_controller.adminExecutePayout')
  router.post('/disputes/repayment', '#controllers/payments_controller.adminDisputeRepayment')
  router.post('/disputes/contact-organizer', '#controllers/payments_controller.adminContactRefundOrganizer')
  router.post('/disputes/refund-client', '#controllers/payments_controller.adminExecuteClientRefund')
  router.get('/action-history', '#controllers/payments_controller.adminActionHistory')
  // Litiges
  router.post('/disputes/resolve', '#controllers/payments_controller.resolveDispute')
  // Commissions CRUD
  router.get('/commissions', '#controllers/payments_controller.listCommissions')
  router.post('/commissions', '#controllers/payments_controller.createCommission')
  router.put('/commissions/:id', '#controllers/payments_controller.updateCommission')
  router.delete('/commissions/:id', '#controllers/payments_controller.deleteCommission')
  // Validation événements
  router.get('/events/pending', '#controllers/events_controller.adminPending')
  router.post('/events/:id/approve', '#controllers/events_controller.adminApprove')
  router.post('/events/:id/reject', '#controllers/events_controller.adminReject')
  // Catalogue types
  router.get('/catalog/event-types', '#controllers/catalog_controller.adminListEventTypes')
  router.post('/catalog/event-types', '#controllers/catalog_controller.adminCreateEventType')
  router.put('/catalog/event-types/:id', '#controllers/catalog_controller.adminUpdateEventType')
  router.delete('/catalog/event-types/:id', '#controllers/catalog_controller.adminDeleteEventType')
  router.get('/catalog/provider-types', '#controllers/catalog_controller.adminListProviderTypes')
  router.post('/catalog/provider-types', '#controllers/catalog_controller.adminCreateProviderType')
  router.put('/catalog/provider-types/:id', '#controllers/catalog_controller.adminUpdateProviderType')
  router.delete('/catalog/provider-types/:id', '#controllers/catalog_controller.adminDeleteProviderType')
  // Annuaire (tous événements / prestataires / devis)
  router.get('/manage/events', '#controllers/admin_directory_controller.listEvents')
  router.put('/manage/events/:id', '#controllers/admin_directory_controller.updateEvent')
  router.get('/manage/providers', '#controllers/admin_directory_controller.listProviders')
  router.put('/manage/providers/:id', '#controllers/admin_directory_controller.updateProvider')
  router.get('/manage/members-history', '#controllers/admin_directory_controller.listMembersHistory')
  router.get('/manage/quote-requests', '#controllers/admin_directory_controller.listQuoteRequests')
  router.put('/manage/quote-requests/:id', '#controllers/admin_directory_controller.updateQuoteRequest')
  router.get('/manage/quote-activities', '#controllers/quote_requests_controller.listActivities')
}).prefix('/api/admin').use([middleware.auth(), middleware.admin()])

// EVENEMENTS (PUBLIC)
router.group(() => {
  router.get('/publish-suggestions', '#controllers/events_controller.publishSuggestions')
  router.get('/', '#controllers/events_controller.index')
  router.get('/:id', '#controllers/events_controller.show')
  router.post('/:id/register', '#controllers/events_controller.registerFree')
  router.post('/', '#controllers/events_controller.store').use(middleware.auth())
}).prefix('/api/events')
