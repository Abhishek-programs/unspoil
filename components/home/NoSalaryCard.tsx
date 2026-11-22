import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@/constants/colors'
import { formatMoney } from '@/lib/format'
import { formatRunway } from '@/lib/no-salary'

interface NoSalaryCardProps {
  runway: number | null
  runwayWithEf: number | null
  efValue: number
  shortNextMonth: boolean
  efTopUpSuggested: number
  /** Paused buckets with new spending the user hasn't seen yet. */
  nudge: { names: string[]; total: number } | null
  keptLabel: string
  onEdit: () => void
  onMoveFromEf: () => void
  onDismissNudge: () => void
}

export function NoSalaryCard({
  runway,
  runwayWithEf,
  efValue,
  shortNextMonth,
  efTopUpSuggested,
  nudge,
  keptLabel,
  onEdit,
  onMoveFromEf,
  onDismissNudge,
}: NoSalaryCardProps) {
  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.head} onPress={onEdit} activeOpacity={0.8}>
        <Ionicons name="leaf-outline" size={18} color={colors.green} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.title}>No-salary month</Text>
          <Text style={styles.sub}>Funding {keptLabel} from Your money</Text>
        </View>
        <Text style={styles.edit}>Edit</Text>
      </TouchableOpacity>

      <View style={styles.divider} />
      <Text style={styles.runway}>Lasts {formatRunway(runway)}</Text>
      {efValue > 0 && runwayWithEf != null && (
        <Text style={styles.runwaySub}>{formatRunway(runwayWithEf)} counting the Emergency Fund</Text>
      )}

      {shortNextMonth && (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            Your money may not cover next month on this plan.
          </Text>
          {efTopUpSuggested > 0 && (
            <TouchableOpacity style={styles.efBtn} onPress={onMoveFromEf} activeOpacity={0.85}>
              <Text style={styles.efBtnText}>
                Move {formatMoney(efTopUpSuggested)} from Emergency Fund
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {nudge && (
        <View style={styles.nudge}>
          <Text style={styles.nudgeText}>
            {nudge.names.join(' & ')} took {formatMoney(nudge.total)} this month. While salary is
            paused, {keptLabel} comes first.
          </Text>
          <TouchableOpacity onPress={onDismissNudge} hitSlop={10}>
            <Text style={styles.nudgeBtn}>Got it</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 16,
    borderCurve: 'continuous',
  },
  head: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 14, fontFamily: 'Inter_700Bold', color: colors.textPrimary },
  sub: { fontSize: 12, fontFamily: 'Inter_400Regular', color: colors.textSecond, marginTop: 1 },
  edit: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: colors.green },
  divider: { height: 1, backgroundColor: colors.divider, marginVertical: 10 },
  runway: { fontSize: 16, fontFamily: 'Inter_700Bold', color: colors.textPrimary },
  runwaySub: { fontSize: 12, fontFamily: 'Inter_400Regular', color: colors.textSecond, marginTop: 2 },
  notice: {
    marginTop: 10,
    backgroundColor: colors.amberFill,
    borderRadius: 12,
    padding: 10,
  },
  noticeText: { fontSize: 13, fontFamily: 'Inter_500Medium', color: colors.textPrimary },
  efBtn: {
    marginTop: 8,
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  efBtnText: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: colors.textPrimary },
  nudge: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.pageBg,
    borderRadius: 12,
    padding: 10,
  },
  nudgeText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecond,
    lineHeight: 18,
  },
  nudgeBtn: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: colors.textSecond },
})
