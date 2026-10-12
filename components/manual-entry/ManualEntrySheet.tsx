import { useState, useRef, useEffect } from 'react'
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
  KeyboardAvoidingView,
  Alert,
  BackHandler,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import DateTimePicker from '@react-native-community/datetimepicker'
import { colors } from '@/constants/colors'
import { formatNPR, formatDate } from '@/lib/format'
import { categorize } from '@/lib/categorize'
import { useBucketsStore } from '@/store/buckets'
import { usePlaybookStore } from '@/store/playbook'
import { useTransactionsStore, INCOME_BUCKET_ID } from '@/store/transactions'
import { useLendingStore } from '@/store/lending'
import { LendBorrowForm } from '@/components/lending/LendBorrowForm'

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

  const { getSpendingBuckets, getSavingsBuckets, keywordMappings, sureShotMerchants, buckets } =
    useBucketsStore()
  const { fallbackBucketId } = usePlaybookStore()
  const { addTransaction } = useTransactionsStore()
  const { addEntry: addLendEntry } = useLendingStore()

  const spendingBuckets = getSpendingBuckets()
  const savingsBuckets = getSavingsBuckets()
  const allBuckets = [...spendingBuckets, ...savingsBuckets]

  const [amount, setAmount] = useState('')
  const [entryType, setEntryType] = useState<EntryType>('expense')
  const isIncome = entryType === 'income'
  const isLendBorrow = entryType === 'lend_borrow'
  const [selectedBucketId, setSelectedBucketId] = useState<string | null>(null)
  const [fundedFromBucketId, setFundedFromBucketId] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [merchant, setMerchant] = useState('')
  const [remarks, setRemarks] = useState('')
  const [date, setDate] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [isRecurring, setIsRecurring] = useState(false)
  const [saving, setSaving] = useState(false)

  const selectedBucket = allBuckets.find(b => b.id === selectedBucketId)
  const isSavingsDestination =
    !!selectedBucket && (selectedBucket.type === 'savings' || selectedBucket.type === 'investment')
  const fundedFromOptions = spendingBuckets.filter(b => b.id !== selectedBucketId)

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
    setEntryType('expense')
    setSelectedBucketId(null)
    setFundedFromBucketId(null)
    setDescription('')
    setMerchant('')
    setRemarks('')
    setDate(new Date())
    setShowDatePicker(false)
    setIsRecurring(false)
    setSaving(false)
    setTimeout(() => amountRef.current?.focus(), 100)
  }, [visible])

  const parsedAmount = parseFloat(amount.replace(/,/g, '')) || 0
  const canSave = parsedAmount > 0 && (isIncome || selectedBucketId !== null)

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
          bucketId: INCOME_BUCKET_ID,
          date: date.toISOString(),
          source: 'manual',
          remarks: remarks.trim() || null,
          fundedFromBucketId: null,
          parsedTxnId: null,
          isFlagged: false,
          isRecurringDraft: isRecurring,
        })
      } else {
        const destBucket = allBuckets.find(b => b.id === selectedBucketId)
        const isSavingsDest =
          !!destBucket && (destBucket.type === 'savings' || destBucket.type === 'investment')

        let finalBucketId = selectedBucketId
        let finalFlagged = false
        let txnRemarks: string | null = remarks.trim() || null
        let fundedFrom: string | null = null

        if (isSavingsDest && selectedBucketId) {
          finalBucketId = selectedBucketId
          txnRemarks = '__savings_confirm__'
          fundedFrom = fundedFromBucketId
        } else {
          const result = categorize({
            description: description.trim() || null,
            remarks: remarks.trim() || null,
            merchant: merchant.trim() || null,
            keywords: keywordMappings.map(k => ({ keyword: k.keyword, bucketId: k.bucketId })),
            sureShotMerchants: sureShotMerchants.map(m => ({
              merchantName: m.merchantName,
              bucketId: m.bucketId,
            })),
            fallbackBucketId: fallbackBucketId ?? allBuckets[0]?.id ?? '',
          })
          finalBucketId = selectedBucketId ?? result.bucketId
          finalFlagged = selectedBucketId ? false : result.isFlagged
        }

        const { overspent } = await addTransaction({
          type: 'expense',
          amount: parsedAmount,
          description: description.trim() || null,
          merchant: merchant.trim() || (isSavingsDest ? destBucket?.name ?? null : null),
          bucketId: finalBucketId!,
          date: date.toISOString(),
          source: 'manual',
          remarks: txnRemarks,
          fundedFromBucketId: fundedFrom,
          parsedTxnId: null,
          isFlagged: finalFlagged,
          isRecurringDraft: isRecurring,
        })

        const overspendBucket = fundedFrom
          ? buckets.find(b => b.id === fundedFrom)
          : buckets.find(b => b.id === finalBucketId)
        if (overspent && overspendBucket?.accumulates) {
          Alert.alert(
            'Personal fund empty',
            `Personal fund empty — NPR ${formatNPR(overspent)} overspent.`,
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

        <KeyboardAvoidingView
          style={styles.body}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
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
                  <Text style={[styles.currencyLabel, isIncome && { color: colors.green }]}>NPR</Text>
                  <TextInput
                    ref={amountRef}
                    style={[styles.amountInput, isIncome && { color: colors.green }]}
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    returnKeyType="done"
                    onSubmitEditing={() => Keyboard.dismiss()}
                  />
                </View>

                {!isIncome && (
                  <View style={styles.section}>
                    <Text style={styles.label}>Bucket</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.chipRow}
                    >
                      {allBuckets.map(bucket => {
                        const selected = selectedBucketId === bucket.id
                        return (
                          <TouchableOpacity
                            key={bucket.id}
                            style={[
                              styles.bucketChip,
                              selected && {
                                backgroundColor: bucket.color + '22',
                                borderColor: bucket.color,
                              },
                            ]}
                            onPress={() => {
                              Keyboard.dismiss()
                              const next = selected ? null : bucket.id
                              setSelectedBucketId(next)
                              const nextBucket = allBuckets.find(b => b.id === next)
                              const stillSavings =
                                !!nextBucket &&
                                (nextBucket.type === 'savings' || nextBucket.type === 'investment')
                              if (!stillSavings) setFundedFromBucketId(null)
                            }}
                          >
                            <Text style={{ fontSize: 14, marginRight: 4 }}>{bucket.icon}</Text>
                            <Text
                              style={[
                                styles.bucketChipText,
                                selected && { color: bucket.color },
                              ]}
                            >
                              {bucket.name}
                            </Text>
                          </TouchableOpacity>
                        )
                      })}
                    </ScrollView>
                  </View>
                )}

                {isSavingsDestination && (
                  <View style={styles.section}>
                    <Text style={styles.label}>Funded from (optional)</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.chipRow}
                    >
                      {fundedFromOptions.map(bucket => {
                        const selected = fundedFromBucketId === bucket.id
                        return (
                          <TouchableOpacity
                            key={bucket.id}
                            style={[
                              styles.bucketChip,
                              selected && {
                                backgroundColor: bucket.color + '22',
                                borderColor: bucket.color,
                              },
                            ]}
                            onPress={() =>
                              setFundedFromBucketId(selected ? null : bucket.id)
                            }
                          >
                            <Text style={{ fontSize: 14, marginRight: 4 }}>{bucket.icon}</Text>
                            <Text
                              style={[
                                styles.bucketChipText,
                                selected && { color: bucket.color },
                              ]}
                            >
                              {bucket.name}
                            </Text>
                          </TouchableOpacity>
                        )
                      })}
                    </ScrollView>
                    <Text style={styles.fundedHint}>
                      Uses that ceiling or Personal balance; destination still gets the
                      contribution.
                    </Text>
                  </View>
                )}

                <View style={styles.section}>
                  <Text style={styles.label}>Description</Text>
                  <TextInput
                    style={styles.textInput}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="e.g. Outing with friends, momo"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                <View style={styles.section}>
                  <Text style={styles.label}>Merchant (optional)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={merchant}
                    onChangeText={setMerchant}
                    placeholder="e.g. Bhat-Bhateni, NTC"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                {!isSavingsDestination && (
                  <View style={styles.section}>
                    <Text style={styles.label}>Notes (optional)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={remarks}
                      onChangeText={setRemarks}
                      placeholder="Anything else to remember"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                )}

                <View style={styles.section}>
                  <Text style={styles.label}>Date</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowDatePicker(true)}
                  >
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
          </ScrollView>

          {!isLendBorrow && (
            <View style={[styles.footer, { paddingBottom: footerBottomPad }]}>
              <TouchableOpacity
                style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={!canSave || saving}
                activeOpacity={0.8}
              >
                <Text style={styles.saveButtonText}>
                  {saving ? 'Saving...' : isIncome ? 'Add income' : 'Add expense'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAvoidingView>
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
