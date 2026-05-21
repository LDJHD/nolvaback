/**
 * Test mot de passe oublié
 */
const API = process.env.API_URL || 'http://localhost:3333/api'

async function main() {
  const forgotRes = await fetch(`${API}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid: 'koffi@test.com' }),
  })
  const forgot = await forgotRes.json()
  if (!forgotRes.ok) {
    console.error('✗ forgot', forgotRes.status, forgot)
    process.exit(1)
  }
  console.log('✓ Forgot:', forgot.message)
  const resetUrl = forgot.reset_url
  if (!resetUrl) {
    console.error('✗ Pas de reset_url en dev — vérifiez NODE_ENV=development')
    process.exit(1)
  }
  const token = new URL(resetUrl).searchParams.get('token')
  console.log('✓ Token reçu')

  const verifyRes = await fetch(`${API}/auth/verify-reset-token?token=${token}`)
  const verify = await verifyRes.json()
  if (!verify.valid) {
    console.error('✗ Token invalide')
    process.exit(1)
  }
  console.log('✓ Token valide')

  const resetRes = await fetch(`${API}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token,
      password: 'password123',
      password_confirmation: 'password123',
    }),
  })
  const reset = await resetRes.json()
  if (!resetRes.ok) {
    console.error('✗ reset', resetRes.status, reset)
    process.exit(1)
  }
  console.log('✓ Reset:', reset.message)

  const loginRes = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid: 'koffi@test.com', password: 'password123' }),
  })
  if (!loginRes.ok) {
    console.error('✗ login après reset')
    process.exit(1)
  }
  console.log('✓ Connexion avec nouveau mot de passe OK')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
