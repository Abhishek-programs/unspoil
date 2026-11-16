import { useEffect, useState } from 'react'
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  StyleSheet,
  Keyboard,
  Alert,
  BackHandler,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import DateTimePicker from '@react-native-community/datetimepicker'
import { CurrencyPrefix } from '@/components/ui/CurrencyPrefix'
import { colors } from '@/constants/colors'
import { formatDate, formatMoney } from '@/lib/format'
import { useGoalsStore, type Goal } from '@/store/goals'
import { useBucketsStore } from '@/store/buckets'
import { useAccountsStore } from '@/store/accounts'
import { usePlaybookStore } from '@/store/playbook'
import { useTransactionsStore } from '@/store/transactions'
import { BANK_ACCOUNT_ID } from '@/constants/accounts'
import {
  EF_BUCKET_ID,
  PERSONAL_BUCKET_ID,
  SHARES_BUCKET_ID,
  SIP_BUCKET_ID,
} from '@/constants/defaults'
import { getGoalCurrent } from '@/lib/goals/completion'
import { KEEP_IN_GOAL, YOUR_MONEY, spendGoalSavings } from '@/lib/goals/spend-savings'

const SYSTEM_BUCKET_IDS = [EF_BUCKET_ID, SIP_BUCKET_ID, SHARES_BUCKET_ID]

/** Big-spend goals only — EF, SIP and Shares are not bought or closed this way. */
export function canUseGoalSavings(goal: Pick<Goal, 'linkedBucketIds' | 'completedAt'>): boolean {
  return (
    !goal.completedAt &&
    goal.linkedBucketIds.length > 0 &&
    !goal.linkedBucketIds.some(id => SYSTEM_BUCKET_IDS.includes(id))
  )
}

interface UseGoalSavingsSheetProps {
  goal: Goal | null
  visible: boolean
  initialPrice?: number
  onClose: () => void
  onDone?: () => void
}

