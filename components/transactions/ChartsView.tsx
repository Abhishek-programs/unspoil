import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { BarChart, PieChart } from 'react-native-gifted-charts'
import { colors } from '@/constants/colors'
import { Ionicons } from '@expo/vector-icons'
import { formatNPRShort } from '@/lib/format'

interface ChartsViewProps {
  spendingByBucket: { label: string; value: number; color: string }[]
  savingsByBucket?: { label: string; value: number; target: number; color: string; confirmed: boolean }[]
  goals?: { name: string; current: number; target: number; projectedDate?: string }[]
}

export function ChartsView({ 
  spendingByBucket, 
  savingsByBucket = [],
  goals = []
}: ChartsViewProps) {
  if (spendingByBucket.length === 0 && savingsByBucket.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No financial data yet this month</Text>
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

  const pieData = spendingByBucket.map(item => ({
    value: item.value,
    color: item.color,
    text: item.label[0],
  }))

  const totalSpent = spendingByBucket.reduce((sum, b) => sum + b.value, 0)

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Spending Breakdown */}
      <View style={styles.section}>
        <Text style={styles.title}>Spending Distribution</Text>
        <View style={styles.chartWrapper}>
          <View style={styles.donutRow}>
            <PieChart
              data={pieData}
              donut
              radius={70}
              innerRadius={50}
              innerCircleColor={colors.surface}
              centerLabelComponent={() => (
                <View style={{ alignItems: 'center' }}>
                  <Text style={styles.donutTotalLabel}>Total</Text>
                  <Text style={styles.donutTotalValue}>{formatNPRShort(totalSpent)}</Text>
                </View>
              )}
            />
            <View style={styles.legend}>
              {spendingByBucket.map(item => (
                <View key={item.label} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                  <Text style={styles.legendLabel}>{item.label}</Text>
                  <Text style={styles.legendValue}>{Math.round((item.value / totalSpent) * 100)}%</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>

      {/* Bar Chart */}
      <View style={styles.section}>
        <Text style={styles.title}>Spending by Bucket</Text>
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

      {/* Savings Grid */}
      {savingsByBucket.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.title}>Savings & Investments</Text>
          <View style={styles.savingsGrid}>
            {savingsByBucket.map(item => (
              <View key={item.label} style={styles.savingsCard}>
                <View style={styles.savingsHeader}>
                  <View style={[styles.savingsIcon, { backgroundColor: item.color + '15' }]}>
                    <Ionicons 
                      name={item.confirmed ? "checkmark-circle" : "time-outline"} 
                      size={16} 
                      color={item.confirmed ? colors.green : colors.textMuted} 
                    />
                  </View>
                  <Text style={styles.savingsName} numberOfLines={1}>{item.label}</Text>
                </View>
                <View style={styles.savingsProgress}>
                  <Text style={styles.savingsValue}>{formatNPRShort(item.value)}</Text>
                  <Text style={styles.savingsTarget}>/ {formatNPRShort(item.target)}</Text>
                </View>
                <View style={styles.miniProgressContainer}>
                  <View 
                    style={[
                      styles.miniProgressBar, 
                      { 
                        width: `${Math.min((item.value / item.target) * 100, 100)}%`,
                        backgroundColor: item.confirmed ? colors.green : colors.textMuted
                      }
                    ]} 
                  />
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Goal Projections */}
      {goals.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.title}>Goal Projections</Text>
          {goals.map(goal => (
            <View key={goal.name} style={styles.goalLine}>
              <View style={styles.goalHeader}>
                <Text style={styles.goalName}>{goal.name}</Text>
                <Text style={styles.goalDate}>{goal.projectedDate || '---'}</Text>
              </View>
              <View style={styles.goalMeta}>
                <Text style={styles.goalProgressText}>
                  {formatNPRShort(goal.current)} of {formatNPRShort(goal.target)}
                </Text>
                <Text style={styles.goalPercent}>
                  {Math.round((goal.current / goal.target) * 100)}%
                </Text>
              </View>
              <View style={styles.goalTrack}>
                <View 
                  style={[
                    styles.goalFill, 
                    { width: `${Math.min((goal.current / goal.target) * 100, 100)}%` }
                  ]} 
                />
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  title: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chartWrapper: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    borderCurve: 'continuous',
  },
  donutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  donutTotalLabel: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: colors.textMuted,
  },
  donutTotalValue: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
  },
  legend: {
    flex: 1,
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: colors.textSecond,
  },
  legendValue: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textPrimary,
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
  savingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  savingsCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    borderCurve: 'continuous',
  },
  savingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  savingsIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savingsName: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textPrimary,
    flex: 1,
  },
  savingsProgress: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  savingsValue: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
  },
  savingsTarget: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    marginLeft: 4,
  },
  miniProgressContainer: {
    height: 4,
    backgroundColor: colors.divider,
    borderRadius: 2,
    overflow: 'hidden',
  },
  miniProgressBar: {
    height: '100%',
    borderRadius: 2,
  },
  goalLine: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    borderCurve: 'continuous',
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  goalName: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
  },
  goalDate: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: colors.green,
  },
  goalMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  goalProgressText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecond,
  },
  goalPercent: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
  },
  goalTrack: {
    height: 8,
    backgroundColor: colors.divider,
    borderRadius: 4,
    overflow: 'hidden',
  },
  goalFill: {
    height: '100%',
    backgroundColor: colors.green,
    borderRadius: 4,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
  },
})
