import { useEffect, useState } from 'react'
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@/constants/colors'
import { formatMonth } from '@/lib/format'
import { getMonthRange } from '@/lib/month'
import { usePlaybookStore } from '@/store/playbook'
import { useBucketsStore } from '@/store/buckets'
import { useTransactionsStore } from '@/store/transactions'
import { NetWorthCard } from '@/components/home/NetWorthCard'
import { BucketRow } from '@/components/home/BucketRow'
import { SavingsRow } from '@/components/home/SavingsRow'
import { MonthHealthCard } from '@/components/home/MonthHealthCard'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function HomeScreen() {
  const { monthStartDay, monthlyIncome, efFloor } = usePlaybookStore()
  const { getSpendingBuckets, getSavingsBuckets } = useBucketsStore()
  const {
    flaggedTransactions,
    loadTransactions,
    getSpentByBucket,
    getConfirmedSavingsBuckets,
  } = useTransactionsStore()

  // Manually confirmed savings (local state — persisted on next full transaction write in future)
  const [localConfirmed, setLocalConfirmed] = useState<Set<string>>(new Set())

  const spendingBuckets = getSpendingBuckets()
  const savingsBuckets = getSavingsBuckets()
  const confirmedFromTransactions = getConfirmedSavingsBuckets()

  // Merge DB-confirmed and locally toggled
  const confirmedBuckets = new Set([...confirmedFromTransactions, ...localConfirmed])

  const { start } = getMonthRange(monthStartDay)
  const monthLabel = formatMonth(start)

  // Build spent map for all buckets
  const spentByBucket: Record<string, number> = {}
  ;[...spendingBuckets, ...savingsBuckets].forEach(b => {
    spentByBucket[b.id] = getSpentByBucket(b.id)
  })

  // Spending totals for savings rate calculation
  const totalSpent = spendingBuckets.reduce((sum, b) => sum + (spentByBucket[b.id] ?? 0), 0)
  const savingsRate = monthlyIncome > 0 ? Math.max(0, (monthlyIncome - totalSpent) / monthlyIncome) : 0

  // EF bucket ID (first savings bucket named "Emergency Fund")
  const efBucket = savingsBuckets.find(b => b.name === 'Emergency Fund') ?? null

  const handleToggleSavings = (bucketId: string) => {
    setLocalConfirmed(prev => {
      const next = new Set(prev)
      if (next.has(bucketId)) {
        next.delete(bucketId)
      } else {
        next.add(bucketId)
      }
      return next
    })
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}, Abhishek</Text>
            <Text style={styles.monthLabel}>{monthLabel}</Text>
          </View>
          <TouchableOpacity style={styles.notifButton}>
            <Ionicons name="notifications-outline" size={22} color={colors.textSecond} />
          </TouchableOpacity>
        </View>

        {/* Flagged transaction banner */}
        {flaggedTransactions.length > 0 && (
          <TouchableOpacity style={styles.flaggedBanner} activeOpacity={0.8}>
            <Ionicons name="alert-circle" size={18} color={colors.amber} style={{ marginRight: 8 }} />
            <Text style={styles.flaggedText}>
              {flaggedTransactions.length} transaction{flaggedTransactions.length > 1 ? 's' : ''} need your confirmation
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.amber} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        )}

        {/* Net Worth Card */}
        <NetWorthCard
          totalNetWorth={0}
          deltaThisMonth={0}
          totalAssets={0}
          totalLiabilities={0}
          savingsRate={savingsRate}
        />

        {/* Lifestyle Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Lifestyle · {monthLabel}</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.card}>
            {spendingBuckets.map((bucket, i) => (
              <View key={bucket.id}>
                {i > 0 && <View style={styles.divider} />}
                <BucketRow
                  bucket={bucket}
                  spent={spentByBucket[bucket.id] ?? 0}
                />
              </View>
            ))}
            {spendingBuckets.length === 0 && (
              <Text style={styles.emptyText}>No spending buckets configured</Text>
            )}
          </View>
        </View>

        {/* Savings Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Savings · {monthLabel}</Text>
          </View>
          <View style={styles.card}>
            {savingsBuckets.map((bucket, i) => (
              <View key={bucket.id}>
                {i > 0 && <View style={styles.divider} />}
                <SavingsRow
                  bucket={bucket}
                  confirmed={confirmedBuckets.has(bucket.id)}
                  onConfirm={() => handleToggleSavings(bucket.id)}
                />
              </View>
            ))}
            {savingsBuckets.length === 0 && (
              <Text style={styles.emptyText}>No savings buckets configured</Text>
            )}
          </View>
        </View>

        {/* Month Health Card */}
        <MonthHealthCard
          spendingBuckets={spendingBuckets}
          spentByBucket={spentByBucket}
          confirmedSavingsBuckets={confirmedBuckets}
          savingsBuckets={savingsBuckets}
          efBucketId={efBucket?.id ?? null}
          efCurrentBalance={0}
          efFloor={efFloor}
        />

        {/* Bottom spacer for tab bar */}
        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.pageBg,
  },
  scrollContent: {
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  greeting: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  monthLabel: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecond,
  },
  notifButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flaggedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: colors.amberFill,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.amber + '40',
  },
  flaggedText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: colors.amber,
    flex: 1,
  },
  section: {
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  seeAll: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: colors.green,
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
  emptyText: {
    paddingVertical: 16,
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    textAlign: 'center',
  },
})
