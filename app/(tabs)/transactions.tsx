import { useState, useMemo, useCallback } from 'react'
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors } from '@/constants/colors'
import { formatNPR, formatNPRShort, formatDate } from '@/lib/format'
import { useTransactionsStore, INCOME_BUCKET_ID, SALARY_BUCKET_ID } from '@/store/transactions'
import { useBucketsStore } from '@/store/buckets'
import { usePlaybookStore } from '@/store/playbook'
import { getMonthRangeBack } from '@/lib/month'
import { useGoalsStore } from '@/store/goals'
import { TransactionRow } from '@/components/transactions/TransactionRow'
import { TransactionDetailSheet } from '@/components/transactions/TransactionDetailSheet'
import { LendingRow } from '@/components/transactions/LendingRow'
import { ChartsView } from '@/components/transactions/ChartsView'
import type { Transaction } from '@/store/transactions'
import { useLendingStore } from '@/store/lending'
import { LendingEntrySheet } from '@/components/lending/LendingEntrySheet'
import type { LendBorrowEntry } from '@/store/lending'

type FilterKey = 'all' | 'income' | 'flagged' | 'lending' | string

export default function TransactionsScreen() {
  const insets = useSafeAreaInsets()
  const { allTransactions } = useTransactionsStore()
  const { monthStartDay, earlyMonthStartDate } = usePlaybookStore()
  const { buckets, getSpendingBuckets, getSavingsBuckets } = useBucketsStore()
  const {
    entries: lendingEntries,
    contacts,
    allEntries,
    updateEntry,
    deleteEntry,
  } = useLendingStore()

  const [periodOffset, setPeriodOffset] = useState(0)
  const [viewMode, setViewMode] = useState<'list' | 'chart'>('list')
  const [chartPeriod, setChartPeriod] = useState<'month' | 'year'>('month')
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all')
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null)
  const [detailVisible, setDetailVisible] = useState(false)
  const [selectedLendingEntry, setSelectedLendingEntry] =
    useState<LendBorrowEntry | null>(null)

  const period = useMemo(
    () => getMonthRangeBack(monthStartDay, earlyMonthStartDate, periodOffset),
    [monthStartDay, earlyMonthStartDate, periodOffset],
  )

  const transactions = useMemo(() => {
    const startMs = period.start.getTime()
    const endMs = period.end.getTime()
    return allTransactions.filter(t => {
      const ms = new Date(t.date).getTime()
      return ms >= startMs && ms <= endMs
    })
  }, [allTransactions, period])

  const hasOlderPeriods = useMemo(
    () => allTransactions.some(t => new Date(t.date).getTime() < period.start.getTime()),
    [allTransactions, period],
  )

  const bucketMap = useMemo(() => {
    const m = new Map<string, { name: string; color: string }>()
    buckets.forEach(b => m.set(b.id, { name: b.name, color: b.color }))
    m.set(INCOME_BUCKET_ID, { name: 'Income', color: colors.green })
    m.set(SALARY_BUCKET_ID, { name: 'Salary', color: colors.green })
    return m
  }, [buckets])

  const spendingBuckets = getSpendingBuckets()
  const savingsBuckets = getSavingsBuckets()
  const savingsBucketIds = useMemo(
    () => new Set(savingsBuckets.map(b => b.id)),
    [savingsBuckets],
  )

  const filters: { key: FilterKey; label: string }[] = useMemo(() => [
    { key: 'all', label: 'All' },
    ...spendingBuckets.map(b => ({ key: b.id, label: b.name })),
    { key: 'savings', label: 'Savings' },
    { key: 'income', label: 'Income' },
    { key: 'lending', label: 'Lending' },
    { key: 'flagged', label: 'Flagged' },
  ], [spendingBuckets])

  const isLendingFilter = activeFilter === 'lending'

  const contactMap = useMemo(() => {
    const m = new Map<string, string>()
    contacts.forEach(c => m.set(c.id, c.name))
    return m
  }, [contacts])

  const lendingSections = useMemo(() => {
    const source = isLendingFilter ? allEntries : lendingEntries
    const sorted = [...source].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    )
    const groups: Record<string, typeof sorted> = {}
    sorted.forEach(e => {
      const key = formatDate(e.date)
      if (!groups[key]) groups[key] = []
      groups[key].push(e)
    })
    return Object.entries(groups).map(([title, data]) => ({ title, data }))
  }, [allEntries, lendingEntries, isLendingFilter])

  const lendingSummary = useMemo(() => {
    const source = isLendingFilter ? allEntries : lendingEntries
    const lent = source.filter(e => e.type === 'lend').reduce((s, e) => s + e.amount, 0)
    const borrowed = source.filter(e => e.type === 'borrow').reduce((s, e) => s + e.amount, 0)
    return { lent, borrowed }
  }, [allEntries, lendingEntries, isLendingFilter])

  const filtered = useMemo(() => {
    if (activeFilter === 'lending') return []
    if (activeFilter === 'all') return transactions
    if (activeFilter === 'income') return transactions.filter(t => t.type === 'income')
    if (activeFilter === 'flagged') return transactions.filter(t => t.isFlagged)
    if (activeFilter === 'savings') return transactions.filter(t => savingsBucketIds.has(t.bucketId))
    return transactions.filter(t => t.bucketId === activeFilter)
  }, [transactions, activeFilter, savingsBucketIds])

  const sections = useMemo(() => {
    const sorted = [...filtered].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    )
    const groups: Record<string, Transaction[]> = {}
    sorted.forEach(t => {
      const key = formatDate(t.date)
      if (!groups[key]) groups[key] = []
      groups[key].push(t)
    })
    return Object.entries(groups).map(([title, data]) => ({ title, data }))
  }, [filtered])

  // Summary numbers
  const totalIncome = useMemo(
    () => transactions.filter(t => t.type === 'income' && !t.isRecurringDraft).reduce((s, t) => s + t.amount, 0),
    [transactions],
  )
  const totalSpent = useMemo(
    () => transactions
      .filter(t => t.type === 'expense' && !t.isFlagged && !t.isRecurringDraft)
      .reduce((s, t) => s + t.amount + t.feeAmount, 0),
    [transactions],
  )
  const currentFees = useMemo(
    () => transactions
      .filter(t => t.type === 'expense' && !t.isFlagged && !t.isRecurringDraft)
      .reduce((s, t) => s + t.feeAmount, 0),
    [transactions],
  )
  const net = totalIncome - totalSpent

  // Chart data — includes limit for threshold coloring
  const spendingByBucket = useMemo(() => {
    return spendingBuckets.map(b => ({
      label: b.name,
      value: transactions
        .filter(t => t.bucketId === b.id && !t.isFlagged && !t.isRecurringDraft && t.type === 'expense')
        .reduce((s, t) => s + t.amount, 0),
      limit: b.monthlyAmount,
      color: b.color,
    }))
  }, [transactions, spendingBuckets])

  const savingsInfo = useMemo(() => {
    return savingsBuckets.map(b => {
      const confirmed = transactions.some(
        t => t.bucketId === b.id && !t.isFlagged && !t.isRecurringDraft
      )
      return {
        label: b.name,
        value: transactions
          .filter(t => t.bucketId === b.id && !t.isFlagged && !t.isRecurringDraft)
          .reduce((s, t) => s + t.amount, 0),
        target: b.monthlyAmount,
        color: b.color,
        confirmed,
      }
    })
  }, [transactions, savingsBuckets])

  const { goals } = useGoalsStore()
  const goalsInfo = useMemo(() => {
    return goals.map(g => {
      const current = allTransactions
        .filter(
          t => g.linkedBucketIds.includes(t.bucketId) && t.type === 'expense',
        )
        .reduce((sum, t) => sum + t.amount, 0)

      return {
        name: g.name,
        current: g.startBalance + current,
        target: g.targetAmount,
        projectedDate: 'Phase 3 goal',
      }
    })
  }, [goals, allTransactions])

  // Trend bars are calendar months (lib/chart-data), so match on the local month key.
  const getMonthDetail = useCallback(
    (monthKey: string) => {
      const rows = allTransactions.filter(t => {
        if (t.type !== 'expense' || t.isFlagged || t.isRecurringDraft) return false
        const d = new Date(t.date)
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === monthKey
      })
      const byBucket = new Map<string, number>()
      rows.forEach(t => byBucket.set(t.bucketId, (byBucket.get(t.bucketId) ?? 0) + t.amount))
      return {
        total: rows.reduce((s, t) => s + t.amount, 0),
        fees: rows.reduce((s, t) => s + t.feeAmount, 0),
        count: rows.length,
        buckets: [...byBucket.entries()]
          .map(([id, value]) => ({
            label: bucketMap.get(id)?.name ?? 'Unknown',
            color: bucketMap.get(id)?.color ?? colors.textMuted,
            value,
          }))
          .sort((a, b) => b.value - a.value),
      }
    },
    [allTransactions, bucketMap],
  )

  const openDetail = useCallback((txn: Transaction) => {
    setSelectedTxn(txn)
    setDetailVisible(true)
  }, [])

  const closeDetail = useCallback(() => {
    setDetailVisible(false)
    setSelectedTxn(null)
  }, [])

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View>
          <Text style={styles.headerTitle}>Ledger</Text>
          {viewMode === 'chart' && (
            <View style={styles.periodToggle}>
              <TouchableOpacity onPress={() => setChartPeriod('month')}>
                <Text style={[styles.periodText, chartPeriod === 'month' && styles.periodTextActive]}>Month</Text>
              </TouchableOpacity>
              <Text style={styles.periodSep}>•</Text>
              <TouchableOpacity onPress={() => setChartPeriod('year')}>
                <Text style={[styles.periodText, chartPeriod === 'year' && styles.periodTextActive]}>Year</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        <TouchableOpacity
          onPress={() => setViewMode(v => v === 'list' ? 'chart' : 'list')}
          hitSlop={12}
        >
          <Ionicons
            name={viewMode === 'list' ? 'bar-chart-outline' : 'list-outline'}
            size={22}
            color={colors.textPrimary}
          />
        </TouchableOpacity>
      </View>

      {/* Period stepper */}
      {!isLendingFilter && (
        <View style={styles.periodRow}>
          <TouchableOpacity
            style={[styles.periodArrow, !hasOlderPeriods && styles.periodArrowDisabled]}
            disabled={!hasOlderPeriods}
            hitSlop={10}
            onPress={() => setPeriodOffset(o => o + 1)}
          >
            <Ionicons name="chevron-back" size={16} color={colors.textSecond} />
          </TouchableOpacity>
          <View style={styles.periodLabelCol}>
            <Text style={styles.periodRangeText}>
              {formatDate(period.start)} – {formatDate(period.end)}
            </Text>
            <Text style={styles.periodCaption}>
              {periodOffset === 0
                ? 'This period'
                : `${periodOffset} period${periodOffset > 1 ? 's' : ''} ago`}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.periodArrow, periodOffset === 0 && styles.periodArrowDisabled]}
            disabled={periodOffset === 0}
            hitSlop={10}
            onPress={() => setPeriodOffset(o => Math.max(0, o - 1))}
          >
            <Ionicons name="chevron-forward" size={16} color={colors.textSecond} />
          </TouchableOpacity>
        </View>
      )}

      {/* Filter chips */}
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          style={styles.filterScroll}
          decelerationRate="fast"
          snapToAlignment="start"
        >
          {filters.map(f => {
            const active = activeFilter === f.key
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setActiveFilter(active ? 'all' : f.key)}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>

      {/* Summary row */}
      {!isLendingFilter ? (
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: colors.green }]}>{formatNPRShort(totalIncome)}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Income</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: colors.red }]}>{formatNPRShort(totalSpent)}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Spent</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: net >= 0 ? colors.green : colors.red }]}>
            {net < 0 ? '-' : ''}{formatNPRShort(Math.abs(net))}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Net</Text>
        </View>
      </View>
      ) : (
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: colors.purple }]}>{formatNPRShort(lendingSummary.lent)}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Lent</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: colors.amber }]}>{formatNPRShort(lendingSummary.borrowed)}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Borrowed</Text>
        </View>
      </View>
      )}

      {/* Content */}
      {(viewMode === 'list' || isLendingFilter) ? (
        isLendingFilter ? (
        <SectionList
          sections={lendingSections}
          keyExtractor={item => item.id}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>{section.title}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <LendingRow
              entry={item}
              personName={contactMap.get(item.contactId) ?? 'Unknown'}
              onPress={() => setSelectedLendingEntry(item)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No lend/borrow entries yet</Text>
            </View>
          }
          contentContainerStyle={[
            styles.listContent,
            lendingSections.length === 0 && { flex: 1 },
          ]}
          stickySectionHeadersEnabled={false}
        />
        ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => item.id}
          contentInsetAdjustmentBehavior="automatic"
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>{section.title}</Text>
            </View>
          )}
          renderItem={({ item }) => {
            const bucket = bucketMap.get(item.bucketId)
            return (
              <TransactionRow
                transaction={item}
                bucketName={bucket?.name ?? 'Unknown'}
                bucketColor={bucket?.color ?? colors.textMuted}
                onPress={() => openDetail(item)}
              />
            )
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No transactions yet</Text>
            </View>
          }
          contentContainerStyle={[
            styles.listContent,
            sections.length === 0 && { flex: 1 }
          ]}
          stickySectionHeadersEnabled={false}
        />
        )
      ) : (
        <ScrollView 
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <ChartsView
            spendingByBucket={spendingByBucket}
            savingsByBucket={savingsInfo}
            goals={goalsInfo}
            currentFees={currentFees}
            period={chartPeriod}
            getMonthDetail={getMonthDetail}
          />
        </ScrollView>
      )}

      {/* Detail sheet */}
      <TransactionDetailSheet
        transaction={selectedTxn}
        visible={detailVisible}
        onClose={closeDetail}
      />
      <LendingEntrySheet
        visible={selectedLendingEntry !== null}
        entry={selectedLendingEntry}
        personName={
          selectedLendingEntry
            ? contactMap.get(selectedLendingEntry.contactId) ?? 'Unknown'
            : ''
        }
        onSave={updateEntry}
        onDelete={deleteEntry}
        onClose={() => setSelectedLendingEntry(null)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.pageBg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 64, // Standardized header height
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderCurve: 'continuous',
  },
  periodArrow: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodArrowDisabled: {
    opacity: 0.25,
  },
  periodLabelCol: {
    alignItems: 'center',
  },
  periodRangeText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  periodCaption: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    marginTop: 1,
  },
  filterScroll: {
    flexGrow: 0,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 16, // Extra bottom padding to prevent border clipping
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderCurve: 'continuous',
  },
  filterChipActive: {
    backgroundColor: colors.green + '15',
    borderColor: colors.green,
  },
  filterChipText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: colors.textSecond,
  },
  filterChipTextActive: {
    color: colors.green,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 4, // Space from filters
    marginBottom: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderCurve: 'continuous',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },
  summaryLabel: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  summaryValue: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    fontVariant: ['tabular-nums'],
  },
  periodToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  periodText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textMuted,
  },
  periodTextActive: {
    color: colors.green,
  },
  periodSep: {
    fontSize: 12,
    color: colors.textMuted,
    marginHorizontal: 6,
  },
  listContent: {
    paddingBottom: 40,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: colors.pageBg,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textSecond,
    letterSpacing: 0.2,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
  },
})
