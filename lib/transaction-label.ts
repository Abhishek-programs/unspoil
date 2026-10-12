import type { Transaction } from '@/store/transactions'

export function transactionTitle(txn: Transaction): string {
  if (txn.description?.trim()) return txn.description.trim()
  if (txn.remarks && !txn.remarks.startsWith('__')) return txn.remarks.trim()
  if (txn.merchant?.trim()) return txn.merchant.trim()
  if (txn.remarks === '__salary__') return 'Salary'
  if (txn.remarks === '__savings_confirm__') return txn.merchant?.trim() || 'Savings confirm'
  return 'Unknown'
}

export function transactionSubtitle(txn: Transaction): string | null {
  const title = transactionTitle(txn)
  if (txn.fundedFromBucketId) {
    return null // Row renders "from {name}" separately when funded-from is set
  }
  if (txn.merchant?.trim() && txn.merchant.trim() !== title) return txn.merchant.trim()
  return null
}
