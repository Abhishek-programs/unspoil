export type AccountKind = 'bank' | 'esewa' | 'cash'

export const BANK_ACCOUNT_ID = 'bank'
export const ESEWA_ACCOUNT_ID = 'esewa'
export const CASH_ACCOUNT_ID = 'cash'

export const DEFAULT_ACCOUNTS: {
  id: string
  name: string
  kind: AccountKind
  sortOrder: number
}[] = [
  { id: BANK_ACCOUNT_ID, name: 'Bank', kind: 'bank', sortOrder: 0 },
  { id: ESEWA_ACCOUNT_ID, name: 'eSewa', kind: 'esewa', sortOrder: 1 },
  { id: CASH_ACCOUNT_ID, name: 'Cash', kind: 'cash', sortOrder: 2 },
]

export function defaultAccountId(): string {
  return BANK_ACCOUNT_ID
}

/** Payment helper package → account */
export function accountIdForPaymentPackage(pkg: string): string {
  const p = pkg.toLowerCase()
  if (p.includes('esewa')) return ESEWA_ACCOUNT_ID
  return BANK_ACCOUNT_ID
}
