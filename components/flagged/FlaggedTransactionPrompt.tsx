import { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Switch,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@/constants/colors'
import { formatNPR, formatDate } from '@/lib/format'
import { useTransactionsStore, type Transaction } from '@/store/transactions'
import { useBucketsStore } from '@/store/buckets'

interface FlaggedTransactionPromptProps {
  visible: boolean
  flaggedTransactions: Transaction[]
  onClose: () => void
}

export function FlaggedTransactionPrompt({
  visible,
  flaggedTransactions,
  onClose
}: FlaggedTransactionPromptProps) {
  const { updateTransaction } = useTransactionsStore()
  const { getSpendingBuckets, getSavingsBuckets, addSureShotMerchant, buckets } = useBucketsStore()

  const [currentIndex, setCurrentIndex] = useState(0)
  const [saving, setSaving] = useState(false)
  const [selectedBucketId, setSelectedBucketId] = useState<string | null>(null)
  const [alwaysUse, setAlwaysUse] = useState(false)

  const currentTxn = flaggedTransactions[currentIndex]
  const allBuckets = [...getSpendingBuckets(), ...getSavingsBuckets()]

  const currentBucket = currentTxn ? buckets.find(b => b.id === currentTxn.bucketId) : null

  const handleConfirm = async () => {
    if (!currentTxn || saving) return
    const bucketId = selectedBucketId || currentTxn.bucketId
    setSaving(true)

    try {
      await updateTransaction(currentTxn.id, {
        bucketId,
        isFlagged: false,
      })

      // Add to sure-shot merchants if toggled and merchant exists
      if (alwaysUse && currentTxn.merchant) {
        await addSureShotMerchant(currentTxn.merchant, bucketId)
      }

      // Reset for next
      setSelectedBucketId(null)
      setAlwaysUse(false)

      if (currentIndex < flaggedTransactions.length - 1) {
        setCurrentIndex(v => v + 1)
      } else {
        setCurrentIndex(0)
        onClose()
      }
    } catch (e) {
      console.error('Failed to resolve flagged transaction:', e)
    } finally {
      setSaving(false)
    }
  }

  const handleSkip = () => {
    setSelectedBucketId(null)
    setAlwaysUse(false)
    if (currentIndex < flaggedTransactions.length - 1) {
      setCurrentIndex(v => v + 1)
    } else {
      setCurrentIndex(0)
      onClose()
    }
  }

  const handleClose = () => {
    setCurrentIndex(0)
    setSelectedBucketId(null)
    setAlwaysUse(false)
    onClose()
  }

  if (!currentTxn) return null

  const effectiveBucketId = selectedBucketId || currentTxn.bucketId

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.card}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.counter}>
                <Text style={styles.counterText}>
                  {currentIndex + 1} of {flaggedTransactions.length}
                </Text>
              </View>
              <Text style={styles.title}>Needs Review</Text>
              <TouchableOpacity onPress={handleClose} hitSlop={12}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Txn Info */}
            <View style={styles.txnInfo}>
              <Text style={styles.merchant}>{currentTxn.merchant || 'Unknown Merchant'}</Text>
              <Text style={styles.amount}>NPR {formatNPR(currentTxn.amount)}</Text>
              <Text style={styles.date}>{formatDate(currentTxn.date)}</Text>
              <View style={styles.currentBucketBadge}>
                <Text style={styles.currentBucketText}>
                  Currently in: {currentBucket?.name || 'Unknown'}
                </Text>
              </View>
              {currentTxn.remarks && currentTxn.remarks !== '__savings_confirm__' && (
                <View style={styles.remarksBadge}>
                  <Text style={styles.remarksText}>"{currentTxn.remarks}"</Text>
                </View>
              )}
            </View>

            <Text style={styles.question}>Assign to bucket:</Text>

            {/* Bucket Grid */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.bucketGrid}
            >
              {allBuckets.map(bucket => {
                const isSelected = effectiveBucketId === bucket.id
                return (
                  <TouchableOpacity
                    key={bucket.id}
                    style={[
                      styles.bucketItem,
                      isSelected && styles.bucketItemSelected,
                    ]}
                    onPress={() => setSelectedBucketId(bucket.id)}
                    disabled={saving}
                  >
                    <Text style={styles.bucketIcon}>{bucket.icon}</Text>
                    <Text style={[
                      styles.bucketName,
                      isSelected && styles.bucketNameSelected,
                    ]} numberOfLines={1}>{bucket.name}</Text>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>

            {/* Always use toggle */}
            {currentTxn.merchant && (
              <View style={styles.alwaysRow}>
                <Text style={styles.alwaysText} numberOfLines={2}>
                  Always use this bucket for "{currentTxn.merchant}"
                </Text>
                <Switch
                  value={alwaysUse}
                  onValueChange={setAlwaysUse}
                  trackColor={{ false: colors.border, true: colors.greenFill }}
                  thumbColor={alwaysUse ? colors.green : '#f4f3f4'}
                />
              </View>
            )}

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleConfirm}
                disabled={saving}
              >
                <Text style={styles.confirmText}>Confirm</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#00000080',
    justifyContent: 'center',
    padding: 20,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.pageBg,
    borderRadius: 24,
    maxHeight: '85%',
    overflow: 'hidden',
    borderCurve: 'continuous',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  counter: {
    backgroundColor: colors.amber + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  counterText: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    color: colors.amber,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
  },
  txnInfo: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  merchant: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textSecond,
    marginBottom: 4,
  },
  amount: {
    fontSize: 32,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
    marginBottom: 8,
  },
  date: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
  },
  currentBucketBadge: {
    marginTop: 10,
    backgroundColor: colors.amberFill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  currentBucketText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: colors.amber,
  },
  remarksBadge: {
    marginTop: 8,
    backgroundColor: colors.pageBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  remarksText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecond,
    fontStyle: 'italic',
  },
  question: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textPrimary,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 12,
  },
  bucketGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 8,
  },
  bucketItem: {
    width: '31%',
    aspectRatio: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderCurve: 'continuous',
  },
  bucketItemSelected: {
    borderColor: colors.green,
    backgroundColor: colors.greenFill,
  },
  bucketIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  bucketName: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  bucketNameSelected: {
    color: colors.green,
  },
  alwaysRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  alwaysText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: colors.textSecond,
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: colors.green,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
  skipButton: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: colors.textMuted,
  },
})
