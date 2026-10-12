import { useEffect } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  useAnimatedProps,
  useDerivedValue,
  FadeIn,
  interpolate,
} from 'react-native-reanimated'
import Svg, { Circle, Defs, LinearGradient, Stop, RadialGradient } from 'react-native-svg'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@/constants/colors'
import { formatNPR } from '@/lib/format'

type FinancialStatus = 'on-track' | 'caution' | 'overspending' | 'uncategorized'

interface HeroRingProps {
  totalIncome: number
  available: number
  flaggedAmount: number
  unconfirmedSavings: number
  daysRemaining: number
  weeklyRate: number
  totalSpent: number
  confirmedSavings: number
}

const SIZE = 248
const STROKE = 12
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

function getStatus(
  available: number,
  totalIncome: number,
  flaggedAmount: number,
  daysRemaining: number,
  totalSpent: number,
  confirmedSavings: number,
): { status: FinancialStatus; label: string; icon: string; color: string } {
  if (available < 0) {
    return { status: 'overspending', label: 'Overspending', icon: 'trending-down', color: colors.red }
  }
  if (flaggedAmount > 0) {
    return { status: 'uncategorized', label: 'Needs attention', icon: 'alert-circle', color: colors.amber }
  }
  if (totalIncome > 0 && daysRemaining > 0) {
    const totalDays = 30
    const elapsed = totalDays - daysRemaining
    const elapsedRatio = elapsed / totalDays
    const spentRatio = totalSpent / (totalIncome - confirmedSavings || 1)
    if (spentRatio > elapsedRatio + 0.15) {
      return { status: 'caution', label: 'Spending fast', icon: 'speedometer', color: colors.amber }
    }
  }
  return { status: 'on-track', label: 'On track', icon: 'trending-up', color: colors.green }
}

