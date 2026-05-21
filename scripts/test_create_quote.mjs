/**
 * Test création demande de devis
 * Usage: node scripts/test_create_quote.mjs
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

  const providersRes = await fetch(`${API}/providers?limit=1`)
  const providersBody = await providersRes.json()
  const list = providersBody.data || providersBody
  const provider = Array.isArray(list) ? list[0] : list?.data?.[0]
  if (!provider?.id) {
    console.error('No provider found')
    process.exit(1)
  }

  async function createQuote(payload, label) {
    const createRes = await fetch(`${API}/user/quote-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })
    const body = await createRes.json()
    if (!createRes.ok) {
      console.error(`✗ ${label}`, createRes.status, JSON.stringify(body, null, 2))
      process.exit(1)
    }
    console.log(`✓ ${label}:`, body.quoteRequest?.id, '—', body.message)
    return body
  }

  await createQuote(
    {
      provider_type: provider.type || 'dj',
      event_type: 'concert',
      event_date: '2026-10-20',
      city: 'Cotonou',
      message: 'Test devis sans prestataire précis',
    },
    'Sans prestataire (type seulement)'
  )

  await createQuote(
    {
      provider_id: provider.id,
      provider_type: provider.type,
      event_type: 'concert',
      event_date: '2026-11-01',
      city: 'Cotonou',
      message: 'Test devis avec prestataire précis',
    },
    'Avec prestataire précis'
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
