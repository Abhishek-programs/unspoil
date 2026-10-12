import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { colors } from '@/constants/colors'
import { formatNPR, formatDate } from '@/lib/format'
import type { LendBorrowEntry } from '@/lib/lending/balance'

interface LendingRowProps {
  entry: LendBorrowEntry
  personName: string
  onPress: () => void
}

function typeLabel(type: LendBorrowEntry['type']) {
  if (type === 'lend') return 'Lent'
  if (type === 'borrow') return 'Borrowed'
  return 'Settled'
}

function typeColor(type: LendBorrowEntry['type']) {
  if (type === 'lend') return colors.purple
  if (type === 'borrow') return colors.amber
  return colors.green
}

export function LendingRow({ entry, personName, onPress }: LendingRowProps) {
  const accent = typeColor(entry.type)

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.badge, { backgroundColor: accent + '18' }]}>
        <Text style={[styles.badgeText, { color: accent }]}>{typeLabel(entry.type)}</Text>
      </View>
      <View style={styles.main}>
        <Text style={styles.title}>{personName}</Text>
        {entry.note ? <Text style={styles.sub}>{entry.note}</Text> : null}
        <Text style={styles.date}>{formatDate(entry.date)}</Text>
      </View>
      <Text style={[styles.amount, { color: accent }]}>NPR {formatNPR(entry.amount)}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    textTransform: 'uppercase',
  },
  main: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textPrimary,
  },
  sub: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecond,
    marginTop: 2,
  },
  date: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    marginTop: 4,
  },
  amount: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    fontVariant: ['tabular-nums'],
  },
})
