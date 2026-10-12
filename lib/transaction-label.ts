import { isSalaryTxn } from '@/lib/txn-kind'
import type { Transaction } from '@/store/transactions'

export function transactionTitle(txn: Transaction): string {
  if (txn.description?.trim()) return txn.description.trim()
  if (txn.merchant?.trim()) return txn.merchant.trim()
  if (isSalaryTxn(txn)) return 'Salary'
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
