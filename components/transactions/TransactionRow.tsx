import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { colors } from '@/constants/colors'
import { formatNPR, formatDate } from '@/lib/format'
import type { Transaction } from '@/store/transactions'

interface TransactionRowProps {
  transaction: Transaction
  bucketName: string
  bucketColor: string
  onPress: () => void
}

export function TransactionRow({ transaction, bucketName, bucketColor, onPress }: TransactionRowProps) {
  const isIncome = transaction.type === 'income'

  return (
    <TouchableOpacity
      style={[styles.row, transaction.isFlagged && styles.flaggedRow]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.left}>
        <Text style={styles.merchant} numberOfLines={1}>
          {transaction.merchant || 'Unknown'}
        </Text>
        <Text style={styles.date}>{formatDate(transaction.date)}</Text>
      </View>

      <View style={styles.center}>
        <View style={[styles.bucketPill, { backgroundColor: bucketColor + '22' }]}>
          <Text style={[styles.bucketPillText, { color: bucketColor }]} numberOfLines={1}>
            {bucketName}
          </Text>
        </View>
        {transaction.source === 'ocr' && (
          <View style={styles.ocrBadge}>
            <Text style={styles.ocrBadgeText}>OCR</Text>
          </View>
        )}
      </View>

      <Text style={[styles.amount, { color: isIncome ? colors.green : colors.red }]}>
        {isIncome ? '+' : '-'} NPR {formatNPR(transaction.amount)}
      </Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  flaggedRow: {
    borderLeftWidth: 3,
    borderLeftColor: colors.amber,
  },
  left: {
    flex: 1,
    marginRight: 8,
  },
  merchant: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
  },
  date: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    marginTop: 2,
  },
  center: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 8,
  },
  bucketPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    maxWidth: 90,
  },
  bucketPillText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
  },
  ocrBadge: {
    backgroundColor: colors.divider,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ocrBadgeText: {
    fontSize: 9,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textMuted,
  },
  amount: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    fontVariant: ['tabular-nums'],
  },
})
