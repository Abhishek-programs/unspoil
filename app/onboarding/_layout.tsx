import { Stack } from 'expo-router'

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="money" />
      <Stack.Screen name="buckets" />
      <Stack.Screen name="ef-floor" />
      <Stack.Screen name="balances" />
    </Stack>
  )
}
