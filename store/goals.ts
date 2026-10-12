import { create } from 'zustand'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { goals } from '@/db/schema'
import type { PaymentMode } from '@/lib/goals/plan'
import { createGoalWithBuckets, setGoalEnabled, updateGoalPaymentPlan } from '@/lib/goals/actions'

export interface Goal {
  id: string
  name: string
  targetAmount: number
  monthlyContribution: number
  targetDate: string | null
  linkedBucketIds: string[]
  startBalance: number
  paymentMode: PaymentMode
  upfrontAmount: number | null
  emiTenureMonths: number | null
  isEnabled: boolean
  completedAt?: string | null
  freedMonthlyAmount?: number | null
  createdAt: string
}

interface GoalsState {
  goals: Goal[]
  isLoaded: boolean
  loadGoals: () => Promise<void>
  addGoal: (data: Omit<Goal, 'id' | 'createdAt'>) => Promise<void>
  createGoalWithBuckets: typeof createGoalWithBuckets
  setGoalEnabled: typeof setGoalEnabled
  updateGoalPaymentPlan: typeof updateGoalPaymentPlan
  updateGoal: (id: string, patch: Partial<Omit<Goal, 'id' | 'createdAt'>>) => Promise<void>
  deleteGoal: (id: string) => Promise<void>
}

function mapGoalRow(g: typeof goals.$inferSelect): Goal {
  return {
    ...g,
    targetDate: g.targetDate ?? null,
    linkedBucketIds: JSON.parse(g.linkedBucketIds || '[]'),
    paymentMode: (g.paymentMode ?? 'pay_in_full') as PaymentMode,
    upfrontAmount: g.upfrontAmount ?? null,
    emiTenureMonths: g.emiTenureMonths ?? null,
    isEnabled: g.isEnabled ?? true,
    completedAt: g.completedAt ?? null,
    freedMonthlyAmount: g.freedMonthlyAmount ?? null,
  }
}

export const useGoalsStore = create<GoalsState>((set, get) => ({
  goals: [],
  isLoaded: false,

  loadGoals: async () => {
    const rows = await db.select().from(goals)
    set({
      goals: rows.map(mapGoalRow),
      isLoaded: true,
    })
  },

  addGoal: async (data) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
    const now = new Date().toISOString()
    await db.insert(goals).values({
      id,
      name: data.name,
      targetAmount: data.targetAmount,
      monthlyContribution: data.monthlyContribution,
      targetDate: data.targetDate,
      linkedBucketIds: JSON.stringify(data.linkedBucketIds),
      startBalance: data.startBalance,
      paymentMode: data.paymentMode ?? 'pay_in_full',
      upfrontAmount: data.upfrontAmount,
      emiTenureMonths: data.emiTenureMonths,
      isEnabled: data.isEnabled ?? true,
      createdAt: now,
    })
    await get().loadGoals()
  },

  createGoalWithBuckets: async (input) => {
    const id = await createGoalWithBuckets(input)
    await get().loadGoals()
    return id
  },

  setGoalEnabled: async (goalId, enabled) => {
    await setGoalEnabled(goalId, enabled)
    await get().loadGoals()
  },

  updateGoalPaymentPlan: async (goalId, patch) => {
    await updateGoalPaymentPlan(goalId, patch)
    await get().loadGoals()
  },

  updateGoal: async (id, patch) => {
    const updateData: Record<string, unknown> = {}
    if (patch.name !== undefined) updateData.name = patch.name
    if (patch.targetAmount !== undefined) updateData.targetAmount = patch.targetAmount
    if (patch.monthlyContribution !== undefined) updateData.monthlyContribution = patch.monthlyContribution
    if (patch.targetDate !== undefined) updateData.targetDate = patch.targetDate
    if (patch.linkedBucketIds !== undefined) updateData.linkedBucketIds = JSON.stringify(patch.linkedBucketIds)
    if (patch.startBalance !== undefined) updateData.startBalance = patch.startBalance
    if (patch.paymentMode !== undefined) updateData.paymentMode = patch.paymentMode
    if (patch.upfrontAmount !== undefined) updateData.upfrontAmount = patch.upfrontAmount
    if (patch.emiTenureMonths !== undefined) updateData.emiTenureMonths = patch.emiTenureMonths
    if (patch.isEnabled !== undefined) updateData.isEnabled = patch.isEnabled
    if (patch.completedAt !== undefined) updateData.completedAt = patch.completedAt
    if (patch.freedMonthlyAmount !== undefined) updateData.freedMonthlyAmount = patch.freedMonthlyAmount
    await db.update(goals).set(updateData).where(eq(goals.id, id))
    await get().loadGoals()
  },

  deleteGoal: async (id) => {
    await db.delete(goals).where(eq(goals.id, id))
    await get().loadGoals()
  },
}))
