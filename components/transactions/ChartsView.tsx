import { View, Text, StyleSheet } from 'react-native'
import { BarChart } from 'react-native-gifted-charts'
import { colors } from '@/constants/colors'

interface ChartsViewProps {
  spendingByBucket: { label: string; value: number; color: string }[]
}

export function ChartsView({ spendingByBucket }: ChartsViewProps) {
  if (spendingByBucket.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No spending data yet</Text>
      </View>
    )
  }

  const barData = spendingByBucket.map(item => ({
    value: item.value,
    label: item.label,
    frontColor: item.color,
    topLabelComponent: () => (
      <Text style={styles.barLabel}>{Math.round(item.value / 1000)}K</Text>
    ),
  }))

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Spending by bucket</Text>
      <View style={styles.chartWrapper}>
        <BarChart
          data={barData}
          barWidth={32}
          barBorderTopLeftRadius={6}
          barBorderTopRightRadius={6}
          spacing={20}
          noOfSections={4}
          yAxisThickness={0}
          xAxisThickness={1}
          xAxisColor={colors.border}
          rulesColor={colors.divider}
          xAxisLabelTextStyle={styles.xLabel}
          hideYAxisText
          isAnimated
          animationDuration={400}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  chartWrapper: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    paddingTop: 24,
    overflow: 'hidden',
  },
  barLabel: {
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
    color: colors.textSecond,
    marginBottom: 4,
  },
  xLabel: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    width: 60,
    textAlign: 'center',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
  },
})
