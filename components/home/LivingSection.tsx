import { View, Text, StyleSheet } from 'react-native'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import {
  CORE_LIVING_BUCKET_ID,
  DATES_BUCKET_ID,
  FUN_BUCKET_ID,
  PERSONAL_BUCKET_ID,
  MISC_BUCKET_ID,
} from '@/constants/defaults'
import { colors } from '@/constants/colors'
import { formatMoney } from '@/lib/format'
import { effectiveCap } from '@/lib/bucket-balance'
import { ProgressBar } from '@/components/ui/ProgressBar'
import type { Bucket } from '@/store/buckets'

const BUCKET_HINTS: Record<string, string> = {
  [CORE_LIVING_BUCKET_ID]: 'Household & groceries',
  [DATES_BUCKET_ID]: 'All date spending',
  [FUN_BUCKET_ID]: 'Social & eating out',
  [PERSONAL_BUCKET_ID]: 'One-off buys · rolls over',
  [MISC_BUCKET_ID]: "Doesn't fit elsewhere",
}

interface LivingSectionProps {
  buckets: Bucket[]
  spentByBucket: Record<string, number>
  bucketBalances: Record<string, number>
  personalRecoveryDebt?: number
}

export function LivingSection({
  buckets,
  spentByBucket,
  bucketBalances,
  personalRecoveryDebt = 0,
}: LivingSectionProps) {
  const regularBuckets = buckets.filter(b => !b.accumulates)
  const fundBuckets = buckets.filter(b => b.accumulates)

  const renderRegularRow = (bucket: Bucket, i: number) => {
    const spent = spentByBucket[bucket.id] ?? 0
    const ceiling = bucket.monthlyAmount
    const over = Math.max(0, spent - ceiling)
    let segments: { green: number; red: number; darkRed?: number }
    if (over > 0 && spent > 0) {
      segments = {
        green: 0,
        red: ceiling / spent,
        darkRed: over / spent,
      }
    } else {
      segments = {
        green: ceiling > 0 ? Math.max(0, (ceiling - spent) / ceiling) : 1,
        red: ceiling > 0 ? Math.min(1, spent / ceiling) : 0,
      }
    }
    return (
      <Animated.View
        key={bucket.id}
        entering={FadeInDown.delay(Math.min(i, 4) * 40).duration(350)}
      >
        {i > 0 && <View style={styles.divider} />}
        <View style={styles.row}>
          <Text style={styles.icon}>{bucket.icon}</Text>
          <View style={styles.nameCol}>
            <Text style={styles.name}>{bucket.name}</Text>
            <Text style={styles.sublabel}>
              {BUCKET_HINTS[bucket.id] ?? 'Budget'}
            </Text>
          </View>
          <Text style={styles.amounts}>
            <Text style={styles.spentLabel}>Spent </Text>
            {formatMoney(spent)}
          </Text>
        </View>
        <View style={styles.barWrap}>
          <ProgressBar value={0} height={4} segments={segments} />
          <Text style={[styles.ceilingHint, over > 0 && { color: colors.redDark }]}>
            {over > 0
              ? `${formatMoney(over)} over · ceiling ${formatMoney(ceiling)}`
              : `ceiling ${formatMoney(ceiling)}`}
          </Text>
        </View>
      </Animated.View>
    )
  }

  const renderFundRow = (bucket: Bucket, showDivider: boolean, i: number) => {
    const spent = spentByBucket[bucket.id] ?? 0
    const balance = Math.max(0, bucketBalances[bucket.id] ?? 0)
    const cap = Math.max(effectiveCap(bucket) ?? bucket.monthlyAmount * 4, 1)
    const topUp = bucket.monthlyAmount
    const green = Math.min(1, balance / cap)
    const red = Math.min(1, spent / cap)
    const grey = Math.max(0, 1 - green - red)
    const emptyAndSpent = balance <= 0 && spent > 0

    return (
      <Animated.View
        key={bucket.id}
        entering={FadeInDown.delay(Math.min(i, 4) * 40).duration(350)}
      >
        {showDivider && <View style={styles.divider} />}
        <View style={styles.row}>
          <Text style={styles.icon}>{bucket.icon}</Text>
          <View style={styles.nameCol}>
            <Text style={styles.name}>{bucket.name}</Text>
            <Text style={styles.sublabel}>
              {BUCKET_HINTS[bucket.id] ?? 'Fund'}
            </Text>
          </View>
          <Text style={styles.amounts}>
            <Text style={styles.spentLabel}>Spent </Text>
            {formatMoney(spent)}
          </Text>
        </View>
        <View style={styles.barWrap}>
          <ProgressBar value={0} height={4} segments={{ green, red, grey }} />
          <Text style={[styles.fundHint, emptyAndSpent && { color: colors.redDark }]}>
            {emptyAndSpent
              ? `Fund empty · draws from Your money`
              : `Fund ${formatMoney(balance)} / ${formatMoney(cap)} · +${formatMoney(topUp)}/mo · rolls over`}
            {personalRecoveryDebt > 0
              ? ` · recovering ${formatMoney(personalRecoveryDebt)}`
              : ''}
          </Text>
        </View>
      </Animated.View>
    )
  }

  const allEmpty = regularBuckets.length === 0 && fundBuckets.length === 0

  return (
    <Animated.View style={styles.section} entering={FadeIn.duration(300)}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Living</Text>
          <Text style={styles.subtitle}>Ceilings & personal fund</Text>
        </View>
      </View>
      <View style={styles.card}>
        {regularBuckets.map((bucket, i) => renderRegularRow(bucket, i))}
        {fundBuckets.map((bucket, i) =>
          renderFundRow(
            bucket,
            regularBuckets.length > 0 || i > 0,
            regularBuckets.length + i,
          ),
        )}
        {allEmpty && (
          <Text style={styles.empty}>No spending buckets</Text>
        )}
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 16,
  },
  headerRow: {
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    marginTop: 1,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 20,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 6,
  },
  icon: {
    width: 28,
    fontSize: 18,
    marginRight: 12,
    textAlign: 'center',
  },
  nameCol: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textPrimary,
  },
  sublabel: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: colors.textMuted,
    marginTop: 1,
  },
  amounts: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  spentLabel: {
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
  },
  barWrap: {
    paddingBottom: 14,
  },
  fundHint: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    marginTop: 6,
  },
  ceilingHint: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    marginTop: 6,
  },
  empty: {
    paddingVertical: 16,
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    textAlign: 'center',
  },
})
