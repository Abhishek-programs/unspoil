import { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
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
  const { getSpendingBuckets, getSavingsBuckets } = useBucketsStore()
  
  const [currentIndex, setCurrentIndex] = useState(0)
  const [saving, setSaving] = useState(false)

  const currentTxn = flaggedTransactions[currentIndex]
  const allBuckets = [...getSpendingBuckets(), ...getSavingsBuckets()]

  const handleResolve = async (bucketId: string) => {
    if (!currentTxn || saving) return
    setSaving(true)

    try {
      await updateTransaction(currentTxn.id, {
        bucketId,
        isFlagged: false,
      })

      if (currentIndex < flaggedTransactions.length - 1) {
        setCurrentIndex(v => v + 1)
      } else {
        onClose()
      }
    } catch (e) {
      console.error('Failed to resolve flagged transaction:', e)
    } finally {
      setSaving(false)
    }
  }

  if (!currentTxn) return null

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
              <Text style={styles.title}>Confirm category</Text>
              <TouchableOpacity onPress={onClose} hitSlop={12}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Txn Info */}
            <View style={styles.txnInfo}>
              <Text style={styles.merchant}>{currentTxn.merchant || 'Unknown Merchant'}</Text>
              <Text style={styles.amount}>{formatNPR(currentTxn.amount)}</Text>
              <Text style={styles.date}>{formatDate(currentTxn.date)}</Text>
              {currentTxn.remarks && (
                <View style={styles.remarksBadge}>
                  <Text style={styles.remarksText}>“{currentTxn.remarks}”</Text>
                </View>
              )}
            </View>

            <Text style={styles.question}>Which bucket does this belong to?</Text>

            {/* Bucket Grid */}
            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.bucketGrid}
            >
              {allBuckets.map(bucket => (
                <TouchableOpacity
                  key={bucket.id}
                  style={[styles.bucketItem, { borderColor: bucket.id === currentTxn.bucketId ? colors.green : colors.border }]}
                  onPress={() => handleResolve(bucket.id)}
                  disabled={saving}
                >
                  <Text style={styles.bucketIcon}>{bucket.icon}</Text>
                  <Text style={styles.bucketName} numberOfLines={1}>{bucket.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity 
              style={styles.skipButton} 
              onPress={() => currentIndex < flaggedTransactions.length - 1 ? setCurrentIndex(v => v + 1) : onClose()}
            >
              <Text style={styles.skipText}>Skip for now</Text>
            </TouchableOpacity>
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
    maxHeight: '80%',
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
    backgroundColor: colors.green + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  counterText: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    color: colors.green,
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
    marginBottom: 8,
  },
  date: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
  },
  remarksBadge: {
    marginTop: 12,
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
    width: '31.5%',
    aspectRatio: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
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
  skipButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  skipText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: colors.textMuted,
  },
})
