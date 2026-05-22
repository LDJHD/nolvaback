/**
 * Test: sauvegarde photo vitrine (profile_photo LONGTEXT)
 */
const API = process.env.API_URL || 'http://localhost:3333/api'

const tinyJpeg =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k='

async function main() {
  const uid = `test_vitrine_${Date.now()}@test.nolva.bj`
  const reg = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      first_name: 'Test',
      last_name: 'Vitrine',
      email: uid,
      phone: `+229${Date.now().toString().slice(-8)}`,
      password: 'password123',
      role: 'provider',
      business_name: 'Test Vitrine',
      type: 'dj',
      city: 'cotonou',
    }),
  })
  const regData = await reg.json()
  if (!reg.ok) {
    console.error('Register failed', reg.status, regData)
    process.exit(1)
  }
  const token = regData.token
  const providerId = regData.user?.serviceProvider?.id

  const upd = await fetch(`${API}/provider/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      business_name: 'Test Vitrine SARL',
      type: 'dj',
      profile_photo: tinyJpeg,
      description: 'Description test vitrine',
    }),
  })
  const updData = await upd.json()
  console.log('Update profile:', upd.status, updData.message)
  if (!upd.ok) {
    console.error(updData)
    process.exit(1)
  }

  const show = await fetch(`${API}/providers/${providerId}`)
  const showData = await show.json()
  const photo = showData.profilePhoto || showData.profile_photo
  if (!photo || photo.length < 50) {
    console.error('FAIL: profile photo not on public show', photo?.length)
    process.exit(1)
  }
  console.log('Public show profile_photo length:', photo.length)
  console.log('✅ Photo vitrine OK')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
