import { db } from '@/db/client'
import { buckets, goals } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { GOAL_BUCKET_COLOR, GOAL_BUCKET_ICON } from '@/constants/defaults'
import {
  type PaymentMode,
  computeGoalPlan,
  parseTargetDate,
  bucketDisplayName,
} from './plan'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export interface CreateGoalInput {
  name: string
  targetAmount: number
  monthlyContribution: number
  targetDate: string | null
  startBalance: number
  paymentMode: PaymentMode
  upfrontAmount?: number
  emiTenureMonths?: number
  isEnabled?: boolean
}

export async function createGoalWithBuckets(input: CreateGoalInput): Promise<string> {
  const goalId = generateId()
  const now = new Date().toISOString()
  const isEnabled = input.isEnabled !== false

  const plan = computeGoalPlan({
    targetAmount: input.targetAmount,
    alreadySaved: input.startBalance,
    targetDate: parseTargetDate(input.targetDate),
    paymentMode: input.paymentMode,
    upfrontAmount: input.upfrontAmount,
    emiTenureMonths: input.emiTenureMonths ?? 12,
    totalMonthlyOverride: input.monthlyContribution,
  })

  const linkedBucketIds: string[] = []
  const maxSort = await db.select().from(buckets)
  const baseSort = maxSort.length

  for (let i = 0; i < plan.buckets.length; i++) {
    const b = plan.buckets[i]
    const bucketId = `goal-${goalId}-${b.role}`
    linkedBucketIds.push(bucketId)

    await db.insert(buckets).values({
      id: bucketId,
      name: bucketDisplayName(input.name, b.role),
      type: 'savings',
      monthlyAmount: b.monthlyAmount,
      color: GOAL_BUCKET_COLOR,
      icon: GOAL_BUCKET_ICON,
      sortOrder: baseSort + i,
      isActive: isEnabled,
      showOnHome: true,
      linkedGoalId: goalId,
      goalBucketRole: b.role,
    })
  }

  await db.insert(goals).values({
    id: goalId,
    name: input.name,
    targetAmount: input.targetAmount,
    monthlyContribution: plan.totalMonthly,
    targetDate: input.targetDate ?? plan.projectedTargetDate,
    linkedBucketIds: JSON.stringify(linkedBucketIds),
    startBalance: input.startBalance,
    paymentMode: input.paymentMode,
    upfrontAmount: input.paymentMode === 'upfront_emi' ? (input.upfrontAmount ?? null) : null,
    emiTenureMonths: input.paymentMode === 'upfront_emi' ? (input.emiTenureMonths ?? 12) : null,
    isEnabled,
    createdAt: now,
  })

  return goalId
}

export async function setGoalEnabled(goalId: string, enabled: boolean): Promise<void> {
  await db.update(goals).set({ isEnabled: enabled }).where(eq(goals.id, goalId))
  const goalRows = await db.select().from(goals).where(eq(goals.id, goalId)).limit(1)
  if (goalRows.length === 0) return
  const linkedIds: string[] = JSON.parse(goalRows[0].linkedBucketIds || '[]')
  for (const bucketId of linkedIds) {
    await db.update(buckets).set({ isActive: enabled }).where(eq(buckets.id, bucketId))
  }
}

export async function updateGoalPaymentPlan(
  goalId: string,
  patch: Partial<CreateGoalInput>
): Promise<void> {
  const rows = await db.select().from(goals).where(eq(goals.id, goalId)).limit(1)
  if (rows.length === 0) return
  const existing = rows[0]

  const paymentMode = (patch.paymentMode ?? existing.paymentMode) as PaymentMode
  const targetAmount = patch.targetAmount ?? existing.targetAmount
  const startBalance = patch.startBalance ?? existing.startBalance
  const targetDate = patch.targetDate !== undefined ? patch.targetDate : existing.targetDate
  const name = patch.name ?? existing.name
  const upfrontAmount = patch.upfrontAmount ?? existing.upfrontAmount ?? undefined
  const emiTenureMonths = patch.emiTenureMonths ?? existing.emiTenureMonths ?? 12
  const monthlyContribution = patch.monthlyContribution ?? existing.monthlyContribution

  const plan = computeGoalPlan({
    targetAmount,
    alreadySaved: startBalance,
    targetDate: parseTargetDate(targetDate),
    paymentMode,
    upfrontAmount: upfrontAmount ?? undefined,
    emiTenureMonths,
    totalMonthlyOverride: monthlyContribution,
  })

  const linkedIds: string[] = JSON.parse(existing.linkedBucketIds || '[]')
  const existingBuckets = await db.select().from(buckets)

  if (plan.buckets.length !== linkedIds.length || paymentMode !== existing.paymentMode) {
    for (const id of linkedIds) {
      await db.delete(buckets).where(eq(buckets.id, id))
    }
    const newLinkedIds: string[] = []
    const baseSort = existingBuckets.length
    for (let i = 0; i < plan.buckets.length; i++) {
      const b = plan.buckets[i]
      const bucketId = `goal-${goalId}-${b.role}`
      newLinkedIds.push(bucketId)
      await db.insert(buckets).values({
        id: bucketId,
        name: bucketDisplayName(name, b.role),
        type: 'savings',
        monthlyAmount: b.monthlyAmount,
        color: GOAL_BUCKET_COLOR,
        icon: GOAL_BUCKET_ICON,
        sortOrder: baseSort + i,
        isActive: existing.isEnabled,
        showOnHome: true,
        linkedGoalId: goalId,
        goalBucketRole: b.role,
      })
    }
    linkedIds.length = 0
    linkedIds.push(...newLinkedIds)
  } else {
    for (let i = 0; i < plan.buckets.length; i++) {
      const b = plan.buckets[i]
      const bucketId = linkedIds[i]
      await db.update(buckets).set({
        name: bucketDisplayName(name, b.role),
        monthlyAmount: b.monthlyAmount,
        goalBucketRole: b.role,
        linkedGoalId: goalId,
      }).where(eq(buckets.id, bucketId))
    }
  }

  await db.update(goals).set({
    name,
    targetAmount,
    monthlyContribution: plan.totalMonthly,
    targetDate: targetDate ?? plan.projectedTargetDate,
    linkedBucketIds: JSON.stringify(linkedIds),
    startBalance,
    paymentMode,
    upfrontAmount: paymentMode === 'upfront_emi' ? (upfrontAmount ?? null) : null,
    emiTenureMonths: paymentMode === 'upfront_emi' ? emiTenureMonths : null,
  }).where(eq(goals.id, goalId))
}

/** Wipe goals + linked buckets before re-saving onboarding drafts (back-nav safe). */
export async function clearAllGoalsForOnboarding(): Promise<void> {
  const allGoals = await db.select().from(goals)
  for (const g of allGoals) {
    const linkedIds: string[] = JSON.parse(g.linkedBucketIds || '[]')
    for (const bucketId of linkedIds) {
      await db.delete(buckets).where(eq(buckets.id, bucketId))
    }
    await db.delete(goals).where(eq(goals.id, g.id))
  }
}
