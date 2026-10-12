import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@/constants/colors'
import { formatNPRShort } from '@/lib/format'

interface NetWorthCardProps {
  netWorth: number
  monthGrowth: number
  assets: number
  liabilities: number
  savingsRate: number
  breakdown?: { label: string; value: number }[]
}

export function NetWorthCard({ 
  netWorth, 
  monthGrowth, 
  assets, 
  liabilities, 
  savingsRate,
  breakdown = []
}: NetWorthCardProps) {
  const [expanded, setExpanded] = useState(false)

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setExpanded(!expanded)
  }

  return (
    <TouchableOpacity 
      style={styles.container} 
      activeOpacity={0.9}
      onPress={toggleExpand}
    >
      <View style={styles.header}>
        <View style={styles.mainInfo}>
          <Text style={styles.label}>Net worth</Text>
          <Text style={styles.value}>{formatNPRShort(netWorth)}</Text>
          <Text style={[styles.growth, monthGrowth >= 0 ? { color: colors.green } : { color: colors.red }]}>
            {monthGrowth >= 0 ? '+' : ''}{formatNPRShort(monthGrowth)} this month
          </Text>
        </View>
        <Ionicons 
          name={expanded ? "chevron-up" : "chevron-down"} 
          size={20} 
          color={colors.textMuted} 
        />
      </View>

      <View style={styles.pills}>
        <View style={styles.pill}>
          <Text style={styles.pillLabel}>Assets</Text>
          <Text style={styles.pillValue}>{formatNPRShort(assets)}</Text>
        </View>
        <View style={styles.pill}>
          <Text style={styles.pillLabel}>Liabilities</Text>
          <Text style={styles.pillValue}>{formatNPRShort(liabilities)}</Text>
        </View>
        <View style={[styles.pill, { backgroundColor: colors.greenFill }]}>
          <Text style={[styles.pillLabel, { color: colors.green }]}>Savings Rate</Text>
          <Text style={[styles.pillValue, { color: colors.green }]}>{Math.round(savingsRate)}%</Text>
        </View>
      </View>

      {expanded && (
        <View style={styles.breakdown}>
          <View style={styles.divider} />
          {breakdown.length > 0 ? (
            breakdown.map((item) => (
              <View key={item.label} style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>{item.label}</Text>
                <Text style={styles.breakdownValue}>{formatNPRShort(item.value)}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyBreakdown}>
              Add goals in the Vault tab to see your asset breakdown here.
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
    borderCurve: 'continuous',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  mainInfo: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: colors.textMuted,
    marginBottom: 4,
  },
  value: {
    fontSize: 32,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  growth: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  pills: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    flex: 1,
    backgroundColor: colors.pageBg,
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderCurve: 'continuous',
  },
  pillLabel: {
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  pillValue: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
  },
  breakdown: {
    marginTop: 20,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginBottom: 16,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  breakdownLabel: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecond,
  },
  breakdownValue: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textPrimary,
  },
  emptyBreakdown: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 8,
  },
})
