import '../global.css'
import { useEffect, useState } from 'react'
import { Stack, router } from 'expo-router'
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter'
import * as SplashScreen from 'expo-splash-screen'
import { runMigrations } from '@/db/client'
import { seedDefaults } from '@/db/seed'
import { usePlaybookStore } from '@/store/playbook'
import { useBucketsStore } from '@/store/buckets'
import { useTransactionsStore } from '@/store/transactions'
import { useGoalsStore } from '@/store/goals'
import { getMonthRange } from '@/lib/month'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  })
  const [dbReady, setDbReady] = useState(false)
  const { loadPlaybook, monthStartDay, isOnboarded, isLoaded: playbookLoaded } = usePlaybookStore()
  const { loadBuckets } = useBucketsStore()
  const { loadTransactions } = useTransactionsStore()
  const { loadGoals } = useGoalsStore()

  useEffect(() => {
    runMigrations()
      .then(() => seedDefaults())
      .then(() => loadPlaybook())
      .catch((e) => {
        console.error('DB setup failed:', e)
        loadPlaybook() // still try to load in case tables already exist
      })
      .finally(() => setDbReady(true))
  }, [])

  useEffect(() => {
    if (!playbookLoaded) return
    const { start, end } = getMonthRange(monthStartDay)
    loadBuckets()
    loadTransactions(start, end)
    loadGoals()
  }, [playbookLoaded])

  useEffect(() => {
    if (!(fontsLoaded || fontError) || !dbReady || !playbookLoaded) return
    SplashScreen.hideAsync()
    if (!isOnboarded) {
      router.replace('/onboarding')
    }
  }, [fontsLoaded, fontError, dbReady, playbookLoaded, isOnboarded])

  // Safety net: force hide splash after 5s
  useEffect(() => {
    const t = setTimeout(() => SplashScreen.hideAsync(), 5000)
    return () => clearTimeout(t)
  }, [])

  if (!fontsLoaded && !fontError) return null
  if (!dbReady) return null

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
    </Stack>
  )
}