export function HeroRing({
  totalIncome,
  available,
  flaggedAmount,
  unconfirmedSavings,
  daysRemaining,
  weeklyRate,
  totalSpent,
  confirmedSavings,
}: HeroRingProps) {
  const isOverspent = available < 0
  const cx = SIZE / 2
  const cy = SIZE / 2

  const { label: statusLabel, icon: statusIcon, color: statusColor } = getStatus(
    available, totalIncome, flaggedAmount, daysRemaining, totalSpent, confirmedSavings,
  )

  const denom = totalIncome > 0 ? totalIncome : 1
  
  // Shared values for animation
  const usedRatioSV = useSharedValue(0)
  const yellowRatioSV = useSharedValue(0)
  const greyRatioSV = useSharedValue(0)
  const centerPulse = useSharedValue(0)

  useEffect(() => {
    const targetUsed = Math.max(0, Math.min((totalSpent + confirmedSavings) / denom, 1))
    const targetYellow = Math.max(0, Math.min(flaggedAmount / denom, 1 - targetUsed))
    const targetGrey = Math.max(0, Math.min(unconfirmedSavings / denom, 1 - targetUsed - targetYellow))

    usedRatioSV.value = withTiming(targetUsed, { duration: 1200, easing: Easing.out(Easing.exp) })
    yellowRatioSV.value = withTiming(targetYellow, { duration: 1200, easing: Easing.out(Easing.exp) })
    greyRatioSV.value = withTiming(targetGrey, { duration: 1200, easing: Easing.out(Easing.exp) })

    centerPulse.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    )
  }, [totalSpent, confirmedSavings, flaggedAmount, unconfirmedSavings, denom])

  // Animated props for Green arc
  const greenProps = useAnimatedProps(() => {
    const offset = CIRCUMFERENCE * (1 - usedRatioSV.value)
    return {
      strokeDashoffset: offset,
    }
  })

  // Animated props for Yellow arc
  const yellowProps = useAnimatedProps(() => {
    const dash = CIRCUMFERENCE * yellowRatioSV.value
    const gap = CIRCUMFERENCE * (1 - yellowRatioSV.value)
    const rotation = -90 + usedRatioSV.value * 360
    return {
      strokeDasharray: `${dash} ${gap}`,
      rotation: rotation,
    }
  })

  // Animated props for Grey arc
  const greyProps = useAnimatedProps(() => {
    const dash = CIRCUMFERENCE * greyRatioSV.value
    const gap = CIRCUMFERENCE * (1 - greyRatioSV.value)
    const rotation = -90 + (usedRatioSV.value + yellowRatioSV.value) * 360
    return {
      strokeDasharray: `${dash} ${gap}`,
      rotation: rotation,
    }
  })

  // Subtle floating animation for pill
  const pillY = useSharedValue(0)
  useEffect(() => {
    pillY.value = withRepeat(
      withSequence(
        withTiming(-3, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
        withTiming(3, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    )
  }, [])
  const pillAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: pillY.value }],
  }))

  const centerAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(centerPulse.value, [0, 1], [1, 1.02]) }],
    opacity: interpolate(centerPulse.value, [0, 1], [0.95, 1]),
  }))

  return (
    <Animated.View entering={FadeIn.duration(800)} style={styles.container}>
      {/* Floating pill — overlapping ring edge */}
      <Animated.View style={[styles.pill, pillAnimStyle]}>
        <View style={[styles.pillDot, isOverspent && { backgroundColor: colors.red }]} />
        <Text style={styles.pillText}>{daysRemaining} days left</Text>
      </Animated.View>

      <Svg width={SIZE} height={SIZE}>
        <Defs>
          <LinearGradient id="greenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={colors.green} stopOpacity="0.8" />
            <Stop offset="100%" stopColor={colors.green} stopOpacity="1" />
          </LinearGradient>
          <LinearGradient id="yellowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={colors.amber} stopOpacity="0.8" />
            <Stop offset="100%" stopColor={colors.amber} stopOpacity="1" />
          </LinearGradient>
          <LinearGradient id="redGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={colors.red} stopOpacity="0.8" />
            <Stop offset="100%" stopColor={colors.red} stopOpacity="1" />
          </LinearGradient>
          <RadialGradient id="centerGlow" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <Stop offset="0%" stopColor={statusColor} stopOpacity="0.08" />
            <Stop offset="100%" stopColor={statusColor} stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* Background track */}
        <Circle
          cx={cx}
          cy={cy}
          r={RADIUS}
          stroke="#E8EAED"
          strokeWidth={STROKE}
          fill="none"
        />

        {/* Center Glow */}
        {!isOverspent && (
          <Circle
            cx={cx}
            cy={cy}
            r={RADIUS - 20}
            fill="url(#centerGlow)"
          />
        )}

        {isOverspent ? (
          <AnimatedCircle
            cx={cx}
            cy={cy}
            r={RADIUS}
            stroke="url(#redGrad)"
            strokeWidth={STROKE}
            fill="none"
            strokeLinecap="round"
            animatedProps={greenProps} // Reuse green props for full ring animation
          />
        ) : (
          <>
            {/* Grey dashed — unconfirmed savings */}
            <AnimatedCircle
              cx={cx}
              cy={cy}
              r={RADIUS}
              stroke={colors.textMuted}
              strokeWidth={STROKE - 4}
              fill="none"
              strokeLinecap="round"
              origin={`${cx}, ${cy}`}
              opacity={0.3}
              animatedProps={greyProps}
            />

            {/* Yellow — flagged amount */}
            <AnimatedCircle
              cx={cx}
              cy={cy}
              r={RADIUS}
              stroke="url(#yellowGrad)"
              strokeWidth={STROKE}
              fill="none"
              strokeLinecap="round"
              origin={`${cx}, ${cy}`}
              animatedProps={yellowProps}
            />

            {/* Green arc — money allocated */}
            <AnimatedCircle
              cx={cx}
              cy={cy}
              r={RADIUS}
              stroke="url(#greenGrad)"
              strokeWidth={STROKE}
              fill="none"
              strokeDasharray={`${CIRCUMFERENCE}`}
              strokeLinecap="round"
              rotation={-90}
              origin={`${cx}, ${cy}`}
              animatedProps={greenProps}
            />
          </>
        )}
      </Svg>

      {/* Center text overlay */}
      <Animated.View style={[styles.centerText, centerAnimStyle]}>
        <Text style={styles.label}>SAFE TO SPEND</Text>
        <Text style={[styles.amount, isOverspent && { color: colors.red }]}>
          {isOverspent ? '-' : ''}NPR {formatNPR(Math.abs(available))}
        </Text>
        {/* Status badge */}
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '14' }]}>
          <Ionicons name={statusIcon as any} size={13} color={statusColor} />
          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </Animated.View>

      {/* Weekly rate — below ring */}
      <Text style={styles.weekly}>
        ≈ NPR {formatNPR(Math.round(weeklyRate))}/week
      </Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 16,
    paddingBottom: 12,
    position: 'relative',
  },
  centerText: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textMuted,
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  amount: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  weekly: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    marginTop: 8,
    marginBottom: 4,
  },
  pill: {
    position: 'absolute',
    top: 28,
    right: 30,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.06)',
    elevation: 3,
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.green,
    marginRight: 6,
  },
  pillText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textPrimary,
  },
})
