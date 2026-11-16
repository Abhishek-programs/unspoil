import { BANK_ACCOUNT_ID } from '@/constants/accounts'
import {
  GOAL_PURCHASE_BUCKET_ID,
  GOAL_RETURN_BUCKET_ID,
  GOAL_SAVINGS_ACCOUNT_ID,
  withdrawnFromBuckets,
} from '@/lib/txn-kind'
import { getGoalCurrent, markGoalCompleted } from '@/lib/goals/completion'
import { useTransactionsStore } from '@/store/transactions'
import { useBucketsStore } from '@/store/buckets'
import { useGoalsStore, type Goal } from '@/store/goals'

export const YOUR_MONEY = 'your_money'
export const KEEP_IN_GOAL = 'keep'

export interface SpendGoalSavingsInput {
  goal: Goal
  price: number
  /** YOUR_MONEY (no ceiling) or a spending bucket id — only used when price > saved. */
  remainderFrom: string
  /** YOUR_MONEY, KEEP_IN_GOAL, or another goal's id — only used when price < saved. */
  leftoverTo: string
  /** Wallet the remainder is paid from, or the leftover lands in. */
  walletId: string
  date: string
}

export interface SpendGoalSavingsResult {
  completed: boolean
  overspent?: number
  overspentBucketId?: string
}

/**
 * Buy the goal early (or close it): the saved part comes out of the goal's
 * savings without touching Your money, the rest is a normal expense, and any
 * leftover is released. Completes the goal unless the leftover stays in it.
 */
export async function spendGoalSavings(
  input: SpendGoalSavingsInput,
): Promise<SpendGoalSavingsResult> {
  const { goal, price, date } = input
  const txStore = useTransactionsStore.getState()
  const all = txStore.allTransactions
  const saved = Math.max(0, getGoalCurrent(goal, all))
  const fromSavings = Math.min(saved, price)
  const remainder = price - fromSavings
  const leftover = saved - fromSavings

  // Per-bucket balances so split goals drain upfront first, then the reserve.
  const balances = goal.linkedBucketIds.map((id, i) => ({
    id,
    left:
      (i === 0 ? goal.startBalance : 0) +
      all
        .filter(t => t.bucketId === id && t.type === 'expense')
        .reduce((s, t) => s + t.amount, 0) -
      withdrawnFromBuckets([id], all),
  }))
  const draw = (amount: number) => {
    const parts: { bucketId: string; amount: number }[] = []
    let need = amount
    for (const b of balances) {
      if (need <= 0) break
      const take = Math.min(Math.max(0, b.left), need)
      if (take <= 0) continue
      b.left -= take
      need -= take
      parts.push({ bucketId: b.id, amount: take })
    }
    if (need > 0 && balances.length > 0) parts.push({ bucketId: balances[0].id, amount: need })
    return parts
  }

  const base = {
    merchant: null,
    date,
    source: 'manual' as const,
    parsedTxnId: null,
    isFlagged: false,
    isRecurringDraft: false,
  }

  for (const part of draw(fromSavings)) {
    await txStore.addTransaction({
      ...base,
      type: 'expense',
      amount: part.amount,
      description: goal.name,
      bucketId: GOAL_PURCHASE_BUCKET_ID,
      fundedFromBucketId: part.bucketId,
      accountId: GOAL_SAVINGS_ACCOUNT_ID,
    })
  }

  const result: SpendGoalSavingsResult = { completed: false }
  if (remainder > 0) {
    const fromBucket = input.remainderFrom !== YOUR_MONEY
    const { overspent } = await txStore.addTransaction({
      ...base,
      type: 'expense',
      amount: remainder,
      description: goal.name,
      bucketId: fromBucket ? input.remainderFrom : GOAL_PURCHASE_BUCKET_ID,
      fundedFromBucketId: null,
      accountId: input.walletId || BANK_ACCOUNT_ID,
    })
    if (overspent && fromBucket) {
      result.overspent = overspent
      result.overspentBucketId = input.remainderFrom
    }
  }

  const keep = leftover > 0 && input.leftoverTo === KEEP_IN_GOAL
  if (leftover > 0 && !keep) {
    const target =
      input.leftoverTo === YOUR_MONEY
        ? null
        : useGoalsStore.getState().goals.find(g => g.id === input.leftoverTo)
    for (const part of draw(leftover)) {
      if (target) {
        await txStore.addTransaction({
          ...base,
          type: 'expense',
          amount: part.amount,
          description: `From ${goal.name}`,
          bucketId: target.linkedBucketIds[0],
          fundedFromBucketId: part.bucketId,
          accountId: GOAL_SAVINGS_ACCOUNT_ID,
        })
      } else {
        await txStore.addTransaction({
          ...base,
          type: 'income',
          amount: part.amount,
          description: `${goal.name} leftover`,
          bucketId: GOAL_RETURN_BUCKET_ID,
          fundedFromBucketId: part.bucketId,
          accountId: input.walletId || BANK_ACCOUNT_ID,
        })
      }
    }
  }

  if (!keep) {
    await markGoalCompleted(goal)
    result.completed = true
    await useGoalsStore.getState().loadGoals()
    await useBucketsStore.getState().loadBuckets()
  }
  return result
}
