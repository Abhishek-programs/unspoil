import { useEffect } from 'react'
import { View } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated'
import { colors } from '@/constants/colors'

interface ProgressBarProps {
  value: number // 0 to 1+ (can exceed 1 for over-budget)
  height?: number
  color?: string
  trackColor?: string
  /** When 'fill', bar shows balance level (green when high). Default 'deplete' for spend bars. */
  mode?: 'deplete' | 'fill'
}

function getBarColor(value: number, mode: 'deplete' | 'fill'): string {
  if (mode === 'fill') {
    if (value <= 0) return colors.red
    if (value < 0.15) return colors.amber
    return colors.green
  }
  if (value >= 1.0) return colors.red
  if (value >= 0.8) return colors.amber
  return colors.green
}

export function ProgressBar({
  value,
  height = 4,
  color,
  trackColor = '#F0F2F5',
  mode = 'deplete',
}: ProgressBarProps) {
  const clampedWidth = Math.min(Math.max(value, 0), 1)
  const barColor = color ?? getBarColor(value, mode)

  const widthSv = useSharedValue(clampedWidth)

  useEffect(() => {
    widthSv.value = withTiming(clampedWidth, { duration: 300 })
  }, [clampedWidth])

  const fillStyle = useAnimatedStyle(() => ({
    width: `${widthSv.value * 100}%`,
  }))

  return (
    <View
      style={{
        height,
        borderRadius: height / 2,
        backgroundColor: trackColor,
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={[
          {
            height,
            borderRadius: height / 2,
            backgroundColor: barColor,
          },
          fillStyle,
        ]}
      />
    </View>
  )
}
