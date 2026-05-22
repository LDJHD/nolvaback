/**
 * Test: portfolio batch upload (max 7) + affichage fiche publique
 */
const API = process.env.API_URL || 'http://localhost:3333/api'

const tinyPng =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k='

async function req(method, path, body, token) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    data = text
  }
  return { status: res.status, data }
}

async function main() {
  const uid = `test_portfolio_${Date.now()}@test.nolva.bj`
  const reg = await req('POST', '/auth/register', {
    first_name: 'Test',
    last_name: 'Portfolio',
    email: uid,
    phone: `+229${Date.now().toString().slice(-8)}`,
    password: 'password123',
    role: 'provider',
    business_name: 'Test Portfolio SARL',
    type: 'dj',
    city: 'cotonou',
  })
  if (reg.status !== 201) {
    console.error('Register failed', reg.status, reg.data)
    process.exit(1)
  }
  const token = reg.data.token
  const providerId = reg.data.user?.serviceProvider?.id
  console.log('OK register, provider id:', providerId)

  const urls = Array.from({ length: 7 }, (_, i) => tinyPng + `?v=${i}`)
  const batch = await req('POST', '/provider/photos/batch', { urls }, token)
  console.log('Batch upload:', batch.status, batch.data?.message, 'count:', batch.data?.count)
  if (batch.status !== 201 || batch.data?.count !== 7) {
    console.error('FAIL batch', batch.data)
    process.exit(1)
  }

  const over = await req('POST', '/provider/photos/batch', { urls: [tinyPng] }, token)
  console.log('Over limit (expect 400):', over.status, over.data?.message)
  if (over.status !== 400) {
    console.error('FAIL should reject 8th photo')
    process.exit(1)
  }

  const show = await req('GET', `/providers/${providerId}`)
  const photos = show.data?.photos || []
  console.log('Public show photos:', photos.length)
  if (show.status !== 200 || photos.length !== 7) {
    console.error('FAIL public show', show.status, photos.length)
    process.exit(1)
  }
  const valid = photos.every((p) => p.url && p.url.length > 50)
  if (!valid) {
    console.error('FAIL truncated urls', photos.map((p) => p.url?.length))
    process.exit(1)
  }

  const payout = await req('PUT', '/provider/profile', {
    momo_network: 'ci_wave',
    momo_phone: '+2250700000000',
  }, token)
  console.log('Payout update:', payout.status)
  if (payout.status !== 200) {
    console.error('FAIL payout', payout.data)
    process.exit(1)
  }

  console.log('\n✅ Tous les tests portfolio / fiche publique / payout OK')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
