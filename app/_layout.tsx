import '../global.css'
import '@/lib/auto-backup-task'
import { useEffect, useState } from 'react'
import { AppState } from 'react-native'
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
import { useAccountsStore } from '@/store/accounts'
import { getMonthRange, toLocalDateKey } from '@/lib/month'
import { currentMonthKey } from '@/lib/bucket-balance'
import {
  requestPermissions,
  setupNotificationChannel,
  checkAndScheduleAll,
  computeEfBalance,
} from '@/lib/notifications'
import { runMonthRollover } from '@/lib/bucket-balance'
import { runSurplusRollover } from '@/lib/month-surplus'
import { startPaymentWatchIfEnabled } from '@/lib/payment-watch'
import { runAutoBackupJob } from '@/lib/auto-backup'
import { syncAutoBackupSchedule } from '@/lib/auto-backup-schedule'

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
  const { loadBuckets, isLoaded: bucketsLoaded } = useBucketsStore()
  const { loadTransactions, loadAllTransactions, isLoaded: transactionsLoaded } =
    useTransactionsStore()
  const { loadGoals } = useGoalsStore()
  const { loadContacts, loadEntries, loadAllEntries } = useLendingStore()
  const { loadAccounts } = useAccountsStore()

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
    const { start, end } = getMonthRange(pb.monthStartDay, pb.earlyMonthStartDate)
    loadBuckets().then(() => {
      if (isOnboarded) {
        runMonthRollover(
          pb.monthStartDay,
          pb.lastBalanceRolloverMonth,
          pb.earlyMonthStartDate,
        ).then(async monthKey => {
          if (monthKey !== pb.lastBalanceRolloverMonth) {
            await usePlaybookStore.getState().loadPlaybook()
            await usePlaybookStore.getState().updatePlaybook({ lastBalanceRolloverMonth: monthKey })
            await useBucketsStore.getState().loadBuckets()
          }
          const surplusKey = await runSurplusRollover(
            pb.monthStartDay,
            pb.lastSurplusRolloverMonth,
            pb.earlyMonthStartDate,
          )
          if (surplusKey !== pb.lastSurplusRolloverMonth) {
            await usePlaybookStore.getState().loadPlaybook()
            await usePlaybookStore.getState().updatePlaybook({ lastSurplusRolloverMonth: surplusKey })
          }
          if (
            pb.earlyMonthStartDate &&
            toLocalDateKey(start) !== pb.earlyMonthStartDate
          ) {
            await usePlaybookStore.getState().updatePlaybook({
              earlyMonthStartDate: null,
            })
          }
        })
      }
    })
    loadTransactions(start, end)
    loadAllTransactions()
    loadGoals()
    loadContacts()
    loadAllEntries()
    loadEntries(start, end)
    loadAccounts()
  }, [playbookLoaded, isOnboarded])

  // Notification setup — runs once after onboarding
  useEffect(() => {
    if (!playbookLoaded || !isOnboarded) return
    setupNotificationChannel()
    requestPermissions()
    startPaymentWatchIfEnabled()
    const pb = usePlaybookStore.getState()
    void syncAutoBackupSchedule(pb.autoBackup)
    void runAutoBackupJob()
  }, [playbookLoaded, isOnboarded])

  useEffect(() => {
    if (!playbookLoaded || !isOnboarded) return
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return
      const pb = usePlaybookStore.getState()
      const { start, end } = getMonthRange(pb.monthStartDay, pb.earlyMonthStartDate)
      loadTransactions(start, end)
      startPaymentWatchIfEnabled()
      void runAutoBackupJob()
    })
    return () => sub.remove()
  }, [playbookLoaded, isOnboarded, loadTransactions])

  // Check and schedule nudges when transactions/buckets are loaded
  useEffect(() => {
    if (!playbookLoaded || !isOnboarded) return
    const pb = usePlaybookStore.getState()
    const bs = useBucketsStore.getState()
    const ts = useTransactionsStore.getState()

    if (!bs.isLoaded || !ts.isLoaded) return

    const { start } = getMonthRange(pb.monthStartDay, pb.earlyMonthStartDate)
    const periodKey = currentMonthKey(pb.monthStartDay, pb.earlyMonthStartDate)
    const startMs = start.getTime()
    const daysSincePeriodStart = Math.max(
      0,
      Math.floor((Date.now() - startMs) / 86400000),
    )

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
    const unconfirmedSavings = savingsBuckets
      .filter(b => b.showOnHome && !confirmedIds.has(b.id))
      .map(b => ({
        id: b.id,
        name: b.name,
        daysSinceMonthStart: daysSincePeriodStart,
      }))

    const efBalance = computeEfBalance(pb.efStartBalance, ts.allTransactions)

    const recurringDraftCount = ts.allTransactions.filter(t => t.isRecurringDraft).length

    const flaggedTxns = ts.flaggedTransactions
    const oldestFlagged = flaggedTxns.length > 0
      ? Math.floor((Date.now() - new Date(flaggedTxns[0].createdAt).getTime()) / 86400000)
      : 0

    checkAndScheduleAll({
      periodKey,
      spentByBucket,
      unconfirmedSavings,
      efBalance,
      efFloor: pb.efFloor,
      recurringDraftCount,
      daysSincePeriodStart,
      flaggedCount: flaggedTxns.length,
      flaggedAgeDays: oldestFlagged,
    })
  }, [playbookLoaded, isOnboarded, bucketsLoaded, transactionsLoaded])

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
          <Stack.Screen name="notification-settings" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
        </Stack>
      )}
    </>
  )
}
