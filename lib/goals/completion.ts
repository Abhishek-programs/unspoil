import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { buckets, goals } from '@/db/schema'
import type { Goal } from '@/store/goals'
import type { Transaction } from '@/store/transactions'
import { withdrawnFromBuckets } from '@/lib/txn-kind'

export interface CompletedGoalResult {
  goal: Goal
  freedMonthlyAmount: number
}

export function getGoalCurrent(
  goal: Goal,
  transactions: Transaction[],
): number {
  const contributed = transactions
    .filter(
      t => goal.linkedBucketIds.includes(t.bucketId) && t.type === 'expense',
    )
    .reduce((sum, t) => sum + t.amount, 0)
  return goal.startBalance + contributed - withdrawnFromBuckets(goal.linkedBucketIds, transactions)
}

export async function markGoalCompleted(
  goal: Pick<Goal, 'id' | 'monthlyContribution' | 'linkedBucketIds'>,
): Promise<void> {
  await db
    .update(goals)
    .set({
      completedAt: new Date().toISOString(),
      freedMonthlyAmount: goal.monthlyContribution,
      isEnabled: false,
    })
    .where(eq(goals.id, goal.id))
  for (const bucketId of goal.linkedBucketIds) {
    await db.update(buckets).set({ isActive: false }).where(eq(buckets.id, bucketId))
  }
}

/** Undo of an early completion: the savings are back, so the goal is live again. */
export async function reopenGoalIfUnderTarget(
  bucketId: string,
  allGoals: Goal[],
  transactions: Transaction[],
): Promise<boolean> {
  const goal = allGoals.find(g => g.completedAt && g.linkedBucketIds.includes(bucketId))
  if (!goal || getGoalCurrent(goal, transactions) >= goal.targetAmount) return false
  await db
    .update(goals)
    .set({ completedAt: null, freedMonthlyAmount: null, isEnabled: true })
    .where(eq(goals.id, goal.id))
  for (const id of goal.linkedBucketIds) {
    await db.update(buckets).set({ isActive: true }).where(eq(buckets.id, id))
  }
  return true
}

export async function checkAndCompleteGoals(
  allGoals: Goal[],
  transactions: Transaction[],
): Promise<CompletedGoalResult[]> {
  const completed: CompletedGoalResult[] = []
  for (const goal of allGoals) {
    if (!goal.isEnabled || goal.completedAt) continue
    const current = getGoalCurrent(goal, transactions)
    if (current < goal.targetAmount) continue

    const freedMonthly = goal.monthlyContribution
    await markGoalCompleted(goal)

    completed.push({ goal, freedMonthlyAmount: freedMonthly })
  }

  return completed
}
