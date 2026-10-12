import { useState } from 'react'
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@/constants/colors'
import { formatNPR, formatNPRShort } from '@/lib/format'
import { useGoalsStore, type Goal } from '@/store/goals'
import { projectGoal } from '@/lib/projection'
import { PieChart } from 'react-native-gifted-charts'

interface GoalDetailSheetProps {
  goal: (Goal & { current: number; color: string }) | null
  visible: boolean
  onClose: () => void
  onEdit?: (goal: Goal) => void
}

export function GoalDetailSheet({ goal, visible, onClose, onEdit }: GoalDetailSheetProps) {
  const { deleteGoal } = useGoalsStore()

  if (!goal) return null

  const handleDelete = () => {
    Alert.alert(
      'Delete Goal',
      `Are you sure you want to delete "${goal.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteGoal(goal.id)
            onClose()
          },
        },
      ],
    )
  }

  const percent = Math.min((goal.current / goal.targetAmount) * 100, 100)
  const { projectedDate, monthsRemaining, nudge } = projectGoal({ 
    current: goal.current, 
    target: goal.targetAmount, 
    monthly: goal.monthlyContribution 
  })

  const pieData = [
    { value: percent, color: goal.color },
    { value: 100 - percent, color: colors.divider },
  ]

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Goal Details</Text>
          <TouchableOpacity hitSlop={12} onPress={() => onEdit?.(goal)}>
            <Text style={styles.editLink}>Edit</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Main Chart */}
          <View style={styles.chartContainer}>
            <PieChart
              data={pieData}
              donut
              radius={100}
              innerRadius={80}
              innerCircleColor={colors.pageBg}
              centerLabelComponent={() => (
                <View style={{ alignItems: 'center' }}>
                  <Text style={styles.chartPercent}>{Math.round(percent)}%</Text>
                  <Text style={styles.chartLabel}>Complete</Text>
                </View>
              )}
            />
          </View>

          {/* Key Stats */}
          <View style={styles.goalInfo}>
            <Text style={styles.goalName}>{goal.name}</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Contributed</Text>
                <Text style={styles.statValue}>{formatNPRShort(goal.current)}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Monthly</Text>
                <Text style={styles.statValue}>{formatNPRShort(goal.monthlyContribution)}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Target</Text>
                <Text style={styles.statValue}>{formatNPRShort(goal.targetAmount)}</Text>
              </View>
            </View>
          </View>

          {/* Projection Card */}
          <View style={styles.projectionCard}>
            <View style={styles.projectionHeader}>
              <Ionicons name="sparkles-outline" size={20} color={colors.green} />
              <Text style={styles.projectionTitle}>Projection</Text>
            </View>
            <Text style={styles.projectionHero}>
              Estimated completion: <Text style={{ color: colors.green }}>{projectedDate}</Text>
            </Text>
            <Text style={styles.projectionSub}>
              {monthsRemaining} month{monthsRemaining !== 1 ? 's' : ''} of contributions remaining.
            </Text>
            
            {nudge && (
              <View style={styles.nudgeBox}>
                <Text style={styles.nudgeText}>
                  Increase monthly by <Text style={styles.nudgeHighlight}>{formatNPR(nudge.amount)}</Text> to reach your goal <Text style={styles.nudgeHighlight}>{nudge.monthsSaved} month{nudge.monthsSaved > 1 ? 's' : ''} earlier</Text>.
                </Text>
              </View>
            )}
          </View>

          {/* Allocation */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Asset Allocation</Text>
            <View style={styles.allocationRow}>
              <View style={styles.allocationBarContainer}>
                <View style={[styles.allocationBar, { width: '60%', backgroundColor: goal.color }]} />
                <View style={[styles.allocationBar, { width: '40%', backgroundColor: goal.color + '44' }]} />
              </View>
              <View style={styles.allocationLegend}>
                <View style={styles.legendEntry}>
                  <View style={[styles.legendDot, { backgroundColor: goal.color }]} />
                  <Text style={styles.legendText}>Equity (60%)</Text>
                </View>
                <View style={styles.legendEntry}>
                  <View style={[styles.legendDot, { backgroundColor: goal.color + '44' }]} />
                  <Text style={styles.legendText}>Debt (40%)</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Delete */}
          <View style={styles.section}>
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={18} color={colors.red} />
              <Text style={styles.deleteText}>Delete Goal</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.pageBg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textPrimary,
  },
  editLink: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: colors.green,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  chartContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  chartPercent: {
    fontSize: 32,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
  },
  chartLabel: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: colors.textMuted,
  },
  goalInfo: {
    alignItems: 'center',
    marginBottom: 32,
  },
  goalName: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    paddingHorizontal: 20,
    gap: 12,
  },
  statItem: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderCurve: 'continuous',
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: colors.textMuted,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
  },
  projectionCard: {
    marginHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    borderCurve: 'continuous',
    marginBottom: 32,
  },
  projectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  projectionTitle: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  projectionHero: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  projectionSub: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecond,
  },
  nudgeBox: {
    marginTop: 20,
    padding: 14,
    backgroundColor: colors.greenFill,
    borderRadius: 12,
  },
  nudgeText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textPrimary,
    lineHeight: 18,
  },
  nudgeHighlight: {
    fontFamily: 'Inter_700Bold',
    color: colors.green,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: colors.textMuted,
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  allocationRow: {
    gap: 16,
  },
  allocationBarContainer: {
    height: 12,
    backgroundColor: colors.divider,
    borderRadius: 6,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  allocationBar: {
    height: '100%',
  },
  allocationLegend: {
    flexDirection: 'row',
    gap: 24,
  },
  legendEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecond,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.red + '30',
    backgroundColor: colors.red + '08',
  },
  deleteText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: colors.red,
  },
})
