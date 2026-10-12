import { useState, useRef, useEffect } from 'react'
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Keyboard,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import DateTimePicker from '@react-native-community/datetimepicker'
import { colors } from '@/constants/colors'
import { formatNPR, formatDate } from '@/lib/format'
import { categorize } from '@/lib/categorize'
import { useBucketsStore, type Bucket } from '@/store/buckets'
import { usePlaybookStore } from '@/store/playbook'
import { useTransactionsStore, INCOME_BUCKET_ID } from '@/store/transactions'

interface ManualEntrySheetProps {
  visible: boolean
  onClose: () => void
}

export function ManualEntrySheet({ visible, onClose }: ManualEntrySheetProps) {
  const amountRef = useRef<TextInput>(null)

  const { getSpendingBuckets, getSavingsBuckets, keywordMappings, sureShotMerchants } = useBucketsStore()
  const { fallbackBucketId } = usePlaybookStore()
  const { addTransaction } = useTransactionsStore()

  const spendingBuckets = getSpendingBuckets()
  const savingsBuckets = getSavingsBuckets()
  const allBuckets = [...spendingBuckets, ...savingsBuckets]

  // Form state
  const [amount, setAmount] = useState('')
  const [isIncome, setIsIncome] = useState(false)
  const [selectedBucketId, setSelectedBucketId] = useState<string | null>(null)
  const [merchant, setMerchant] = useState('')
  const [remarks, setRemarks] = useState('')
  const [date, setDate] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [isRecurring, setIsRecurring] = useState(false)
  const [saving, setSaving] = useState(false)

  // Reset form when sheet opens
  useEffect(() => {
    if (visible) {
      setAmount('')
      setIsIncome(false)
      setSelectedBucketId(null)
      setMerchant('')
      setRemarks('')
      setDate(new Date())
      setShowDatePicker(false)
      setIsRecurring(false)
      setSaving(false)
      setTimeout(() => amountRef.current?.focus(), 300)
    }
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
          merchant: merchant.trim() || null,
          bucketId: INCOME_BUCKET_ID,
          date: date.toISOString(),
          source: 'manual',
          remarks: remarks.trim() || null,
          parsedTxnId: null,
          isFlagged: false,
          isRecurringDraft: isRecurring,
        })
      } else {
        // Run categorization — remarks prefix overrides selected bucket
        const result = categorize({
          remarks: remarks.trim() || null,
          merchant: merchant.trim() || null,
          keywords: keywordMappings.map(k => ({ keyword: k.keyword, bucketId: k.bucketId })),
          sureShotMerchants: sureShotMerchants.map(m => ({ merchantName: m.merchantName, bucketId: m.bucketId })),
          fallbackBucketId: fallbackBucketId ?? allBuckets[0]?.id ?? '',
        })

        // If user explicitly selected a bucket and no remarks prefix override, use their selection
        const hasRemarksPrefix = remarks.trim().startsWith('#')
        const finalBucketId = hasRemarksPrefix ? result.bucketId : (selectedBucketId ?? result.bucketId)
        const finalFlagged = hasRemarksPrefix ? result.isFlagged : (selectedBucketId ? false : result.isFlagged)

        await addTransaction({
          type: 'expense',
          amount: parsedAmount,
          merchant: merchant.trim() || null,
          bucketId: finalBucketId,
          date: date.toISOString(),
          source: 'manual',
          remarks: remarks.trim() || null,
          parsedTxnId: null,
          isFlagged: finalFlagged,
          isRecurringDraft: isRecurring,
        })
      }
      onClose()
    } catch (e) {
      console.error('Failed to save transaction:', e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add transaction</Text>
          <View style={{ width: 24 }} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Amount */}
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
              />
            </View>

            {/* Type toggle */}
            <View style={styles.typeToggle}>
              <TouchableOpacity
                style={[styles.typeButton, !isIncome && styles.typeButtonActive]}
                onPress={() => setIsIncome(false)}
              >
                <Text style={[styles.typeButtonText, !isIncome && styles.typeButtonTextActive]}>
                  Expense
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeButton, isIncome && styles.typeButtonActiveIncome]}
                onPress={() => setIsIncome(true)}
              >
                <Text style={[styles.typeButtonText, isIncome && styles.typeButtonTextActiveIncome]}>
                  Income
                </Text>
              </TouchableOpacity>
            </View>

            {/* Bucket selector — hidden for income */}
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
                          selected && { backgroundColor: bucket.color + '22', borderColor: bucket.color },
                        ]}
                        onPress={() => setSelectedBucketId(selected ? null : bucket.id)}
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

            {/* Merchant */}
            <View style={styles.section}>
              <Text style={styles.label}>Merchant / description</Text>
              <TextInput
                style={styles.textInput}
                value={merchant}
                onChangeText={setMerchant}
                placeholder="e.g. Bhat-Bhateni, NTC"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {/* Remarks */}
            <View style={styles.section}>
              <Text style={styles.label}>Remarks</Text>
              <TextInput
                style={styles.textInput}
                value={remarks}
                onChangeText={setRemarks}
                placeholder="e.g. #fun coffee with friends"
                placeholderTextColor={colors.textMuted}
              />
              {remarks.startsWith('#') && (
                <Text style={styles.hint}>
                  Prefix tag will auto-assign bucket
                </Text>
              )}
            </View>

            {/* Date */}
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

            {/* Recurring toggle */}
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
          </ScrollView>

          {/* Save button */}
          <View style={styles.footer}>
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
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  amountContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  currencyLabel: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: colors.textMuted,
    marginBottom: 4,
  },
  amountInput: {
    fontSize: 48,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
    minWidth: 120,
    padding: 0,
  },
  typeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
    marginBottom: 24,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  typeButtonActive: {
    backgroundColor: colors.red + '15',
  },
  typeButtonActiveIncome: {
    backgroundColor: colors.greenFill,
  },
  typeButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textMuted,
  },
  typeButtonTextActive: {
    color: colors.red,
  },
  typeButtonTextActiveIncome: {
    color: colors.green,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: colors.textSecond,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 16,
  },
  bucketChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bucketChipText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: colors.textPrimary,
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
  hint: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.green,
    marginTop: 4,
    marginLeft: 4,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  dateText: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: colors.textPrimary,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
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
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.border,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: colors.green,
  },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
  },
  toggleKnobActive: {
    alignSelf: 'flex-end',
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  saveButton: {
    backgroundColor: colors.green,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
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
