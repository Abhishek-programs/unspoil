import { View, Text, StyleSheet } from 'react-native'
import { colors } from '@/constants/colors'
import { formatNPR } from '@/lib/format'
import { ProgressBar } from '@/components/ui/ProgressBar'
import type { Bucket } from '@/store/buckets'

interface LivingSectionProps {
  buckets: Bucket[]
  spentByBucket: Record<string, number>
}

export function LivingSection({ buckets, spentByBucket }: LivingSectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Living</Text>
        <Text style={styles.subtitle}>Your monthly spending</Text>
      </View>
      <View style={styles.card}>
        {buckets.map((bucket, i) => {
          const spent = spentByBucket[bucket.id] ?? 0
          const ratio = bucket.monthlyAmount > 0 ? spent / bucket.monthlyAmount : 0
          return (
            <View key={bucket.id}>
              {i > 0 && <View style={styles.divider} />}
              <View style={styles.row}>
                <View style={[styles.iconBg, { backgroundColor: bucket.color + '18' }]}>
                  <Text style={styles.icon}>{bucket.icon}</Text>
                </View>
                <Text style={styles.name}>{bucket.name}</Text>
                <Text style={styles.amounts}>
                  {formatNPR(spent)}{' '}
                  <Text style={styles.amountsMuted}>/ {formatNPR(bucket.monthlyAmount)}</Text>
                </Text>
              </View>
              <View style={styles.barWrap}>
                <ProgressBar value={ratio} height={4} />
              </View>
            </View>
          )
        })}
        {buckets.length === 0 && (
          <Text style={styles.empty}>No spending buckets</Text>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 16,
  },
  headerRow: {
    paddingHorizontal: 16,
    marginBottom: 10,
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
    marginHorizontal: 16,
    paddingHorizontal: 16,
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
  iconBg: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 16,
  },
  name: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textPrimary,
  },
  amounts: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  amountsMuted: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
  },
  barWrap: {
    paddingBottom: 14,
  },
  empty: {
    paddingVertical: 16,
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    textAlign: 'center',
  },
})
