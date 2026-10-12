import { buildGoalBucketTransactionMigration } from './bucket-migration'

function assertEqual(actual: string, expected: string, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`)
  }
}

function run() {
  const fullToEmi = buildGoalBucketTransactionMigration(
    [{ id: 'goal-a-full', goalBucketRole: 'full' }],
    [
      { id: 'goal-a-upfront', role: 'upfront' },
      { id: 'goal-a-emi_reserve', role: 'emi_reserve' },
    ],
  )
  assertEqual(fullToEmi.get('goal-a-full')!, 'goal-a-upfront', 'full → upfront when switching to EMI')

  const emiToFull = buildGoalBucketTransactionMigration(
    [
      { id: 'goal-b-upfront', goalBucketRole: 'upfront' },
      { id: 'goal-b-emi', goalBucketRole: 'emi_reserve' },
    ],
    [{ id: 'goal-b-full', role: 'full' }],
  )
  assertEqual(emiToFull.get('goal-b-upfront')!, 'goal-b-full', 'upfront → full')
  assertEqual(emiToFull.get('goal-b-emi')!, 'goal-b-full', 'emi_reserve → full')

  const sameShape = buildGoalBucketTransactionMigration(
    [{ id: 'old-full', goalBucketRole: 'full' }],
    [{ id: 'new-full', role: 'full' }],
  )
  assertEqual(sameShape.get('old-full')!, 'new-full', 'role match uses new id')

  console.log('bucket-migration: ok')
}

run()
