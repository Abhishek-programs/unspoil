import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { buckets, goals } from '@/db/schema'
import type { Goal } from '@/store/goals'
import type { Transaction } from '@/store/transactions'

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
      t => goal.linkedBucketIds.includes(t.bucketId) && t.remarks === '__savings_confirm__',
    )
    .reduce((sum, t) => sum + t.amount, 0)
  return goal.startBalance + contributed
}

export async function checkAndCompleteGoals(
  allGoals: Goal[],
  transactions: Transaction[],
): Promise<CompletedGoalResult[]> {
  const completed: CompletedGoalResult[] = []
  const now = new Date().toISOString()

  for (const goal of allGoals) {
    if (!goal.isEnabled || goal.completedAt) continue
    const current = getGoalCurrent(goal, transactions)
    if (current < goal.targetAmount) continue

    const freedMonthly = goal.monthlyContribution
    await db
      .update(goals)
      .set({
        completedAt: now,
        freedMonthlyAmount: freedMonthly,
        isEnabled: false,
      })
      .where(eq(goals.id, goal.id))

    for (const bucketId of goal.linkedBucketIds) {
      await db.update(buckets).set({ isActive: false }).where(eq(buckets.id, bucketId))
    }

    completed.push({ goal, freedMonthlyAmount: freedMonthly })
  }

  return completed
}
