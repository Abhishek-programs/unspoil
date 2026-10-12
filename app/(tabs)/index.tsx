import { useState, useEffect, useMemo } from 'react'
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@/constants/colors'
import { usePulseData } from '@/hooks/usePulseData'
import { HeroRing } from '@/components/home/HeroRing'
import { LivingSection } from '@/components/home/LivingSection'
import { FutureSection } from '@/components/home/FutureSection'
import { NetWorthCard } from '@/components/home/NetWorthCard'
import { FlaggedTransactionPrompt } from '@/components/flagged/FlaggedTransactionPrompt'
import { MonthStartChecklist, type ChecklistItem } from '@/components/home/MonthStartChecklist'
import { usePlaybookStore } from '@/store/playbook'
import { useTransactionsStore, INCOME_BUCKET_ID } from '@/store/transactions'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function HomeScreen() {
  const { transactions } = useTransactionsStore()
  const {
    userName,
    monthStartDay,
    monthlyIncome,
    lastChecklistMonth,
    updatePlaybook
  } = usePlaybookStore()
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
    netWorth,
    monthGrowth,
    totalAssets,
    totalLiabilities,
    savingsRate,
    assetBreakdown,
  } = usePulseData()

  const [promptVisible, setPromptVisible] = useState(false)
  const [checklistVisible, setChecklistVisible] = useState(false)

  const flagged = transactions.filter(t => t.isFlagged)

  const currentMonthKey = new Date().toISOString().slice(0, 7)

  // Determine which checklist items are already completed this month
  // by checking if matching transactions exist
  const hasSalaryThisMonth = transactions.some(t => t.remarks === '__salary__' && t.type === 'income')

  const checklistItems: ChecklistItem[] = useMemo(() => {
    const items: ChecklistItem[] = [
      {
        id: 'income',
        label: 'Confirm Salary Received',
        amount: monthlyIncome,
        bucketId: INCOME_BUCKET_ID,
        completed: hasSalaryThisMonth,
      },
    ]
    savingsBuckets.forEach(b => {
      items.push({
        id: b.id,
        label: b.name,
        amount: b.monthlyAmount,
        bucketId: b.id,
        completed: confirmedSavingIds.has(b.id),
      })
    })
    return items
  }, [monthlyIncome, savingsBuckets, hasSalaryThisMonth, confirmedSavingIds])

  const checklistAllDone = checklistItems.every(i => i.completed)
  const checklistPending = lastChecklistMonth !== currentMonthKey && !checklistAllDone

  // Show checklist on first open if month hasn't been completed
  useEffect(() => {
    if (lastChecklistMonth !== currentMonthKey && !checklistAllDone) {
      setChecklistVisible(true)
    }
  }, [lastChecklistMonth, currentMonthKey])

  // When all items are done, mark the month as complete
  useEffect(() => {
    if (checklistAllDone && lastChecklistMonth !== currentMonthKey) {
      updatePlaybook({ lastChecklistMonth: currentMonthKey })
    }
  }, [checklistAllDone, currentMonthKey, lastChecklistMonth])

  const handleToggleChecklistItem = async (id: string) => {
    const txnDate = monthStart.toISOString()

    if (id === 'income') {
      await addTransaction({
        type: 'income',
        amount: monthlyIncome,
        merchant: 'Salary',
        bucketId: INCOME_BUCKET_ID,
        date: txnDate,
        source: 'manual',
        remarks: '__salary__',
        parsedTxnId: null,
        isFlagged: false,
        isRecurringDraft: false,
      })
    } else {
      const bucket = savingsBuckets.find(b => b.id === id)
      if (!bucket) return
      await addTransaction({
        type: 'expense',
        amount: bucket.monthlyAmount,
        merchant: bucket.name,
        bucketId: bucket.id,
        date: txnDate,
        source: 'manual',
        remarks: '__savings_confirm__',
        parsedTxnId: null,
        isFlagged: false,
        isRecurringDraft: false,
      })
    }
  }

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

  const futureBuckets = savingsBuckets

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            {getGreeting()}, {userName || 'there'}
          </Text>
        </View>
        <TouchableOpacity style={styles.notifButton} onPress={() => setChecklistVisible(true)} hitSlop={12}>
          <Ionicons name="list-outline" size={22} color={colors.textSecond} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >

        {/* Checklist Pending Banner */}
        {checklistPending && !checklistVisible && (
          <TouchableOpacity
            style={styles.checklistBanner}
            onPress={() => setChecklistVisible(true)}
            activeOpacity={0.8}
          >
            <View style={styles.checklistBannerIcon}>
              <Ionicons name="calendar-outline" size={18} color={colors.green} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.checklistBannerTitle}>Month checklist pending</Text>
              <Text style={styles.checklistBannerSub}>Tap to confirm your monthly transfers</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}

        {/* Flagged Banner */}
        {flagged.length > 0 && (
          <TouchableOpacity
            style={styles.flaggedBanner}
            onPress={() => setPromptVisible(true)}
            activeOpacity={0.8}
          >
            <View style={styles.flaggedIconBg}>
              <Ionicons name="alert-circle" size={20} color={colors.amber} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.flaggedTitle}>
                {flagged.length} transaction{flagged.length > 1 ? 's' : ''} need confirmation
              </Text>
              <Text style={styles.flaggedSub}>Tap to assign correct buckets</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}

        {/* Net Worth Card */}
        <NetWorthCard
          netWorth={netWorth}
          monthGrowth={monthGrowth}
          assets={totalAssets}
          liabilities={totalLiabilities}
          savingsRate={savingsRate}
          breakdown={assetBreakdown.map(a => ({ label: a.name, value: a.value }))}
        />

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

        <View style={{ height: 80 }} />
      </ScrollView>

      <FlaggedTransactionPrompt
        visible={promptVisible}
        flaggedTransactions={flagged}
        onClose={() => setPromptVisible(false)}
      />

      <MonthStartChecklist
        visible={checklistVisible}
        items={checklistItems}
        onToggleItem={handleToggleChecklistItem}
        onDismiss={() => setChecklistVisible(false)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.pageBg,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: 64,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  greeting: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
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
  checklistBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.greenFill,
    borderRadius: 16,
    padding: 12,
    marginTop: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.green + '30',
    borderCurve: 'continuous',
  },
  checklistBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checklistBannerTitle: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
  },
  checklistBannerSub: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecond,
  },
  flaggedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B10',
    borderRadius: 16,
    padding: 12,
    marginTop: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F59E0B20',
    borderCurve: 'continuous',
  },
  flaggedIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  flaggedTitle: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
  },
  flaggedSub: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecond,
  },
})