export function UseGoalSavingsSheet({
  goal,
  visible,
  initialPrice,
  onClose,
  onDone,
}: UseGoalSavingsSheetProps) {
  const insets = useSafeAreaInsets()
  const { goals } = useGoalsStore()
  const { getSpendingBuckets } = useBucketsStore()
  const { accounts: moneyAccounts } = useAccountsStore()
  const { startPersonalRecovery } = usePlaybookStore()
  const allTransactions = useTransactionsStore(s => s.allTransactions)

  const [price, setPrice] = useState('')
  const [remainderFrom, setRemainderFrom] = useState(YOUR_MONEY)
  const [leftoverTo, setLeftoverTo] = useState(YOUR_MONEY)
  const [walletId, setWalletId] = useState(BANK_ACCOUNT_ID)
  const [date, setDate] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!visible || !goal) return
    setPrice(String(initialPrice && initialPrice > 0 ? initialPrice : goal.targetAmount))
    setRemainderFrom(YOUR_MONEY)
    setLeftoverTo(YOUR_MONEY)
    setWalletId(BANK_ACCOUNT_ID)
    setDate(new Date())
    setShowDatePicker(false)
    setSaving(false)
  }, [visible, goal?.id])

  useEffect(() => {
    if (!visible) return
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose()
      return true
    })
    return () => sub.remove()
  }, [visible, onClose])

  if (!goal) return null

  const saved = Math.max(0, getGoalCurrent(goal, allTransactions))
  const parsedPrice = Math.max(0, Math.round((parseFloat(price.replace(/,/g, '')) || 0) * 100) / 100)
  const fromSavings = Math.min(saved, parsedPrice)
  const remainder = parsedPrice - fromSavings
  const leftover = saved - fromSavings
  const keeps = leftover > 0 && leftoverTo === KEEP_IN_GOAL
  const usesWallet = remainder > 0 || (leftover > 0 && leftoverTo === YOUR_MONEY)
  const canSave = (parsedPrice > 0 || !keeps) && !saving

  const spendingBuckets = getSpendingBuckets()
  const otherGoals = goals.filter(g => g.id !== goal.id && g.isEnabled && canUseGoalSavings(g))
  const wallets =
    moneyAccounts.length > 0
      ? moneyAccounts
      : [
          { id: BANK_ACCOUNT_ID, name: 'Bank' },
          { id: 'esewa', name: 'eSewa' },
          { id: 'cash', name: 'Cash' },
        ]

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    Keyboard.dismiss()
    try {
      const result = await spendGoalSavings({
        goal,
        price: parsedPrice,
        remainderFrom,
        leftoverTo,
        walletId,
        date: date.toISOString(),
      })
      if (result.overspent && result.overspentBucketId === PERSONAL_BUCKET_ID) {
        const personal = spendingBuckets.find(b => b.id === PERSONAL_BUCKET_ID)
        await startPersonalRecovery(result.overspent, personal?.monthlyAmount ?? 0)
        Alert.alert(
          'Personal fund empty',
          `Personal fund empty — ${formatMoney(result.overspent)} from Your money. Top-up drops to ${formatMoney(1000)}/mo until recovered.`,
        )
      } else if (result.completed) {
        Alert.alert(
          'Goal completed',
          `"${goal.name}" is in Completed. ${formatMoney(goal.monthlyContribution)}/mo is free to plan again.`,
        )
      }
      onDone?.()
      onClose()
    } catch (e) {
      console.error('Failed to use goal savings:', e)
    } finally {
      setSaving(false)
    }
  }

  const chip = (
    key: string,
    label: string,
    selected: boolean,
    onPress: () => void,
    icon?: string,
  ) => (
    <TouchableOpacity
      key={key}
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={() => {
        Keyboard.dismiss()
        onPress()
      }}
    >
      {icon ? <Text style={styles.chipIcon}>{icon}</Text> : null}
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  )

  const saveLabel = saving
    ? 'Saving...'
    : keeps
      ? 'Use savings'
      : parsedPrice > 0
        ? 'Buy & complete goal'
        : 'Close goal'

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Use {goal.name} savings
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.priceLabel}>What it cost</Text>
          <View style={styles.amountContainer}>
            <CurrencyPrefix style={styles.currencyLabel} />
            <TextInput
              style={styles.amountInput}
              value={price}
              onChangeText={setPrice}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              returnKeyType="done"
              selectTextOnFocus
            />
          </View>

          <View style={styles.breakdown}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Saved in goal</Text>
              <Text style={styles.breakdownValue}>{formatMoney(saved)}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={[styles.breakdownLabel, styles.tealText]}>From goal savings</Text>
              <Text style={[styles.breakdownValue, styles.tealText]}>{formatMoney(fromSavings)}</Text>
            </View>
            {remainder > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Still to pay</Text>
                <Text style={styles.breakdownValue}>{formatMoney(remainder)}</Text>
              </View>
            )}
            {leftover > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Left in goal</Text>
                <Text style={styles.breakdownValue}>{formatMoney(leftover)}</Text>
              </View>
            )}
          </View>

          {remainder > 0 && (
            <View style={styles.section}>
              <Text style={styles.label}>Pay the rest from</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {chip(YOUR_MONEY, 'Your money', remainderFrom === YOUR_MONEY, () =>
                  setRemainderFrom(YOUR_MONEY),
                )}
                {spendingBuckets.map(b =>
                  chip(b.id, b.name, remainderFrom === b.id, () => setRemainderFrom(b.id), b.icon),
                )}
              </ScrollView>
              <Text style={styles.hint}>
                {remainderFrom === YOUR_MONEY
                  ? 'Leaves Your money without touching any ceiling.'
                  : 'Counts toward that ceiling or Personal balance.'}
              </Text>
            </View>
          )}

          {leftover > 0 && (
            <View style={styles.section}>
              <Text style={styles.label}>Leftover goes to</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {chip(YOUR_MONEY, 'Your money', leftoverTo === YOUR_MONEY, () =>
                  setLeftoverTo(YOUR_MONEY),
                )}
                {otherGoals.map(g =>
                  chip(g.id, g.name, leftoverTo === g.id, () => setLeftoverTo(g.id), '🎯'),
                )}
                {parsedPrice > 0 &&
                  chip(KEEP_IN_GOAL, 'Keep in goal', leftoverTo === KEEP_IN_GOAL, () =>
                    setLeftoverTo(KEEP_IN_GOAL),
                  )}
              </ScrollView>
              <Text style={styles.hint}>
                {keeps
                  ? 'The goal stays open with what is left.'
                  : 'The goal is completed and moved to Completed.'}
              </Text>
            </View>
          )}

          {usesWallet && (
            <View style={styles.section}>
              <Text style={styles.label}>{remainder > 0 ? 'Paid from' : 'Lands in'}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {wallets.map(a => chip(a.id, a.name, walletId === a.id, () => setWalletId(a.id)))}
              </ScrollView>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.label}>Date</Text>
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
              <Ionicons name="calendar-outline" size={18} color={colors.textSecond} />
              <Text style={styles.dateText}>{formatDate(date)}</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display="spinner"
                maximumDate={new Date()}
                onChange={(_, selectedDate) => {
                  setShowDatePicker(Platform.OS === 'ios')
                  if (selectedDate) setDate(selectedDate)
                }}
              />
            )}
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TouchableOpacity
            style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!canSave}
            activeOpacity={0.8}
          >
            <Text style={styles.saveButtonText}>{saveLabel}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textPrimary,
    marginHorizontal: 12,
  },
  scrollContent: {
    padding: 16,
  },
  priceLabel: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 8,
  },
  currencyLabel: {
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textSecond,
  },
  amountInput: {
    fontSize: 44,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
    minWidth: 80,
    textAlign: 'center',
    padding: 0,
  },
  breakdown: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 24,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  breakdownLabel: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: colors.textSecond,
  },
  breakdownValue: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  tealText: {
    color: colors.savingsSetAside,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: colors.textMuted,
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    marginTop: 8,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    backgroundColor: colors.savingsSetAside + '22',
    borderColor: colors.savingsSetAside,
  },
  chipIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  chipText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: colors.textSecond,
  },
  chipTextSelected: {
    color: colors.savingsSetAside,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dateText: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: colors.textPrimary,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.pageBg,
  },
  saveButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.savingsSetAside,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.4,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
})
