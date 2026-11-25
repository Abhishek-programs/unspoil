import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@/constants/colors'
import type { PaymentWatchApp } from '@/lib/payment-watch'

type Props = {
  app: PaymentWatchApp
  selected: boolean
  onToggle: (packageName: string) => void
}

export function PaymentWatchAppRow({ app, selected, onToggle }: Props) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => onToggle(app.packageName)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
    >
      {app.iconPath ? (
        <Image source={{ uri: `file://${app.iconPath}` }} style={styles.icon} />
      ) : (
        <View style={styles.iconPlaceholder} />
      )}
      <Text style={styles.label}>{app.label}</Text>
      <Ionicons
        name={selected ? 'checkmark-circle' : 'ellipse-outline'}
        size={23}
        color={selected ? colors.green : colors.textMuted}
      />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingVertical: 4,
  },
  icon: { width: 34, height: 34, borderRadius: 8, marginRight: 12 },
  iconPlaceholder: {
    width: 34,
    height: 34,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: colors.border,
  },
  label: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textPrimary,
  },
})
