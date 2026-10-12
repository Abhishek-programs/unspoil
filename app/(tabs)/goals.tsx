import { View, Text, StyleSheet } from 'react-native'
import { colors } from '@/constants/colors'

export default function GoalsScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Goals</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.placeholder}>Goals — coming soon</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.pageBg,
  },
  header: {
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
  },
})
