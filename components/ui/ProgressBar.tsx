import { useEffect } from 'react'
import { View } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated'
import { colors } from '@/constants/colors'

interface ProgressBarProps {
  value: number
  height?: number
  color?: string
  trackColor?: string
  mode?: 'deplete' | 'fill'
  /** green | red | optional darkRed (overshoot) | optional grey (Personal headroom) */
  segments?: { green: number; red: number; darkRed?: number; grey?: number }
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
  segments,
}: ProgressBarProps) {
  if (segments) {
    let green = Math.max(0, segments.green)
    let red = Math.max(0, segments.red)
    let darkRed = Math.max(0, segments.darkRed ?? 0)
    let grey = Math.max(0, segments.grey ?? 0)
    const sum = green + red + darkRed + grey
    if (sum > 1.0001) {
      green /= sum
      red /= sum
      darkRed /= sum
      grey /= sum
    }

    return (
      <View
        style={{
          height,
          borderRadius: height / 2,
          backgroundColor: trackColor,
          overflow: 'hidden',
          flexDirection: 'row',
        }}
      >
        {green > 0.0005 && (
          <View style={{ flex: green, backgroundColor: colors.green, height }} />
        )}
        {red > 0.0005 && (
          <View style={{ flex: red, backgroundColor: colors.red, height }} />
        )}
        {darkRed > 0.0005 && (
          <View style={{ flex: darkRed, backgroundColor: colors.redDark, height }} />
        )}
        {grey > 0.0005 && (
          <View style={{ flex: grey, backgroundColor: colors.border, height }} />
        )}
      </View>
    )
  }

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
