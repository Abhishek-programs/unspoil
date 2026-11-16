import { useRef } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Animated, PanResponder } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@/constants/colors'
import { formatDate, formatMoney } from '@/lib/format'
import { transactionSubtitle, transactionTitle } from '@/lib/transaction-label'
import { useBucketsStore } from '@/store/buckets'
import type { Transaction } from '@/store/transactions'
import { isPaidFromSavings } from '@/lib/txn-kind'

interface TransactionRowProps {
  transaction: Transaction
  bucketName: string
  bucketColor: string
  onPress: () => void
  onLongPress?: () => void
  /** Swipe left past the threshold. Omit to disable swiping for this row. */
  onSwipeDelete?: () => void
}

const SWIPE_DELETE_AT = -96

export function TransactionRow({
  transaction,
  bucketName,
  bucketColor,
  onPress,
  onLongPress,
  onSwipeDelete,
}: TransactionRowProps) {
  const dragX = useRef(new Animated.Value(0)).current
  const swipeRef = useRef(onSwipeDelete)
  swipeRef.current = onSwipeDelete
  const pan = useRef(
    PanResponder.create({
      // Only claim clearly horizontal leftward drags so the list still scrolls.
      onMoveShouldSetPanResponder: (_, g) =>
        !!swipeRef.current && g.dx < -12 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
      onPanResponderMove: (_, g) => dragX.setValue(Math.min(0, g.dx)),
      onPanResponderRelease: (_, g) => {
        if (g.dx < SWIPE_DELETE_AT && swipeRef.current) {
          Animated.timing(dragX, { toValue: -500, duration: 160, useNativeDriver: true }).start(
            () => {
              swipeRef.current?.()
              dragX.setValue(0)
            },
          )
        } else {
          Animated.spring(dragX, { toValue: 0, useNativeDriver: true }).start()
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(dragX, { toValue: 0, useNativeDriver: true }).start()
      },
    }),
  ).current

  const buckets = useBucketsStore(s => s.buckets)
  const isIncome = transaction.type === 'income'
  const fromSavings = isPaidFromSavings(transaction)
  const title = transactionTitle(transaction)
  const subtitle = transactionSubtitle(transaction)
  const fundedFromName = transaction.fundedFromBucketId
    ? buckets.find(b => b.id === transaction.fundedFromBucketId)?.name
    : null

  return (
    <View style={styles.swipeTrack}>
      <View style={styles.swipeAction}>
        <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
      </View>
    <Animated.View style={{ transform: [{ translateX: dragX }] }} {...pan.panHandlers}>
    <TouchableOpacity
      style={[styles.row, transaction.isFlagged && styles.flaggedRow]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      activeOpacity={0.7}
    >
      <View style={styles.left}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {fundedFromName ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            from {fundedFromName}
            {fromSavings ? ' savings' : ''}
          </Text>
        ) : subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        {transaction.feeAmount > 0 && (
          <Text style={styles.fee}>fee {formatMoney(transaction.feeAmount)}</Text>
        )}
        <Text style={styles.date}>{formatDate(transaction.date)}</Text>
      </View>

      <View style={styles.center}>
        <View style={[styles.bucketPill, { backgroundColor: bucketColor + '22' }]}>
          <Text style={[styles.bucketPillText, { color: bucketColor }]} numberOfLines={1}>
            {bucketName}
          </Text>
        </View>
      </View>

      <Text
        style={[
          styles.amount,
          { color: isIncome ? colors.green : fromSavings ? colors.savingsSetAside : colors.red },
        ]}
      >
        {isIncome ? '+' : '-'} {formatMoney(transaction.amount)}
      </Text>
    </TouchableOpacity>
    </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  swipeTrack: {
    backgroundColor: colors.red,
  },
  swipeAction: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
    backgroundColor: '#FEF7E6',
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
  fee: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: colors.amber,
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
