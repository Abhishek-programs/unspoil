import { useState, useRef, useEffect } from 'react'
import { CurrencyPrefix } from '@/components/ui/CurrencyPrefix'
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
import { KeyboardForm } from '@/components/ui/KeyboardForm'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import DateTimePicker from '@react-native-community/datetimepicker'
import { colors } from '@/constants/colors'
import { formatDate, formatMoney, formatNPRShort } from '@/lib/format'
import { useBucketsStore } from '@/store/buckets'
import { usePlaybookStore } from '@/store/playbook'
import { IncomePutBackChips } from '@/components/transactions/IncomePutBackChips'
import { useTransactionsStore, INCOME_BUCKET_ID } from '@/store/transactions'
import { useLendingStore } from '@/store/lending'
import { LendBorrowForm } from '@/components/lending/LendBorrowForm'
import { useAccountsStore } from '@/store/accounts'
import { BANK_ACCOUNT_ID, defaultAccountId } from '@/constants/accounts'
import {
  EF_BUCKET_ID,
  PERSONAL_BUCKET_ID,
  SHARES_BUCKET_ID,
  SIP_BUCKET_ID,
} from '@/constants/defaults'
import { useGoalsStore, type Goal } from '@/store/goals'
import { getGoalCurrent } from '@/lib/goals/completion'
import { UseGoalSavingsSheet, canUseGoalSavings } from '@/components/goals/UseGoalSavingsSheet'
import { BucketGrid, type BucketTile } from '@/components/manual-entry/BucketGrid'
import { usePulseData } from '@/hooks/usePulseData'
import {
  GOAL_PURCHASE_BUCKET_ID,
  GOAL_SAVINGS_ACCOUNT_ID,
  MY_MONEY_BUCKET_ID,
  isPaidFromSavings,
  withdrawnFromBuckets,
} from '@/lib/txn-kind'
import { effectiveCap } from '@/lib/bucket-balance'

const SAVE_BUTTON_HEIGHT = 56
const FOOTER_PAD_TOP = 16

type EntryType = 'expense' | 'income' | 'lend_borrow'

interface ManualEntrySheetProps {
  visible: boolean
  onClose: () => void
}

