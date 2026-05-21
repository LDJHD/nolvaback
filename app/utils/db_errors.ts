export function isDuplicateEntryError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const e = error as { code?: string; errno?: number }
  return e.code === 'ER_DUP_ENTRY' || e.errno === 1062
}

export function duplicateFieldMessage(error: unknown): string | null {
  if (!isDuplicateEntryError(error)) return null
  const msg = String((error as { sqlMessage?: string; message?: string }).sqlMessage || (error as Error).message || '')
  if (msg.includes('email')) {
    return 'Cette adresse email est déjà utilisée. Connectez-vous ou utilisez une autre adresse.'
  }
  if (msg.includes('phone')) {
    return 'Ce numéro de téléphone est déjà associé à un compte.'
  }
  return 'Ces informations sont déjà utilisées par un autre compte.'
}
