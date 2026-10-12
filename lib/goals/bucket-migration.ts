import type { GoalBucketRole } from './plan'

/** Map each old goal bucket id to the new bucket id that should own its transactions. */
export function buildGoalBucketTransactionMigration(
  oldBuckets: { id: string; goalBucketRole: GoalBucketRole | null }[],
  newBuckets: { id: string; role: GoalBucketRole }[],
): Map<string, string> {
  const oldByRole = new Map<GoalBucketRole, string>()
  for (const b of oldBuckets) {
    if (b.goalBucketRole) oldByRole.set(b.goalBucketRole, b.id)
  }
  const newByRole = new Map<GoalBucketRole, string>()
  for (const b of newBuckets) {
    newByRole.set(b.role, b.id)
  }

  const pickNew = (role: GoalBucketRole | null, oldId: string): string => {
    if (role && newByRole.has(role)) return newByRole.get(role)!
    if (role === 'full') {
      return newByRole.get('full') ?? newByRole.get('upfront') ?? newByRole.values().next().value!
    }
    if (role === 'upfront') {
      return newByRole.get('upfront') ?? newByRole.get('full') ?? newByRole.values().next().value!
    }
    if (role === 'emi_reserve') {
      return newByRole.get('emi_reserve') ?? newByRole.get('full') ?? newByRole.values().next().value!
    }
    return newByRole.values().next().value ?? oldId
  }

  const map = new Map<string, string>()
  for (const b of oldBuckets) {
    map.set(b.id, pickNew(b.goalBucketRole, b.id))
  }
  return map
}
