import { View, Text, ViewStyle } from 'react-native'
import { colors } from '@/constants/colors'

type ChipVariant = 'green' | 'amber' | 'red' | 'muted'

interface ChipProps {
  label: string
  variant?: ChipVariant
  style?: ViewStyle
}

const variantStyles: Record<ChipVariant, { bg: string; text: string }> = {
  green: { bg: colors.greenFill, text: colors.green },
  amber: { bg: colors.amberFill, text: colors.amber },
  red: { bg: '#FEE2E2', text: colors.red },
  muted: { bg: '#F3F4F6', text: colors.textMuted },
}

export function Chip({ label, variant = 'muted', style }: ChipProps) {
  const { bg, text } = variantStyles[variant]
  return (
    <View
      style={[
        {
          backgroundColor: bg,
          borderRadius: 100,
          paddingHorizontal: 10,
          paddingVertical: 3,
          alignSelf: 'flex-start',
        },
        style,
      ]}
    >
      <Text style={{ fontSize: 12, color: text, fontFamily: 'Inter_500Medium' }}>
        {label}
      </Text>
    </View>
  )
}
