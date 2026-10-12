import { View, Text, StyleSheet } from 'react-native'
import { colors } from '@/constants/colors'
import { formatNPR, formatNPRShort } from '@/lib/format'
import { ProgressBar } from '@/components/ui/ProgressBar'

interface EFGoalCardProps {
  current: number
  target: number
  monthlyContribution: number
}

export function EFGoalCard({ current, target, monthlyContribution }: EFGoalCardProps) {
  if (target <= 0) return null

  const progress = Math.min(1, current / target)
  const pct = Math.round(progress * 100)

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.icon}>🛡️</Text>
        <View style={styles.info}>
          <Text style={styles.title}>Emergency Fund</Text>
          <Text style={styles.subtitle}>
            NPR {formatNPR(current)} of {formatNPRShort(target)} · {pct}%
          </Text>
        </View>
        <Text style={styles.monthly}>+{formatNPRShort(monthlyContribution)}/mo</Text>
      </View>
      <ProgressBar value={progress} height={6} />
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderCurve: 'continuous',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  icon: { fontSize: 22, marginRight: 12 },
  info: { flex: 1 },
  title: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  monthly: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: colors.green,
    fontVariant: ['tabular-nums'],
  },
})
