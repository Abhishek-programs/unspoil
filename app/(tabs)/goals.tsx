import { View, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors } from '@/constants/colors'

export default function GoalsScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.pageBg }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.textSecond }}>Goals — coming soon</Text>
      </View>
    </SafeAreaView>
  )
}