export function ManualEntrySheet({ visible, onClose }: ManualEntrySheetProps) {
  const amountRef = useRef<TextInput>(null)
  const insets = useSafeAreaInsets()

  const { getSpendingBuckets, getSavingsBuckets, buckets } = useBucketsStore()
  const { startPersonalRecovery } = usePlaybookStore()
  const { addTransaction, allTransactions } = useTransactionsStore()
  const { goals } = useGoalsStore()
  const [goalSpend, setGoalSpend] = useState<{ goal: Goal; price: number } | null>(null)
  const { addEntry: addLendEntry } = useLendingStore()
  const { accounts: moneyAccounts } = useAccountsStore()

  const spendingBuckets = getSpendingBuckets()
  const savingsBuckets = getSavingsBuckets()
  const allBuckets = [...spendingBuckets, ...savingsBuckets]

  const [amount, setAmount] = useState('')
  const [feeAmount, setFeeAmount] = useState('')
  const [showFee, setShowFee] = useState(false)
  const [entryType, setEntryType] = useState<EntryType>('expense')
  const isIncome = entryType === 'income'
  const isLendBorrow = entryType === 'lend_borrow'
  const [selectedBucketId, setSelectedBucketId] = useState<string | null>(null)
  // Savings bucket picked in the second section. With a spend bucket selected it is a
  // contribution funded from that bucket; alone it means spending out of that saving.
  const [savingsBucketId, setSavingsBucketId] = useState<string | null>(null)
  const [showSavings, setShowSavings] = useState(false)
  const [accountId, setAccountId] = useState(defaultAccountId())
  const [description, setDescription] = useState('')
  const [merchant, setMerchant] = useState('')
  const [date, setDate] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [isRecurring, setIsRecurring] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  const { yourMoney, stillInBank, spentByBucket, bucketBalances, efValue, sipInvested, sharesInvested } =
    usePulseData()
  const periodTransactions = useTransactionsStore(s => s.transactions)

  // Most-used buckets first, so the usual pick is always in the top row.
  const useCount = new Map<string, number>()
  allTransactions.forEach(t => useCount.set(t.bucketId, (useCount.get(t.bucketId) ?? 0) + 1))
  const byUse = <T extends { id: string }>(list: T[]) =>
    [...list].sort((a, b) => (useCount.get(b.id) ?? 0) - (useCount.get(a.id) ?? 0))

  const spendTiles: BucketTile[] = byUse(spendingBuckets).map(b => {
    const left = b.accumulates
      ? (bucketBalances[b.id] ?? 0)
      : b.monthlyAmount - (spentByBucket[b.id] ?? 0)
    const full = b.accumulates
      ? Math.max(effectiveCap(b) ?? b.monthlyAmount, left)
      : b.monthlyAmount
    return {
      id: b.id,
      name: b.name,
      icon: b.icon,
      color: b.color,
      left,
      fraction: full > 0 ? left / full : 0,
    }
  })
  // Catch-all: money on you that no bucket (and no unconfirmed saving) has a claim on.
  spendTiles.push({
    id: MY_MONEY_BUCKET_ID,
    name: 'My money',
    icon: '👛',
    color: colors.textMuted,
    left: Math.max(
      0,
      yourMoney - stillInBank - spendTiles.reduce((sum, t) => sum + Math.max(0, t.left), 0),
    ),
    fraction: 1,
    plain: true,
  })

  const savedIn = (b: { id: string }): number => {
    if (b.id === EF_BUCKET_ID) return efValue
    if (b.id === SIP_BUCKET_ID) return sipInvested
    if (b.id === SHARES_BUCKET_ID) return sharesInvested
    const goal = goals.find(g => g.linkedBucketIds.includes(b.id))
    if (goal && goal.linkedBucketIds.length === 1) return getGoalCurrent(goal, allTransactions)
    return (
      allTransactions
        .filter(t => t.bucketId === b.id && t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0) - withdrawnFromBuckets([b.id], allTransactions)
    )
  }
  const savingsTiles: BucketTile[] = byUse(savingsBuckets).map(b => {
    const confirmed = periodTransactions
      .filter(
        t =>
          t.bucketId === b.id &&
          t.type === 'expense' &&
          !t.isFlagged &&
          !t.isRecurringDraft &&
          !isPaidFromSavings(t),
      )
      .reduce((sum, t) => sum + t.amount, 0)
    const saved = savedIn(b)
    return {
      id: b.id,
      name: b.name,
      icon: b.icon,
      color: b.color,
      left: saved,
      // Fills up as this month's contribution is confirmed.
      fraction: b.monthlyAmount > 0 ? confirmed / b.monthlyAmount : 0,
      caption: `${formatNPRShort(saved)} saved`,
      neverEmpty: true,
    }
  })

  const savingsBucket = savingsBuckets.find(b => b.id === savingsBucketId)
  const spendBucket = spendingBuckets.find(b => b.id === selectedBucketId)
  const spendName = spendBucket?.name ?? (selectedBucketId === MY_MONEY_BUCKET_ID ? 'My money' : null)
  const isContribution = !isIncome && !!savingsBucket && !!selectedBucketId
  const isSavingsSpend = !isIncome && !!savingsBucket && !selectedBucketId
  const savingsSpendGoal = isSavingsSpend
    ? goals.find(
        g => g.isEnabled && canUseGoalSavings(g) && g.linkedBucketIds.includes(savingsBucket!.id),
      )
    : undefined

  const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const daysAgo = Math.round((dayStart(new Date()) - dayStart(date)) / 86400000)


  const footerBottomPad = Math.max(insets.bottom, 16)

  useEffect(() => {
    if (!visible) return
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose()
      return true
    })
    return () => sub.remove()
  }, [visible, onClose])

  useEffect(() => {
    if (!visible) return
    setAmount('')
    setFeeAmount('')
    setShowFee(false)
    setEntryType('expense')
    setSelectedBucketId(null)
    setSavingsBucketId(null)
    setShowSavings(false)
    setAccountId(defaultAccountId())
    setDescription('')
    setMerchant('')
    setDate(new Date())
    setShowDatePicker(false)
    setIsRecurring(false)
    setSaving(false)
    setShowDetails(false)
    setTimeout(() => amountRef.current?.focus(), 100)
  }, [visible])

  const parsedAmount = Math.round((parseFloat(amount.replace(/,/g, '')) || 0) * 1000) / 1000
  const parsedFee = Math.round((parseFloat(feeAmount.replace(/,/g, '')) || 0) * 100) / 100
  const canSave =
    parsedAmount > 0 && (isIncome || selectedBucketId !== null || savingsBucketId !== null)

  const detailsSummary = [
    moneyAccounts.find(a => a.id === accountId)?.name ?? 'Bank',
    daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : formatDate(date),
    merchant.trim() ? 'Note' : null,
    isRecurring ? 'Recurring' : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const handleSave = async () => {
    if (!canSave || saving) return
    setSaving(true)
    Keyboard.dismiss()

    try {
      if (isIncome) {
        await addTransaction({
          type: 'income',
          amount: parsedAmount,
          description: description.trim() || null,
          merchant: merchant.trim() || null,
          bucketId: selectedBucketId ?? INCOME_BUCKET_ID,
          date: date.toISOString(),
          source: 'manual',
          fundedFromBucketId: null,
          accountId,
          parsedTxnId: null,
          isFlagged: false,
          isRecurringDraft: isRecurring,
        })
      } else {
        // Spend bucket only → plain expense. Spend + savings → contribution funded from
        // that bucket (My money = from general money). Savings only → paid out of that saving.
        const fundedFrom = isContribution
          ? selectedBucketId === MY_MONEY_BUCKET_ID
            ? null
            : selectedBucketId
          : isSavingsSpend
            ? savingsBucket!.id
            : null
        const finalBucketId = isContribution
          ? savingsBucket!.id
          : isSavingsSpend
            ? GOAL_PURCHASE_BUCKET_ID
            : selectedBucketId

        const { overspent } = await addTransaction({
          type: 'expense',
          amount: parsedAmount,
          feeAmount: isSavingsSpend ? 0 : parsedFee,
          description: description.trim() || null,
          merchant: merchant.trim() || (isContribution ? savingsBucket!.name : null),
          bucketId: finalBucketId!,
          date: date.toISOString(),
          source: 'manual',
          fundedFromBucketId: fundedFrom,
          accountId: isSavingsSpend ? GOAL_SAVINGS_ACCOUNT_ID : accountId,
          parsedTxnId: null,
          isFlagged: false,
          isRecurringDraft: isSavingsSpend ? false : isRecurring,
        })

        const overspendBucket = isSavingsSpend
          ? undefined
          : buckets.find(b => b.id === (fundedFrom ?? finalBucketId))
        if (overspent && overspendBucket?.accumulates) {
          if (overspendBucket.id === PERSONAL_BUCKET_ID) {
            await startPersonalRecovery(overspent, overspendBucket.monthlyAmount)
          }
          Alert.alert(
            'Personal fund empty',
            `Personal fund empty — ${formatMoney(overspent)} from Your money. Top-up drops to ${formatMoney(1000)}/mo until recovered.`,
          )
        }
      }
      onClose()
    } catch (e) {
      console.error('Failed to save transaction:', e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
    <UseGoalSavingsSheet
      goal={goalSpend?.goal ?? null}
      visible={!!goalSpend}
      initialPrice={goalSpend?.price}
      onClose={() => setGoalSpend(null)}
    />
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add transaction</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.body}>
          <KeyboardForm
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            footerKeyboardTuck={insets.bottom}
            footer={
              !isLendBorrow && (
                <View style={[styles.footer, { paddingBottom: footerBottomPad }]}>
                  {!isIncome && selectedBucketId === MY_MONEY_BUCKET_ID && !savingsBucket && (
                    <View style={styles.myMoneyWarning}>
                      <Ionicons name="alert-circle-outline" size={16} color={colors.amber} />
                      <Text style={styles.myMoneyWarningText}>
                        Outside your buckets. Better to pick one so your ceilings stay true.
                      </Text>
                    </View>
                  )}
                  {isSavingsSpend && (
                    <View style={styles.myMoneyWarning}>
                      <Ionicons name="alert-circle-outline" size={16} color={colors.amber} />
                      <Text style={styles.myMoneyWarningText}>
                        Spending from {savingsBucket!.name} savings ({formatMoney(savedIn(savingsBucket!))}{' '}
                        saved). It lowers that saving, not Your money.
                        {savingsSpendGoal ? ' Bought the goal? ' : ''}
                        {savingsSpendGoal && (
                          <Text
                            style={styles.myMoneyWarningLink}
                            onPress={() => {
                              Keyboard.dismiss()
                              onClose()
                              setGoalSpend({ goal: savingsSpendGoal, price: parsedAmount })
                            }}
                          >
                            Complete it instead
                          </Text>
                        )}
                      </Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
                    onPress={handleSave}
                    disabled={!canSave || saving}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.saveButtonText}>
                      {saving
                        ? 'Saving...'
                        : isIncome
                          ? 'Add income'
                          : isContribution
                            ? `Contribute to ${savingsBucket!.name}`
                            : isSavingsSpend
                              ? `Spend from ${savingsBucket!.name}`
                              : 'Add expense'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )
            }
          >
            <View style={styles.typeToggle}>
              <TouchableOpacity
                style={[styles.typeButton, entryType === 'expense' && styles.typeButtonActive]}
                onPress={() => {
                  setEntryType('expense')
                  Keyboard.dismiss()
                }}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    entryType === 'expense' && styles.typeButtonTextActive,
                  ]}
                >
                  Expense
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeButton, entryType === 'income' && styles.typeButtonActiveIncome]}
                onPress={() => {
                  setEntryType('income')
                  if (!spendingBuckets.some(b => b.id === selectedBucketId)) {
                    setSelectedBucketId(null)
                  }
                  setSavingsBucketId(null)
                  Keyboard.dismiss()
                }}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    entryType === 'income' && styles.typeButtonTextActiveIncome,
                  ]}
                >
                  Income
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  entryType === 'lend_borrow' && styles.typeButtonActiveLend,
                ]}
                onPress={() => {
                  setEntryType('lend_borrow')
                  Keyboard.dismiss()
                }}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    entryType === 'lend_borrow' && styles.typeButtonTextActiveLend,
                  ]}
                >
                  Lend/Borrow
                </Text>
              </TouchableOpacity>
            </View>

            {isLendBorrow ? (
              <LendBorrowForm
                submitLabel="Add entry"
                onSubmit={async data => {
                  await addLendEntry({
                    contactId: data.contactId,
                    type: data.direction,
                    amount: data.amount,
                    note: data.note,
                    date: data.date,
                  })
                  onClose()
                }}
              />
            ) : (
              <>
                <View style={styles.amountContainer}>
                  <CurrencyPrefix style={[styles.currencyLabel, isIncome && { color: colors.green }]} />
                  <TextInput
                    ref={amountRef}
                    style={[styles.amountInput, isIncome && { color: colors.green }]}
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                    onSubmitEditing={() => Keyboard.dismiss()}
                  />
                  {!isIncome && (
                    <TouchableOpacity
                      style={[styles.feeChip, showFee && styles.feeChipActive]}
                      onPress={() => setShowFee(v => !v)}
                    >
                      <Text style={[styles.feeChipText, showFee && styles.feeChipTextActive]}>
                        + Fee
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                {!isIncome && showFee && (
                  <View style={styles.feeInputRow}>
                    <Text style={styles.feePrefix}>Fee <CurrencyPrefix /></Text>
                    <TextInput
                      style={styles.feeInput}
                      value={feeAmount}
                      onChangeText={setFeeAmount}
                      placeholder="0"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="decimal-pad"
                    />
                  </View>
                )}

                {isIncome && (
                  <View style={styles.section}>
                    <Text style={styles.label}>Put back into (optional)</Text>
                    <IncomePutBackChips
                      spendingBuckets={spendingBuckets}
                      selectedBucketId={selectedBucketId}
                      onChange={setSelectedBucketId}
                    />
                  </View>
                )}

                {!isIncome && (
                  <View style={styles.section}>
                    <Text style={styles.label}>Spend bucket</Text>
                    <BucketGrid
                      tiles={spendTiles}
                      selectedId={selectedBucketId}
                      onSelect={next => {
                        Keyboard.dismiss()
                        setSelectedBucketId(next)
                      }}
                    />

                    <TouchableOpacity
                      style={styles.savingsToggle}
                      activeOpacity={0.7}
                      onPress={() => {
                        Keyboard.dismiss()
                        setShowSavings(v => !v)
                      }}
                    >
                      <Text style={styles.label}>
                        {savingsBucket
                          ? `Savings · ${savingsBucket.name}`
                          : spendName
                            ? `Contribute from ${spendName} to savings`
                            : 'Savings & investments'}
                      </Text>
                      <Ionicons
                        name={showSavings ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color={colors.textMuted}
                      />
                    </TouchableOpacity>
                    {showSavings && (
                      <>
                        <BucketGrid
                          tiles={savingsTiles}
                          selectedId={savingsBucketId}
                          onSelect={next => {
                            Keyboard.dismiss()
                            setSavingsBucketId(next)
                          }}
                        />
                        <Text style={styles.fundedHint}>
                          {spendName
                            ? `Adds to the saving and uses ${spendName}.`
                            : 'No spend bucket picked: this spends out of the saving itself.'}
                        </Text>
                      </>
                    )}
                  </View>
                )}

                <View style={styles.section}>
                  <Text style={styles.label}>Title</Text>
                  <TextInput
                    style={styles.textInput}
                    value={description}
                    onChangeText={setDescription}
                    placeholder={isIncome ? 'e.g. Ankeet share, leftover' : 'e.g. Outing with friends, momo'}
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                <TouchableOpacity
                  style={styles.detailsRow}
                  activeOpacity={0.7}
                  onPress={() => {
                    Keyboard.dismiss()
                    setShowDetails(v => !v)
                  }}
                >
                  <Text style={styles.detailsSummary} numberOfLines={1}>
                    {detailsSummary}
                  </Text>
                  <Ionicons
                    name={showDetails ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>

                {showDetails && (
                  <>

                <View style={styles.section}>
                  <Text style={styles.label}>
                    {isIncome ? 'Lands in' : 'Paid from'}
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipRow}
                  >
                    {(moneyAccounts.length > 0
                      ? moneyAccounts
                      : [
                          { id: BANK_ACCOUNT_ID, name: 'Bank' },
                          { id: 'esewa', name: 'eSewa' },
                          { id: 'cash', name: 'Cash' },
                        ]
                    ).map(acc => {
                      const selected = accountId === acc.id
                      return (
                        <TouchableOpacity
                          key={acc.id}
                          style={[
                            styles.bucketChip,
                            selected && {
                              backgroundColor: colors.greenFill,
                              borderColor: colors.green,
                            },
                          ]}
                          onPress={() => {
                            Keyboard.dismiss()
                            setAccountId(acc.id)
                          }}
                        >
                          <Text
                            style={[
                              styles.bucketChipText,
                              selected && { color: colors.green },
                            ]}
                          >
                            {acc.name}
                          </Text>
                        </TouchableOpacity>
                      )
                    })}
                  </ScrollView>
                </View>

                <View style={styles.section}>
                  <Text style={styles.label}>Date</Text>
                  <View style={styles.chipRow}>
                    {[
                      { key: 'today', label: 'Today', on: daysAgo === 0, pick: () => setDate(new Date()) },
                      {
                        key: 'yesterday',
                        label: 'Yesterday',
                        on: daysAgo === 1,
                        pick: () => setDate(new Date(Date.now() - 86400000)),
                      },
                      {
                        key: 'pick',
                        label: daysAgo > 1 ? formatDate(date) : 'Pick',
                        on: daysAgo > 1,
                        pick: () => setShowDatePicker(true),
                      },
                    ].map(d => (
                      <TouchableOpacity
                        key={d.key}
                        style={[
                          styles.bucketChip,
                          d.on && { backgroundColor: colors.greenFill, borderColor: colors.green },
                        ]}
                        onPress={() => {
                          Keyboard.dismiss()
                          d.pick()
                        }}
                      >
                        <Text style={[styles.bucketChipText, d.on && { color: colors.green }]}>
                          {d.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
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

                <View style={styles.section}>
                  <Text style={styles.label}>Description (optional)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={merchant}
                    onChangeText={setMerchant}
                    placeholder="Extra detail if you want"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                <TouchableOpacity
                  style={styles.toggleRow}
                  onPress={() => setIsRecurring(!isRecurring)}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.toggleLabel}>Recurring monthly</Text>
                    <Text style={styles.toggleHint}>Auto-create draft each month</Text>
                  </View>
                  <View style={[styles.toggle, isRecurring && styles.toggleActive]}>
                    <View style={[styles.toggleKnob, isRecurring && styles.toggleKnobActive]} />
                  </View>
                </TouchableOpacity>
                  </>
                )}
              </>
            )}
          </KeyboardForm>
        </View>
      </SafeAreaView>
    </Modal>
    </>
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
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textPrimary,
  },
  body: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  typeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 3,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#FEE2E2',
  },
  typeButtonActiveIncome: {
    backgroundColor: colors.greenFill,
  },
  typeButtonActiveLend: {
    backgroundColor: colors.amberFill,
  },
  typeButtonText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: colors.textMuted,
  },
  typeButtonTextActive: {
    color: colors.red,
    fontFamily: 'Inter_600SemiBold',
  },
  typeButtonTextActiveIncome: {
    color: colors.green,
    fontFamily: 'Inter_600SemiBold',
  },
  typeButtonTextActiveLend: {
    color: colors.amber,
    fontFamily: 'Inter_600SemiBold',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 28,
    gap: 8,
  },
  currencyLabel: {
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textSecond,
  },
  amountInput: {
    fontSize: 48,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
    minWidth: 80,
    textAlign: 'center',
    padding: 0,
  },
  feeChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 5,
    alignSelf: 'center',
  },
  feeChipActive: {
    borderColor: colors.amber,
    backgroundColor: colors.amberFill,
  },
  feeChipText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textMuted,
  },
  feeChipTextActive: {
    color: colors.amber,
  },
  feeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.amber,
    marginTop: -16,
    marginBottom: 24,
  },
  feePrefix: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: colors.textMuted,
  },
  feeInput: {
    minWidth: 72,
    paddingHorizontal: 8,
    paddingVertical: 6,
    textAlign: 'right',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textPrimary,
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
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  bucketChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  bucketChipText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: colors.textSecond,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 20,
  },
  detailsSummary: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: colors.textSecond,
  },
  myMoneyWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.amberFill,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  myMoneyWarningLink: {
    fontFamily: 'Inter_700Bold',
    textDecorationLine: 'underline',
  },
  savingsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  myMoneyWarningText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#92400E',
  },
  goalSavingsChip: {
    borderColor: colors.savingsSetAside,
    backgroundColor: colors.savingsSetAside + '14',
  },
  goalSavingsChipText: {
    color: colors.savingsSetAside,
    fontFamily: 'Inter_600SemiBold',
  },
  fundedHint: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    marginTop: 8,
    lineHeight: 16,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: colors.textPrimary,
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
    fontFamily: 'Inter_400Regular',
    color: colors.textPrimary,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 8,
  },
  toggleLabel: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: colors.textPrimary,
  },
  toggleHint: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    marginTop: 2,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: colors.green,
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  toggleKnobActive: {
    alignSelf: 'flex-end',
  },
  footer: {
    paddingTop: FOOTER_PAD_TOP,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.pageBg,
  },
  saveButton: {
    height: SAVE_BUTTON_HEIGHT,
    backgroundColor: colors.green,
    borderRadius: 14,
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
