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
import * as ImagePicker from 'expo-image-picker'
import { colors } from '@/constants/colors'
import { formatNPR, formatDate } from '@/lib/format'
import { categorize } from '@/lib/categorize'
import { processReceiptImage } from '@/lib/ocr'
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

  const [mode, setMode] = useState<'manual' | 'scan'>('scan')
  const [amount, setAmount] = useState('')
  const [isIncome, setIsIncome] = useState(false)
  const [selectedBucketId, setSelectedBucketId] = useState<string | null>(null)
  const [merchant, setMerchant] = useState('')
  const [remarks, setRemarks] = useState('')
  const [date, setDate] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [isRecurring, setIsRecurring] = useState(false)
  const [saving, setSaving] = useState(false)
  const [scanning, setScanning] = useState(false)

  // Reset form when sheet opens
  useEffect(() => {
    if (visible) {
      setMode('scan')
      setAmount('')
      setIsIncome(false)
      setSelectedBucketId(null)
      setMerchant('')
      setRemarks('')
      setDate(new Date())
      setShowDatePicker(false)
      setIsRecurring(false)
      setSaving(false)
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
            {/* Mode Toggle */}
            <View style={styles.modeToggle}>
              <TouchableOpacity
                style={[styles.modeButton, mode === 'scan' && styles.modeButtonActive]}
                onPress={() => {
                  setMode('scan')
                  Keyboard.dismiss()
                }}
              >
                <Ionicons
                  name="scan"
                  size={18}
                  color={mode === 'scan' ? colors.green : colors.textMuted}
                />
                <Text style={[styles.modeButtonText, mode === 'scan' && styles.modeButtonTextActive]}>
                  Scan Receipt
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeButton, mode === 'manual' && styles.modeButtonActive]}
                onPress={() => {
                  setMode('manual')
                  setTimeout(() => amountRef.current?.focus(), 100)
                }}
              >
                <Ionicons
                  name="create-outline"
                  size={18}
                  color={mode === 'manual' ? colors.green : colors.textMuted}
                />
                <Text style={[styles.modeButtonText, mode === 'manual' && styles.modeButtonTextActive]}>
                  Manual Entry
                </Text>
              </TouchableOpacity>
            </View>

            {mode === 'scan' && (
              <View style={styles.scanContainer}>
                <TouchableOpacity 
                  style={styles.scanPicker}
                  onPress={async () => {
                    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
                    if (status !== 'granted') {
                      alert('Sorry, we need camera roll permissions to make this work!')
                      return
                    }

                    const result = await ImagePicker.launchImageLibraryAsync({
                      mediaTypes: ['images'],
                      allowsEditing: true,
                      quality: 0.8,
                    })

                    if (!result.canceled && result.assets[0]) {
                      setScanning(true)
                      try {
                        const ocr = await processReceiptImage(result.assets[0].uri)
                        if (ocr.amount) setAmount(ocr.amount.toString())
                        if (ocr.merchant) setMerchant(ocr.merchant)
                        if (ocr.remarks) setRemarks(ocr.remarks)
                        // Auto-switch to manual mode to review
                        setMode('manual')
                      } catch (e) {
                        alert('Could not scan receipt. Please try manual entry.')
                      } finally {
                        setScanning(false)
                      }
                    }
                  }}
                  disabled={scanning}
                >
                  <View style={styles.scanIconBg}>
                    {scanning ? (
                      <Ionicons name="refresh" size={32} color={colors.green} />
                    ) : (
                      <Ionicons name="image-outline" size={32} color={colors.green} />
                    )}
                  </View>
                  <Text style={styles.scanTitle}>
                    {scanning ? 'Analyzing...' : 'Pick a receipt screenshot'}
                  </Text>
                  <Text style={styles.scanSub}>
                    {scanning ? 'Extracting merchant & amount' : 'eSewa, Khalti, or Bank receipts'}
                  </Text>
                </TouchableOpacity>
                
                <View style={styles.scanDivider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>OR FILL BELOW</Text>
                  <View style={styles.dividerLine} />
                </View>
              </View>
            )}

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
    paddingBottom: 40,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: '#00000008',
    borderRadius: 14,
    padding: 4,
    marginBottom: 24,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  modeButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  modeButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textMuted,
  },
  modeButtonTextActive: {
    color: colors.textPrimary,
  },
  scanContainer: {
    marginBottom: 24,
  },
  scanPicker: {
    backgroundColor: '#16A34A08',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#16A34A33',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderCurve: 'continuous',
  },
  scanIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  scanTitle: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  scanSub: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecond,
  },
  scanDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.divider,
  },
  dividerText: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    color: colors.textMuted,
    letterSpacing: 1,
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
