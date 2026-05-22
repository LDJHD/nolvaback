import { createRequire } from 'node:module'
import env from '#start/env'

const require = createRequire(import.meta.url)

type FedaPayModule = {
  FedaPay: { setApiKey: (k: string) => void; setEnvironment: (e: string) => void }
  Transaction: {
    create: (payload: Record<string, unknown>) => Promise<{
      id: string | number
      generateToken: () => Promise<{ url: string }>
    }>
    retrieve: (id: string) => Promise<{ status: string }>
  }
  Payout: {
    create: (payload: Record<string, unknown>) => Promise<{
      id: string | number
      sendNow: (opts?: Record<string, unknown>) => Promise<unknown>
    }>
  }
}

let sdk: FedaPayModule | null = null

function loadSdk(): FedaPayModule {
  if (sdk) return sdk
  const FedaPay = require('fedapay') as FedaPayModule
  FedaPay.FedaPay.setApiKey(env.get('FEDAPAY_SECRET_KEY'))
  FedaPay.FedaPay.setEnvironment(env.get('FEDAPAY_ENVIRONMENT'))
  sdk = FedaPay
  return sdk
}

export async function createFedaPayTransaction(payload: Record<string, unknown>) {
  const FedaPay = loadSdk()
  return FedaPay.Transaction.create(payload)
}

export async function retrieveFedaPayTransaction(id: string) {
  const FedaPay = loadSdk()
  return FedaPay.Transaction.retrieve(id)
}

export async function createAndSendFedaPayPayout(payload: Record<string, unknown>) {
  const FedaPay = loadSdk()
  const payout = await FedaPay.Payout.create(payload)
  await payout.sendNow()
  return payout
}
