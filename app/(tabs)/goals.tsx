import { useState, useMemo } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@/constants/colors'
import { useGoalsStore, type Goal } from '@/store/goals'
import { useTransactionsStore } from '@/store/transactions'
import { useBucketsStore } from '@/store/buckets'
import { GoalCard } from '@/components/goals/GoalCard'
import { GoalDetailSheet } from '@/components/goals/GoalDetailSheet'

export default function GoalsScreen() {
  const { goals } = useGoalsStore()
  const { transactions } = useTransactionsStore()
  const { buckets } = useBucketsStore()

  const [selectedGoal, setSelectedGoal] = useState<(Goal & { current: number; color: string }) | null>(null)
  const [detailVisible, setDetailVisible] = useState(false)

  const goalsWithStatus = useMemo(() => {
    return goals.map(goal => {
      const current = transactions
        .filter(t => goal.linkedBucketIds.includes(t.bucketId))
        .reduce((sum, t) => sum + t.amount, 0)
      
      const bucket = buckets.find(b => goal.linkedBucketIds.includes(b.id))
      
      return {
        ...goal,
        current: goal.startBalance + current,
        color: bucket?.color || colors.green,
      }
    })
  }, [goals, transactions, buckets])

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Vault</Text>
        <TouchableOpacity style={styles.addButton} hitSlop={12}>
          <Ionicons name="add" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Savings Portfolio</Text>
          <Text style={styles.summaryValue}>
            NPR {goalsWithStatus.reduce((sum, g) => sum + g.current, 0).toLocaleString()}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Active Goals</Text>
        {goalsWithStatus.map(goal => (
          <GoalCard
            key={goal.id}
            name={goal.name}
            current={goal.current}
            target={goal.targetAmount}
            monthly={goal.monthlyContribution}
            color={goal.color}
            onPress={() => {
              setSelectedGoal(goal)
              setDetailVisible(true)
            }}
          />
        ))}

        {goals.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="leaf-outline" size={48} color={colors.divider} />
            <Text style={styles.emptyText}>No goals yet. Start saving for something big!</Text>
            <TouchableOpacity style={styles.emptyButton}>
              <Text style={styles.emptyButtonText}>Create first goal</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <GoalDetailSheet
        goal={selectedGoal}
        visible={detailVisible}
        onClose={() => {
          setDetailVisible(false)
          setSelectedGoal(null)
        }}
      />
    </View>
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
    paddingTop: 64,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryCard: {
    backgroundColor: colors.greenFill,
    borderRadius: 24,
    padding: 24,
    marginBottom: 32,
    borderCurve: 'continuous',
  },
  summaryLabel: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: colors.green,
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    color: colors.green,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
    marginLeft: 4,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
    maxWidth: 240,
  },
  emptyButton: {
    backgroundColor: colors.green,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
})
