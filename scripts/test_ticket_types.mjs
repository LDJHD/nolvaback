/**
 * Test types de billets + achat FedaPay (sandbox)
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
  const orgToken = await login('koffi@test.com')
  console.log('✓ Login')

  const sug = await fetch(`${API}/events/publish-suggestions?event_type=concert`)
  console.log('Suggestions:', sug.status, (await sug.json()).tips?.length, 'tips')

  const createRes = await fetch(`${API}/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${orgToken}`,
    },
    body: JSON.stringify({
      title: 'Test Concert Multi Billets',
      description: 'Event test script',
      event_type: 'concert',
      event_date: '2026-12-01 20:00:00',
      city: 'Cotonou',
      location: 'Place publique',
      auto_publish: true,
      ticket_types: [
        { label: 'Standard', price: 3000, quantity: 50 },
        { label: 'VIP', price: 15000, quantity: 10 },
      ],
    }),
  })
  const created = await createRes.json()
  if (!createRes.ok) {
    console.error('Create failed', createRes.status, created)
    process.exit(1)
  }
  const eventId = created.event?.id
  console.log('✓ Event published id', eventId, 'types', created.ticket_types?.length)

  const showRes = await fetch(`${API}/events/${eventId}`)
  const show = await showRes.json()
  console.log('✓ Show ticket_types', show.ticket_types?.length)

  const vipId = show.ticket_types?.find((t) => t.label === 'VIP')?.id
  const buyRes = await fetch(`${API}/payments/ticket/buy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${clientToken}`,
    },
    body: JSON.stringify({
      event_id: eventId,
      ticket_type_id: vipId,
      quantity: 1,
    }),
  })
  const buy = await buyRes.json()
  console.log('Buy VIP:', buyRes.status, buy.message, buy.paymentUrl ? 'url ok' : '')

  if (buy.transactionRef) {
    const conf = await fetch(`${API}/payments/ticket/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${clientToken}`,
      },
      body: JSON.stringify({ transaction_ref: buy.transactionRef }),
    })
    const confData = await conf.json()
    console.log('Confirm:', conf.status, confData.message)
  }

  console.log('\n✅ Test ticket types OK')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
