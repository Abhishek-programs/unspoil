import { useState, useEffect } from 'react'
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
  Alert,
  BackHandler,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@/constants/colors'
import { formatNPR, formatDate } from '@/lib/format'
import { transactionTitle } from '@/lib/transaction-label'
import { useBucketsStore } from '@/store/buckets'
import { useTransactionsStore } from '@/store/transactions'
import type { Transaction } from '@/store/transactions'
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight'

interface TransactionDetailSheetProps {
  transaction: Transaction | null
  visible: boolean
  onClose: () => void
}

export function TransactionDetailSheet({ transaction, visible, onClose }: TransactionDetailSheetProps) {
  const { getSpendingBuckets, getSavingsBuckets } = useBucketsStore()
  const { updateTransaction, deleteTransaction } = useTransactionsStore()

  const allBuckets = [...getSpendingBuckets(), ...getSavingsBuckets()]

  const [selectedBucketId, setSelectedBucketId] = useState<string>('')
  const [description, setDescription] = useState('')
  const [merchant, setMerchant] = useState('')
  const [remarks, setRemarks] = useState('')
  const [saving, setSaving] = useState(false)
  const keyboardHeight = useKeyboardHeight(visible)

  useEffect(() => {
    if (transaction && visible) {
      setSelectedBucketId(transaction.bucketId)
      setDescription(transaction.description ?? '')
      setMerchant(transaction.merchant ?? '')
      setRemarks(transaction.remarks ?? '')
      setSaving(false)
    }
  }, [transaction, visible])

  useEffect(() => {
    if (!visible) return
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose()
      return true
    })
    return () => sub.remove()
  }, [visible, onClose])

  if (!transaction) return null

  const isIncome = transaction.type === 'income'
  const isExpense = transaction.type === 'expense'

  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    try {
      const patch: Partial<Transaction> = {
        description: description.trim() || null,
        merchant: merchant.trim() || null,
      }
      if (!transaction.remarks?.startsWith('__')) {
        patch.remarks = remarks.trim() || null
      }
      if (isExpense && selectedBucketId) {
        patch.bucketId = selectedBucketId
        if (transaction.isFlagged && selectedBucketId !== transaction.bucketId) {
          patch.isFlagged = false
        }
      }
      await updateTransaction(transaction.id, patch)
      onClose()
    } catch (e) {
      console.error('Failed to update transaction:', e)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = () => {
    Alert.alert(
      'Delete transaction',
      'This cannot be undone. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTransaction(transaction.id)
              onClose()
            } catch (e) {
              console.error('Failed to delete transaction:', e)
            }
          },
        },
      ],
    )
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Transaction details</Text>
          <View style={{ width: 24 }} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
          enabled={Platform.OS === 'ios'}
        >
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              Platform.OS === 'ios' && keyboardHeight > 0
                ? { paddingBottom: keyboardHeight + 24 }
                : null,
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          >
            {/* Amount */}
            <View style={styles.amountContainer}>
              <Text style={[styles.amount, { color: isIncome ? colors.green : colors.red }]}>
                NPR {formatNPR(transaction.amount)}
              </Text>
              <View style={[styles.typeBadge, { backgroundColor: isIncome ? colors.greenFill : '#FEE2E2' }]}>
                <Text style={[styles.typeBadgeText, { color: isIncome ? colors.green : colors.red }]}>
                  {isIncome ? 'Income' : 'Expense'}
                </Text>
              </View>
            </View>

            {/* Title */}
            <View style={styles.section}>
              <Text style={styles.label}>Title</Text>
              {isIncome ? (
                <Text style={styles.valueText}>{transactionTitle(transaction)}</Text>
              ) : (
                <TextInput
                  style={styles.textInput}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="What you bought or did"
                  placeholderTextColor={colors.textMuted}
                />
              )}
            </View>

            {/* Description (stored as merchant) */}
            <View style={styles.section}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={styles.textInput}
                value={merchant}
                onChangeText={setMerchant}
                placeholder="Optional extra detail"
                placeholderTextColor={colors.textMuted}
                editable={!isIncome || transaction.source !== 'manual'}
              />
            </View>

            {/* Bucket selector — expense only */}
            {isExpense && (
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
                        onPress={() => setSelectedBucketId(bucket.id)}
                      >
                        <Text style={{ fontSize: 14, marginRight: 4 }}>{bucket.icon}</Text>
                        <Text
                          style={[styles.bucketChipText, selected && { color: bucket.color }]}
                        >
                          {bucket.name}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </ScrollView>
              </View>
            )}

            {!transaction.remarks?.startsWith('__') ? (
              <View style={styles.section}>
                <Text style={styles.label}>Remarks</Text>
                <TextInput
                  style={styles.textInput}
                  value={remarks}
                  onChangeText={setRemarks}
                  placeholder="Notes (optional)"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            ) : null}

            {transaction.fundedFromBucketId ? (
              <View style={styles.section}>
                <Text style={styles.label}>Funded from</Text>
                <Text style={styles.valueText}>
                  {allBuckets.find(b => b.id === transaction.fundedFromBucketId)?.name ??
                    'Unknown bucket'}
                </Text>
              </View>
            ) : null}

            {/* Date */}
            <View style={styles.section}>
              <Text style={styles.label}>Date</Text>
              <Text style={styles.valueText}>{formatDate(transaction.date)}</Text>
            </View>

            {/* Source badge */}
            <View style={styles.section}>
              <Text style={styles.label}>Source</Text>
              <View style={styles.sourceBadge}>
                <Text style={styles.sourceBadgeText}>
                  {transaction.source === 'notification'
                    ? 'Payment helper'
                    : transaction.source === 'manual'
                      ? 'Manual entry'
                      : transaction.source}
                </Text>
              </View>
            </View>

            {/* Flagged indicator */}
            {transaction.isFlagged && (
              <View style={styles.flaggedBanner}>
                <Ionicons name="flag" size={16} color={colors.amber} />
                <Text style={styles.flaggedText}>Flagged — needs bucket review</Text>
              </View>
            )}

            {/* Delete button */}
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={18} color={colors.red} />
              <Text style={styles.deleteButtonText}>Delete transaction</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Save button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              <Text style={styles.saveButtonText}>
                {saving ? 'Saving...' : 'Save changes'}
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
    paddingVertical: 20,
  },
  amount: {
    fontSize: 36,
    fontFamily: 'Inter_700Bold',
    fontVariant: ['tabular-nums'],
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  typeBadgeText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
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
  valueText: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: colors.textPrimary,
  },
  hint: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    marginTop: 6,
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
  sourceBadge: {
    backgroundColor: colors.divider,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  sourceBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: colors.textSecond,
  },
  flaggedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.amberFill,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  flaggedText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: colors.amber,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.red + '33',
    backgroundColor: '#FEE2E2',
  },
  deleteButtonText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: colors.red,
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
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
})
