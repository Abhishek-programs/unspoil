import { create } from 'zustand'
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
}

export const useGoalsStore = create<GoalsState>((set) => ({
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
}))
