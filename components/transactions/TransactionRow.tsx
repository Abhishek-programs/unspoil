import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { colors } from '@/constants/colors'
import { formatNPR, formatDate } from '@/lib/format'
import { transactionSubtitle, transactionTitle } from '@/lib/transaction-label'
import { useBucketsStore } from '@/store/buckets'
import type { Transaction } from '@/store/transactions'

interface TransactionRowProps {
  transaction: Transaction
  bucketName: string
  bucketColor: string
  onPress: () => void
}

export function TransactionRow({ transaction, bucketName, bucketColor, onPress }: TransactionRowProps) {
  const buckets = useBucketsStore(s => s.buckets)
  const isIncome = transaction.type === 'income'
  const title = transactionTitle(transaction)
  const subtitle = transactionSubtitle(transaction)
  const fundedFromName = transaction.fundedFromBucketId
    ? buckets.find(b => b.id === transaction.fundedFromBucketId)?.name
    : null

  return (
    <TouchableOpacity
      style={[styles.row, transaction.isFlagged && styles.flaggedRow]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.left}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {fundedFromName ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            from {fundedFromName}
          </Text>
        ) : subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        <Text style={styles.date}>{formatDate(transaction.date)}</Text>
      </View>

      <View style={styles.center}>
        <View style={[styles.bucketPill, { backgroundColor: bucketColor + '22' }]}>
          <Text style={[styles.bucketPillText, { color: bucketColor }]} numberOfLines={1}>
            {bucketName}
          </Text>
        </View>
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  flaggedRow: {
    borderLeftWidth: 4,
    borderLeftColor: colors.amber,
    backgroundColor: '#F59E0B12',
  },
  left: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    marginTop: 2,
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
  amount: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    fontVariant: ['tabular-nums'],
  },
})
