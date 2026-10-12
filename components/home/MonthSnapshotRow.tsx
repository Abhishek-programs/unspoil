import { View, Text, StyleSheet } from 'react-native'
import { colors } from '@/constants/colors'
import { formatNPRShort } from '@/lib/format'

interface MonthSnapshotRowProps {
  income: number
  saved: number
  spent: number
}

export function MonthSnapshotRow({ income, saved, spent }: MonthSnapshotRowProps) {
  return (
    <View style={styles.container}>
      <View style={styles.item}>
        <Text style={[styles.value, { color: colors.green }]}>{formatNPRShort(income)}</Text>
        <Text style={styles.label}>Income</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.item}>
        <Text style={[styles.value, { color: '#0369A1' }]}>{formatNPRShort(saved)}</Text>
        <Text style={styles.label}>Saved</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.item}>
        <Text style={[styles.value, { color: colors.red }]}>{formatNPRShort(spent)}</Text>
        <Text style={styles.label}>Spent</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 4,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  item: {
    flex: 1,
    alignItems: 'center',
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },
  label: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    marginTop: 2,
  },
  value: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    fontVariant: ['tabular-nums'],
  },
})
