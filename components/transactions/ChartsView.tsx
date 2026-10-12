import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { BarChart } from 'react-native-gifted-charts'
import { colors } from '@/constants/colors'
import { Ionicons } from '@expo/vector-icons'
import { formatNPRShort } from '@/lib/format'
import { getMonthlySpendHistory, type MonthlySpend } from '@/lib/chart-data'

interface BucketSpend {
  label: string
  value: number
  limit: number
  color: string
}

interface ChartsViewProps {
  spendingByBucket: BucketSpend[]
  savingsByBucket?: { label: string; value: number; target: number; color: string; confirmed: boolean }[]
  goals?: { name: string; current: number; target: number; projectedDate?: string }[]
  period: 'month' | 'year'
}

function getThresholdColor(spent: number, limit: number): string {
  if (limit <= 0) return colors.green
  const ratio = spent / limit
  if (ratio >= 1) return colors.red
  if (ratio >= 0.8) return colors.amber
  return colors.green
}

export function ChartsView({
  spendingByBucket,
  savingsByBucket = [],
  goals = [],
  period,
}: ChartsViewProps) {
  const [trendData, setTrendData] = useState<MonthlySpend[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const months = period === 'year' ? 12 : 6
    setLoading(true)
    getMonthlySpendHistory(months)
      .then(setTrendData)
      .finally(() => setLoading(false))
  }, [period])

  const hasData = spendingByBucket.length > 0 || savingsByBucket.length > 0
  const hasTrendData = trendData.some(m => m.total > 0)
  const monthsWithData = trendData.filter(m => m.total > 0).length

  // Empty states
  if (!hasData && !hasTrendData) {
    return (
      <View style={styles.emptyFull}>
        <Ionicons name="add-circle-outline" size={40} color={colors.divider} />
        <Text style={styles.emptyTitle}>No transactions yet</Text>
        <Text style={styles.emptySubtext}>Add your first transaction using the + button below</Text>
      </View>
    )
  }

  // Spending by bucket — horizontal bars with threshold colors
  const horizontalBarData = spendingByBucket.map(item => ({
    value: item.value,
    label: item.label,
    frontColor: getThresholdColor(item.value, item.limit),
    topLabelComponent: () => (
      <Text style={styles.barTopLabel}>{formatNPRShort(item.value)}</Text>
    ),
  }))

  // Trend bar chart
  const trendBarData = trendData.map(m => ({
    value: m.total,
    label: m.month,
    frontColor: m.isCurrent ? colors.green : colors.green + '40',
    topLabelComponent: () =>
      m.total > 0 ? (
        <Text style={styles.barTopLabel}>{formatNPRShort(m.total)}</Text>
      ) : null,
  }))

  return (
    <View style={styles.container}>
      {/* Spending by Bucket */}
      {spendingByBucket.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.title}>Spending by Bucket</Text>
          <View style={styles.chartCard}>
            {spendingByBucket.map(item => {
              const ratio = item.limit > 0 ? Math.min(item.value / item.limit, 1) : 0
              const barColor = getThresholdColor(item.value, item.limit)
              return (
                <View key={item.label} style={styles.hBarRow}>
                  <View style={styles.hBarLabelCol}>
                    <Text style={styles.hBarLabel} numberOfLines={1}>{item.label}</Text>
                    <Text style={[styles.hBarAmount, { color: barColor }]}>
                      {formatNPRShort(item.value)} / {formatNPRShort(item.limit)}
                    </Text>
                  </View>
                  <View style={styles.hBarTrack}>
                    <View
                      style={[
                        styles.hBarFill,
                        { width: `${Math.max(ratio * 100, 2)}%`, backgroundColor: barColor },
                      ]}
                    />
                  </View>
                </View>
              )
            })}
          </View>
        </View>
      )}

      {/* Trend Chart */}
      <View style={styles.section}>
        <Text style={styles.title}>
          {period === 'year' ? '12-Month Spending Trend' : '6-Month Spending Trend'}
        </Text>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={colors.green} />
          </View>
        ) : monthsWithData < (period === 'year' ? 2 : 1) ? (
          <View style={styles.chartCard}>
            <View style={styles.emptyChart}>
              <Ionicons name="bar-chart-outline" size={28} color={colors.divider} />
              <Text style={styles.emptyChartText}>
                {period === 'year'
                  ? 'Need at least 2 months of data for annual view'
                  : 'Charts will appear once you have a full month of transactions'}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.chartCard}>
            <BarChart
              data={trendBarData}
              barWidth={period === 'year' ? 18 : 28}
              barBorderTopLeftRadius={4}
              barBorderTopRightRadius={4}
              spacing={period === 'year' ? 10 : 16}
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
        )}
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
                      name={item.confirmed ? 'checkmark-circle' : 'time-outline'}
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
                        backgroundColor: item.confirmed ? colors.green : colors.textMuted,
                      },
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
                  {goal.target > 0 ? Math.round((goal.current / goal.target) * 100) : 0}%
                </Text>
              </View>
              <View style={styles.goalTrack}>
                <View
                  style={[
                    styles.goalFill,
                    { width: `${goal.target > 0 ? Math.min((goal.current / goal.target) * 100, 100) : 0}%` },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
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
  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    borderCurve: 'continuous',
  },
  // Horizontal bar chart styles
  hBarRow: {
    marginBottom: 16,
  },
  hBarLabelCol: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  hBarLabel: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textPrimary,
    flex: 1,
  },
  hBarAmount: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    fontVariant: ['tabular-nums'],
  },
  hBarTrack: {
    height: 10,
    backgroundColor: colors.divider,
    borderRadius: 5,
    overflow: 'hidden',
  },
  hBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  // Trend / bar chart
  barTopLabel: {
    fontSize: 9,
    fontFamily: 'Inter_500Medium',
    color: colors.textSecond,
    marginBottom: 4,
  },
  xLabel: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    width: 40,
    textAlign: 'center',
  },
  loadingBox: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 40,
    alignItems: 'center',
    borderCurve: 'continuous',
  },
  // Empty states
  emptyFull: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textSecond,
  },
  emptySubtext: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 240,
  },
  emptyChart: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 10,
  },
  emptyChartText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 240,
  },
  // Savings grid
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
  // Goals
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
})
