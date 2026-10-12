import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { PieChart } from 'react-native-gifted-charts'
import { colors } from '@/constants/colors'
import { formatNPRShort } from '@/lib/format'
import { projectGoal } from '@/lib/projection'

interface GoalCardProps {
  name: string
  current: number
  target: number
  monthly: number
  color: string
  onPress: () => void
}

export function GoalCard({ name, current, target, monthly, color, onPress }: GoalCardProps) {
  const percent = Math.min((current / target) * 100, 100)
  const { projectedDate, nudge } = projectGoal({ current, target, monthly })

  const pieData = [
    { value: percent, color: color },
    { value: 100 - percent, color: colors.divider },
  ]

  return (
    <TouchableOpacity 
      style={styles.container} 
      activeOpacity={0.8}
      onPress={onPress}
    >
      <View style={styles.content}>
        <View style={styles.chartWrapper}>
          <PieChart
            data={pieData}
            donut
            radius={36}
            innerRadius={28}
            innerCircleColor={colors.surface}
            centerLabelComponent={() => (
              <Text style={styles.percentText}>{Math.round(percent)}%</Text>
            )}
          />
        </View>

        <View style={styles.info}>
          <View style={styles.header}>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.date}>{projectedDate}</Text>
          </View>
          
          <View style={styles.meta}>
            <Text style={styles.progressText}>
              {formatNPRShort(current)} of {formatNPRShort(target)}
            </Text>
            <Text style={styles.monthlyText}>
              {formatNPRShort(monthly)}/mo
            </Text>
          </View>
        </View>
      </View>

      {nudge && (
        <View style={styles.nudge}>
          <Text style={styles.nudgeText}>
            Add <Text style={styles.nudgeHighlight}>{formatNPRShort(nudge.amount)}/mo</Text> to finish {nudge.monthsSaved} month{nudge.monthsSaved > 1 ? 's' : ''} sooner
          </Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 16,
    borderCurve: 'continuous',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  chartWrapper: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
  },
  info: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  name: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
  },
  date: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: colors.green,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecond,
  },
  monthlyText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textMuted,
  },
  nudge: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  nudgeText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecond,
    textAlign: 'center',
  },
  nudgeHighlight: {
    fontFamily: 'Inter_700Bold',
    color: colors.green,
  },
})
