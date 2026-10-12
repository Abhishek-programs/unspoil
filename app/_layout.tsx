import '../global.css'
import { useEffect, useState } from 'react'
import { Stack, router } from 'expo-router'
import { StatusBar, setStatusBarStyle } from 'expo-status-bar'
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter'
import * as SplashScreen from 'expo-splash-screen'
import { runMigrations } from '@/db/client'
import { seedDefaults } from '@/db/seed'
import { usePlaybookStore } from '@/store/playbook'
import { useBucketsStore } from '@/store/buckets'
import { useTransactionsStore } from '@/store/transactions'
import { useGoalsStore } from '@/store/goals'
import { useLendingStore } from '@/store/lending'
import { getMonthRange, getDaysRemaining } from '@/lib/month'
import {
  requestPermissions,
  setupNotificationChannel,
  checkAndScheduleAll,
  setNudgeToggles,
  setLastNotificationDate,
} from '@/lib/notifications'
import { runMonthRollover } from '@/lib/bucket-balance'
import { runSurplusRollover } from '@/lib/month-surplus'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  })
  const [dbReady, setDbReady] = useState(false)
  const { loadPlaybook, isOnboarded, isLoaded: playbookLoaded } = usePlaybookStore()
  const { loadBuckets } = useBucketsStore()
  const { loadTransactions } = useTransactionsStore()
  const { loadGoals } = useGoalsStore()
  const { loadContacts, loadEntries, loadAllEntries } = useLendingStore()

  useEffect(() => {
    setStatusBarStyle('dark', true)
  }, [])

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
    const pb = usePlaybookStore.getState()
    const { start, end } = getMonthRange(pb.monthStartDay)
    loadBuckets().then(() => {
      if (isOnboarded) {
        runMonthRollover(pb.monthStartDay, pb.lastBalanceRolloverMonth).then(async monthKey => {
          if (monthKey !== pb.lastBalanceRolloverMonth) {
            await pb.updatePlaybook({ lastBalanceRolloverMonth: monthKey })
            await useBucketsStore.getState().loadBuckets()
          }
          const surplusKey = await runSurplusRollover(
            pb.monthStartDay,
            pb.lastSurplusRolloverMonth,
          )
          if (surplusKey !== pb.lastSurplusRolloverMonth) {
            await pb.updatePlaybook({ lastSurplusRolloverMonth: surplusKey })
            await usePlaybookStore.getState().loadPlaybook()
          }
        })
      }
    })
    loadTransactions(start, end)
    loadGoals()
    loadContacts()
    loadAllEntries()
    loadEntries(start, end)
  }, [playbookLoaded, isOnboarded])

  // Notification setup — runs once after onboarding
  useEffect(() => {
    if (!playbookLoaded || !isOnboarded) return
    const pb = usePlaybookStore.getState()
    setNudgeToggles(pb.nudgeToggles)
    setLastNotificationDate(pb.lastNotificationDate)
    setupNotificationChannel()
    requestPermissions()
  }, [playbookLoaded, isOnboarded])

  // Check and schedule nudges when transactions/buckets are loaded
  useEffect(() => {
    if (!playbookLoaded || !isOnboarded) return
    const pb = usePlaybookStore.getState()
    const bs = useBucketsStore.getState()
    const ts = useTransactionsStore.getState()

    if (!bs.isLoaded || !ts.isLoaded) return

    const spendingBuckets = bs.getSpendingBuckets()
    const savingsBuckets = bs.getSavingsBuckets()

    const spentByBucket: Record<string, { spent: number; limit: number; name: string }> = {}
    spendingBuckets.forEach(b => {
      if (b.accumulates) return
      spentByBucket[b.id] = {
        spent: ts.getSpentByBucket(b.id),
        limit: b.monthlyAmount,
        name: b.name,
      }
    })

    const confirmedIds = ts.getConfirmedSavingsBuckets()
    const daysSinceStart = Math.max(0, getDaysRemaining(pb.monthStartDay))
    const unconfirmedSavings = savingsBuckets
      .filter(b => b.showOnHome && !confirmedIds.has(b.id))
      .map(b => ({ name: b.name, daysSinceMonthStart: 30 - daysSinceStart }))

    // EF balance from savings confirm transactions
    const efBucket = bs.buckets.find(b => b.id === 'ef')
    const efBalance = efBucket
      ? ts.transactions
          .filter(t => t.bucketId === efBucket.id && t.remarks === '__savings_confirm__')
          .reduce((sum, t) => sum + t.amount, 0)
      : 0

    const flaggedTxns = ts.flaggedTransactions
    const oldestFlagged = flaggedTxns.length > 0
      ? Math.floor((Date.now() - new Date(flaggedTxns[0].createdAt).getTime()) / 86400000)
      : 0

    checkAndScheduleAll({
      spentByBucket,
      unconfirmedSavings,
      efBalance,
      efFloor: pb.efFloor,
      flaggedCount: flaggedTxns.length,
      flaggedAgeDays: oldestFlagged,
    })
  }, [playbookLoaded, isOnboarded])

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

  const ready = (fontsLoaded || fontError) && dbReady

  return (
    <>
      <StatusBar style="dark" />
      {ready && (
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="lending" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
        </Stack>
      )}
    </>
  )
}
