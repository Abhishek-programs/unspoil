import { View, Text, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { colors } from '@/constants/colors'
import { usePlaybookStore } from '@/store/playbook'

export default function OnboardingScreen() {
  const { setOnboarded } = usePlaybookStore()

  const handleGetStarted = async () => {
    await setOnboarded()
    router.replace('/(tabs)')
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.pageBg, padding: 24 }}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 32, fontFamily: 'Inter_700Bold', color: colors.textPrimary, marginBottom: 12 }}>
          SpendSense
        </Text>
        <Text style={{ fontSize: 16, color: colors.textSecond, textAlign: 'center', marginBottom: 48 }}>
          Your financial plan, tracked automatically.
        </Text>
        <TouchableOpacity
          onPress={handleGetStarted}
          style={{
            backgroundColor: colors.green,
            paddingHorizontal: 32,
            paddingVertical: 16,
            borderRadius: 12,
          }}
        >
          <Text style={{ color: '#FFFFFF', fontFamily: 'Inter_600SemiBold', fontSize: 16 }}>
            Get started
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}
