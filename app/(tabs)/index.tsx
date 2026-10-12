import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@/constants/colors'
import { formatMonth } from '@/lib/format'
import { usePulseData } from '@/hooks/usePulseData'
import { HeroRing } from '@/components/home/HeroRing'
import { LivingSection } from '@/components/home/LivingSection'
import { FutureSection } from '@/components/home/FutureSection'
import { MonthSnapshotRow } from '@/components/home/MonthSnapshotRow'
import { usePlaybookStore } from '@/store/playbook'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function HomeScreen() {
  const { userName } = usePlaybookStore()
  const {
    totalIncome,
    available,
    flaggedAmount,
    unconfirmedSavings,
    confirmedSavings,
    daysRemaining,
    weeklyRate,
    totalSpent,
    spendingBuckets,
    savingsBuckets,
    spentByBucket,
    confirmedSavingIds,
    monthStart,
    addTransaction,
  } = usePulseData()

  const monthLabel = formatMonth(monthStart)
  const futureBuckets = savingsBuckets.filter(b => b.name !== 'BigExpense Debt')

  const handleConfirmSavings = async (bucketId: string) => {
    const bucket = savingsBuckets.find(b => b.id === bucketId)
    if (!bucket || confirmedSavingIds.has(bucketId)) return
    await addTransaction({
      type: 'expense',
      amount: bucket.monthlyAmount,
      merchant: bucket.name,
      bucketId: bucket.id,
      date: new Date().toISOString(),
      source: 'manual',
      remarks: '__savings_confirm__',
      parsedTxnId: null,
      isFlagged: false,
      isRecurringDraft: false,
    })
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              {getGreeting()}, {userName || 'Friend'}
            </Text>
            <Text style={styles.monthLabel}>{monthLabel}</Text>
          </View>
          <TouchableOpacity style={styles.notifButton}>
            <Ionicons name="notifications-outline" size={22} color={colors.textSecond} />
          </TouchableOpacity>
        </View>

        {/* Hero Ring */}
        <HeroRing
          totalIncome={totalIncome}
          available={available}
          flaggedAmount={flaggedAmount}
          unconfirmedSavings={unconfirmedSavings}
          daysRemaining={daysRemaining}
          weeklyRate={weeklyRate}
          totalSpent={totalSpent}
          confirmedSavings={confirmedSavings}
        />

        {/* Living — Spending */}
        <LivingSection
          buckets={spendingBuckets}
          spentByBucket={spentByBucket}
        />

        {/* Future — Savings checklist */}
        <FutureSection
          buckets={futureBuckets}
          confirmedBucketIds={confirmedSavingIds}
          onConfirm={handleConfirmSavings}
        />

        {/* Monthly Snapshot */}
        <MonthSnapshotRow
          income={totalIncome}
          saved={confirmedSavings}
          spent={totalSpent}
        />

        {/* Bottom spacer for tab bar */}
        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
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
    paddingTop: 64, // Standardized header height
    paddingBottom: 8,
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
    borderCurve: 'continuous',
  },
})
