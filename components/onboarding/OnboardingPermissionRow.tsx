import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@/constants/colors'

type Props = {
  title: string
  description: string
  granted: boolean
  onGrant: () => void
}

export function OnboardingPermissionRow({ title, description, granted, onGrant }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      {granted ? (
        <View style={styles.check} accessibilityLabel={`${title} granted`}>
          <Ionicons name="checkmark" size={22} color={colors.green} />
        </View>
      ) : (
        <TouchableOpacity
          style={styles.grantBtn}
          onPress={onGrant}
          accessibilityRole="button"
          accessibilityLabel={`Grant ${title}`}
        >
          <Text style={styles.grantText}>Grant</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  copy: { flex: 1 },
  title: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecond,
  },
  grantBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.surface,
  },
  grantText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textPrimary,
  },
  check: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
