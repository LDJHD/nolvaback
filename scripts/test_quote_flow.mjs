/**
 * Test flux devis : création → acceptation prestataire → réservation → paiement (sandbox)
 */
const API = process.env.API_URL || 'http://localhost:3333/api'

async function login(uid) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid, password: 'password123' }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`Login ${uid}: ${res.status}`)
  return data.token?.value || data.token
}

async function main() {
  const clientToken = await login('koffi@test.com')
  const providerToken = await login('dj.flash@test.com')
  console.log('✓ Logins OK')

  const providersRes = await fetch(`${API}/providers?limit=1`)
  const providers = await providersRes.json()
  const list = providers.data || providers
  const provider = Array.isArray(list) ? list[0] : list?.data?.[0]
  if (!provider?.id) {
    console.error('No provider')
    process.exit(1)
  }

  const createRes = await fetch(`${API}/user/quote-requests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${clientToken}`,
    },
    body: JSON.stringify({
      provider_id: provider.id,
      event_type: 'concert',
      event_date: '2026-11-15',
      start_time: '18:00',
      end_time: '23:00',
      proposed_price: 250000,
      message: 'Soirée privée test flux complet',
    }),
  })
  const created = await createRes.json()
  if (!createRes.ok) {
    console.error('✗ create', createRes.status, created)
    process.exit(1)
  }
  const quoteId = created.quoteRequest?.id
  console.log('✓ Devis créé #' + quoteId)

  const acceptRes = await fetch(`${API}/provider/quote-requests/${quoteId}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${providerToken}`,
    },
    body: JSON.stringify({ status: 'accepted', agreed_price: 250000 }),
  })
  const accepted = await acceptRes.json()
  if (!acceptRes.ok) {
    console.error('✗ accept', acceptRes.status, accepted)
    process.exit(1)
  }
  const reservationId = accepted.reservation?.id || accepted.quoteRequest?.reservationId
  console.log('✓ Devis accepté, réservation #' + reservationId)
  console.log('  NB présent:', (accepted.nb || '').includes('NOLVA') ? 'oui' : 'non')

  const showRes = await fetch(`${API}/user/quote-requests/${quoteId}`, {
    headers: { Authorization: `Bearer ${clientToken}` },
  })
  const show = await showRes.json()
  const msgs = show.messages?.filter((m) => m.isSystem || m.is_system) || []
  console.log('✓ Messages système:', msgs.length, '(attendu >= 2)')

  const payInitRes = await fetch(`${API}/payments/reservation/${reservationId}/initiate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${clientToken}` },
  })
  const payInit = await payInitRes.json()
  if (!payInitRes.ok) {
    console.error('✗ pay initiate', payInitRes.status, payInit)
    process.exit(1)
  }
  console.log('✓ Paiement FedaPay initié, ref:', payInit.transactionRef)
  console.log('  Commission NOLVA:', payInit.commissionNolva, 'FCFA')

  const confirmRes = await fetch(`${API}/payments/reservation/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${clientToken}`,
    },
    body: JSON.stringify({ transaction_ref: payInit.transactionRef }),
  })
  const confirm = await confirmRes.json()
  if (!confirmRes.ok) {
    console.error('✗ pay confirm', confirmRes.status, confirm)
    process.exit(1)
  }
  console.log('✓ Paiement confirmé (escrow)')

  const quoteAfter = await fetch(`${API}/user/quote-requests/${quoteId}`, {
    headers: { Authorization: `Bearer ${clientToken}` },
  }).then((r) => r.json())
  console.log('✓ Statut devis après paiement:', quoteAfter.status)

  const adminToken = await login('admin@nolva.bj')
  const actRes = await fetch(`${API}/admin/manage/quote-activities?limit=5`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  })
  const acts = await actRes.json()
  const actList = acts.data || acts
  console.log('✓ Activités admin:', (Array.isArray(actList) ? actList : actList?.data || []).length, 'entrées récentes')

  console.log('\n✓ Flux devis complet OK')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
