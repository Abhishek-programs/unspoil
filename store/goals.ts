import { create } from 'zustand'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { goals } from '@/db/schema'

export interface Goal {
  id: string
  name: string
  targetAmount: number
  monthlyContribution: number
  targetDate: string | null
  linkedBucketIds: string[]
  startBalance: number
  createdAt: string
}

interface GoalsState {
  goals: Goal[]
  isLoaded: boolean
  loadGoals: () => Promise<void>
  addGoal: (data: Omit<Goal, 'id' | 'createdAt'>) => Promise<void>
  updateGoal: (id: string, patch: Partial<Omit<Goal, 'id' | 'createdAt'>>) => Promise<void>
  deleteGoal: (id: string) => Promise<void>
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export const useGoalsStore = create<GoalsState>((set, get) => ({
  goals: [],
  isLoaded: false,

  loadGoals: async () => {
    const rows = await db.select().from(goals)
    set({
      goals: rows.map(g => ({
        ...g,
        targetDate: g.targetDate ?? null,
        linkedBucketIds: JSON.parse(g.linkedBucketIds || '[]'),
      })),
      isLoaded: true,
    })
  },

  addGoal: async (data) => {
    const id = generateId()
    const now = new Date().toISOString()
    await db.insert(goals).values({
      id,
      name: data.name,
      targetAmount: data.targetAmount,
      monthlyContribution: data.monthlyContribution,
      targetDate: data.targetDate,
      linkedBucketIds: JSON.stringify(data.linkedBucketIds),
      startBalance: data.startBalance,
      createdAt: now,
    })
    await get().loadGoals()
  },

  updateGoal: async (id, patch) => {
    const updateData: Record<string, any> = {}
    if (patch.name !== undefined) updateData.name = patch.name
    if (patch.targetAmount !== undefined) updateData.targetAmount = patch.targetAmount
    if (patch.monthlyContribution !== undefined) updateData.monthlyContribution = patch.monthlyContribution
    if (patch.targetDate !== undefined) updateData.targetDate = patch.targetDate
    if (patch.linkedBucketIds !== undefined) updateData.linkedBucketIds = JSON.stringify(patch.linkedBucketIds)
    if (patch.startBalance !== undefined) updateData.startBalance = patch.startBalance
    await db.update(goals).set(updateData).where(eq(goals.id, id))
    await get().loadGoals()
  },

  deleteGoal: async (id) => {
    await db.delete(goals).where(eq(goals.id, id))
    await get().loadGoals()
  },
}))
