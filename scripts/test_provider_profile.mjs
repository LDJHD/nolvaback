/**
 * Test mise à jour profil prestataire (champs fiche publique)
 */
const API = process.env.API_URL || 'http://localhost:3333/api'

async function login(uid) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid, password: 'password123' }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error('login ' + uid)
  return data.token?.value || data.token
}

async function main() {
  const token = await login('dj.flash@test.com')
  console.log('✓ Login prestataire')

  const updateRes = await fetch(`${API}/provider/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      business_name: 'DJ Flash Cotonou',
      type: 'dj',
      specialty: 'Mariages & soirées',
      experience_years: '8',
      city: 'Cotonou',
      description: 'DJ professionnel test profil',
      travel_possible: true,
      is_available: true,
      instagram: 'djflashbj',
      event_types: ['concert', 'mariage'],
    }),
  })
  const updated = await updateRes.json()
  if (!updateRes.ok) {
    console.error('✗ update profile', updateRes.status, updated)
    process.exit(1)
  }
  console.log('✓ Profil mis à jour')

  const meRes = await fetch(`${API}/provider/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const me = await meRes.json()
  const id = me.id

  const showRes = await fetch(`${API}/providers/${id}`)
  const pub = await showRes.json()
  if (!showRes.ok) {
    console.error('✗ show public', showRes.status, pub)
    process.exit(1)
  }

  const checks = [
    ['specialty', pub.specialty === 'Mariages & soirées'],
    ['description', pub.description?.includes('DJ professionnel')],
    ['travel_possible', Boolean(pub.travelPossible ?? pub.travel_possible)],
    ['instagram', pub.instagram === 'djflashbj'],
    ['event_types', Array.isArray(pub.eventTypes || pub.event_types) && (pub.eventTypes || pub.event_types).length >= 1],
  ]
  for (const [label, ok] of checks) {
    console.log(ok ? `✓ public.${label}` : `✗ public.${label}`, pub[label] ?? pub[label.replace('_', '')])
    if (!ok) process.exit(1)
  }
  console.log('✓ Fiche publique alignée avec le profil éditable')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
