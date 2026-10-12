import { View } from 'react-native'
import { colors } from '@/constants/colors'

interface ProgressBarProps {
  value: number // 0 to 1+ (can exceed 1 for over-budget)
  height?: number
}

function getBarColor(value: number): string {
  if (value >= 1.0) return colors.red
  if (value >= 0.8) return colors.amber
  return colors.green
}

export function ProgressBar({ value, height = 4 }: ProgressBarProps) {
  const clampedWidth = Math.min(value, 1)
  const color = getBarColor(value)
  return (
    <View
      style={{
        height,
        borderRadius: height / 2,
        backgroundColor: '#F0F2F5',
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          height,
          width: `${clampedWidth * 100}%`,
          borderRadius: height / 2,
          backgroundColor: color,
        }}
      />
    </View>
  )
}
