import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@/constants/colors'
import { formatNPRShort } from '@/lib/format'

interface LentBorrowRowProps {
  totalNet: number
  onPress: () => void
}

export function LentBorrowRow({ totalNet, onPress }: LentBorrowRowProps) {
  const accent =
    totalNet > 0 ? colors.green : totalNet < 0 ? colors.red : colors.textMuted
  const sign = totalNet > 0 ? '+' : totalNet < 0 ? '−' : ''

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.85}>
      <Ionicons name="swap-vertical" size={18} color={accent} />
      <Text style={styles.label}>Lent & Borrowed</Text>
      <Text style={styles.dot}>·</Text>
      <Text style={[styles.net, { color: accent }]}>
        NPR {sign}{formatNPRShort(Math.abs(totalNet))} net
      </Text>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={styles.chevron} />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderCurve: 'continuous',
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textPrimary,
    marginLeft: 8,
  },
  dot: {
    fontSize: 14,
    color: colors.textMuted,
    marginHorizontal: 6,
  },
  net: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    fontVariant: ['tabular-nums'],
  },
  chevron: {
    marginLeft: 4,
  },
})
