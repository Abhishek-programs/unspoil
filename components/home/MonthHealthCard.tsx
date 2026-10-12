import { View, Text } from 'react-native'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { colors } from '@/constants/colors'
import type { Bucket } from '@/store/buckets'

interface MonthHealthCardProps {
  spendingBuckets: Bucket[]
  spentByBucket: Record<string, number>
  confirmedSavingsBuckets: Set<string>
  savingsBuckets: Bucket[]
  efBucketId: string | null
  efCurrentBalance: number
  efFloor: number
}

export function MonthHealthCard({
  spendingBuckets,
  spentByBucket,
  confirmedSavingsBuckets,
  savingsBuckets,
  efBucketId,
  efCurrentBalance,
  efFloor,
}: MonthHealthCardProps) {
  // Lifestyle health
  const overBudgetBuckets = spendingBuckets.filter(b => (spentByBucket[b.id] ?? 0) >= b.monthlyAmount)
  const lifestyleVariant = overBudgetBuckets.length > 0 ? 'red' : 'green'
  const lifestyleLabel = overBudgetBuckets.length > 0
    ? `${overBudgetBuckets[0].name} exceeded`
    : 'On track'

  // Investment health
  const pendingSavings = savingsBuckets.filter(b => !confirmedSavingsBuckets.has(b.id))
  const investmentVariant = pendingSavings.length === 0 ? 'green' : 'amber'
  const investmentLabel = pendingSavings.length === 0
    ? 'All confirmed'
    : `${pendingSavings.length} pending`

  // EF health — simple heuristic: on track if above floor
  const efVariant = efCurrentBalance >= efFloor ? 'green' : 'amber'
  const efLabel = efCurrentBalance >= efFloor ? 'On track' : 'Below floor'

  // Bucket breach
  const breachVariant = overBudgetBuckets.length > 0 ? 'red' : 'green'
  const breachLabel = overBudgetBuckets.length > 0
    ? overBudgetBuckets.map(b => b.name).join(', ')
    : 'None'

  const rows: { label: string; chip: string; variant: 'green' | 'amber' | 'red' | 'muted' }[] = [
    { label: 'Lifestyle spending', chip: lifestyleLabel, variant: lifestyleVariant },
    { label: 'Investment transfers', chip: investmentLabel, variant: investmentVariant },
    { label: 'Emergency fund', chip: efLabel, variant: efVariant },
    { label: 'Budget breaches', chip: breachLabel, variant: breachVariant },
  ]

  return (
    <Card style={{ marginHorizontal: 16, marginBottom: 24 }}>
      <Text style={{ fontSize: 15, fontFamily: 'Inter_600SemiBold', color: colors.textPrimary, marginBottom: 12 }}>
        Month health
      </Text>
      {rows.map((row, i) => (
        <View
          key={row.label}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 8,
            borderTopWidth: i === 0 ? 0 : 1,
            borderTopColor: colors.divider,
          }}
        >
          <Text style={{ fontSize: 14, color: colors.textSecond, fontFamily: 'Inter_400Regular' }}>
            {row.label}
          </Text>
          <Chip label={row.chip} variant={row.variant} />
        </View>
      ))}
    </Card>
  )
}
