/**
 * Test admin: refus événement, gel avec motif, reversement sandbox
 */
const API = process.env.API_URL || 'http://localhost:3333/api'

async function req(method, path, body, token) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  return { status: res.status, data }
}

async function main() {
  const adminLogin = await req('POST', '/auth/login', {
    uid: process.env.ADMIN_EMAIL || 'admin@nolva.bj',
    password: process.env.ADMIN_PASSWORD || 'password123',
  })
  if (adminLogin.status !== 200) {
    console.error('Admin login failed', adminLogin.status, adminLogin.data)
    process.exit(1)
  }
  const adminToken = adminLogin.data.token?.value || adminLogin.data.token
  console.log('✓ Admin connecté')

  const pending = await req('GET', '/admin/events/pending', null, adminToken)
  const events = pending.data || []
  if (events.length > 0) {
    const ev = events[0]
    const rej = await req(
      'POST',
      `/admin/events/${ev.id}/reject`,
      { note: 'Test refus: informations incomplètes pour validation NOLVA.' },
      adminToken
    )
    console.log('Reject event:', rej.status, rej.data?.message)
  } else {
    console.log('(skip reject — aucun événement en attente)')
  }

  const txRes = await req('GET', '/admin/transactions?status=paid&limit=5', null, adminToken)
  const txs = txRes.data?.data || txRes.data || []
  const providerTx = txs.find((t) => t.type === 'provider_payment')
  if (providerTx) {
    const freeze = await req(
      'POST',
      '/admin/transactions/freeze',
      {
        transaction_ref: providerTx.reference,
        note: 'Test gel admin: vérification en cours sur cette prestation.',
      },
      adminToken
    )
    console.log('Freeze:', freeze.status, freeze.data?.message)

    const hist = await req(
      'GET',
      `/admin/action-history?transaction_id=${providerTx.id}`,
      null,
      adminToken
    )
    const logs = hist.data?.data || hist.data || []
    console.log('History entries for tx:', logs.length)

    const disputed = await req(
      'POST',
      '/admin/disputes/resolve',
      {
        transaction_ref: providerTx.reference,
        action: 'release',
        note: 'Test résolution litige',
      },
      adminToken
    )
    console.log('Resolve (release):', disputed.status, disputed.data?.message)

    const payout = await req(
      'POST',
      '/admin/payouts/execute',
      {
        transaction_id: providerTx.id,
        payout_method: 'bj_mtn',
        payout_destination: '+22990123456',
        note: 'Test reversement admin',
      },
      adminToken
    )
    console.log('Payout execute:', payout.status, payout.data?.message)
  } else {
    console.log('(skip freeze/payout — aucune transaction paid prestataire)')
  }

  const comm = await req('GET', '/admin/commissions', null, adminToken)
  const list = comm.data || []
  const custom = list.find((c) => !c.is_default && !c.isDefault)
  if (custom) {
    const del = await req('DELETE', `/admin/commissions/${custom.id}`, null, adminToken)
    console.log('Delete commission:', del.status, del.data?.message)
  }
  const def = list.find((c) => c.is_default || c.isDefault)
  if (def) {
    const upd = await req('PUT', `/admin/commissions/${def.id}`, { rate: def.rate }, adminToken)
    console.log('Update default commission:', upd.status)
  }

  console.log('\n✅ Tests admin flows terminés')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
