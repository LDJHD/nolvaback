/**
 * Test création événement (auth + POST /api/events)
 * Usage: node scripts/test_create_event.mjs
 */
const API = process.env.API_URL || 'http://localhost:3333/api'

async function main() {
  const loginRes = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid: 'koffi@test.com', password: 'password123' }),
  })
  if (!loginRes.ok) {
    console.error('Login failed', loginRes.status, await loginRes.text())
    process.exit(1)
  }
  const loginData = await loginRes.json()
  const token = loginData.token?.value || loginData.token
  console.log('✓ Login OK')

  const payload = {
    title: 'Test événement API',
    description: 'Créé par script de test',
    event_type: 'concert',
    event_date: '2026-08-15 18:30:00',
    city: 'Cotonou',
    location: 'Place de la Nation',
    ticket_price: 0,
    ticket_count: 100,
  }

  const createRes = await fetch(`${API}/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  const body = await createRes.json()
  if (!createRes.ok) {
    console.error('✗ Create event failed', createRes.status, JSON.stringify(body, null, 2))
    process.exit(1)
  }

  console.log('✓ Event created:', body.event?.id, body.event?.title)
  console.log('  eventDate:', body.event?.eventDate)
  console.log('  message:', body.message)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
