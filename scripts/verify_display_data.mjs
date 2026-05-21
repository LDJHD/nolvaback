/**
 * Vérifie que prestataires et événements affichables sont bien en base.
 * Usage: node scripts/verify_display_data.mjs
 */
const API = process.env.API_URL || 'http://localhost:3333/api'

async function get(path) {
  const res = await fetch(`${API}${path}`)
  if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`)
  return res.json()
}

async function main() {
  const popular = await get('/providers/popular')
  const providers = await get('/providers?limit=50')
  const events = await get('/events?limit=50')
  const providerList = Array.isArray(providers) ? providers : providers.data || []
  const eventList = Array.isArray(events) ? events : events.data || []

  console.log('--- Vérification affichage NOLVA ---')
  console.log('Prestataires actifs (liste):', providerList.length)
  console.log('Prestataires populaires:', popular.length)
  console.log('Événements publics validés:', eventList.length)

  const ok =
    providerList.length >= 1 &&
    popular.length >= 1 &&
    eventList.length >= 1

  if (!ok) {
    console.error('\n❌ Données insuffisantes. Exécutez: node ace migration:fresh --seed')
    process.exit(1)
  }

  console.log('\n✓ Exemples prestataires:', providerList.slice(0, 3).map((p) => p.businessName || p.business_name))
  console.log('✓ Exemples événements:', eventList.slice(0, 3).map((e) => e.title))
  console.log('\n✅ Tout est prêt pour l\'affichage sur le site.')
}

main().catch((e) => {
  console.error('Erreur:', e.message)
  console.error('Le backend est-il démarré ? (node ace serve)')
  process.exit(1)
})
