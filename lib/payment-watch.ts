import { NativeModules, Platform } from 'react-native'

export type PaymentWatchApp = {
  packageName: string
  label: string
  iconPath?: string | null
}

const Native = NativeModules.PaymentWatch as
  | {
      isEnabled: () => Promise<boolean>
      hasUsageAccess: () => Promise<boolean>
      hasNotificationPermission: () => Promise<boolean>
      getLogDelayMs: () => Promise<number>
      setLogDelayMs: (delayMs: number) => Promise<boolean>
      setEnabled: (enabled: boolean) => Promise<string>
      openUsageAccessSettings: () => Promise<boolean>
      openNotificationSettings: () => Promise<boolean>
      openBatterySettings: () => Promise<boolean>
      hasBatteryUnrestricted: () => Promise<boolean>
      requestBatteryUnrestricted: () => Promise<boolean>
      setTargetPackages: (packages: string[]) => Promise<boolean>
      getTargetPackages: () => Promise<string[]>
      getLaunchableApps: () => Promise<PaymentWatchApp[]>
      startIfEnabled: () => Promise<boolean>
      showBackupNotice: (channelId: string, title: string, text: string) => Promise<boolean>
      hideBackupNotice: () => Promise<boolean>
      scheduleBackupAlarm: (hour: number, minute: number) => Promise<boolean>
      cancelBackupAlarm: () => Promise<boolean>
      getKeepBackgroundNotification: () => Promise<boolean>
      setKeepBackgroundNotification: (keep: boolean) => Promise<boolean>
      getQueuedPayments: () => Promise<string>
      ackQueuedPayments: (opIds: string[]) => Promise<boolean>
      setHelperSnapshot: (json: string) => Promise<boolean>
      getBackupState: () => Promise<{
        enabled: boolean
        logDelayMs: number
        targetPackages: string[]
        keepBackgroundNotification?: boolean
      }>
      restoreBackupState: (
        enabled: boolean,
        logDelayMs: number,
        targetPackages: string[],
        keepBackgroundNotification: boolean,
      ) => Promise<boolean>
    }
  | undefined

export function isPaymentWatchAvailable(): boolean {
  return Platform.OS === 'android' && Native != null
}

export async function getPaymentWatchEnabled(): Promise<boolean> {
  if (!Native) return false
  return Native.isEnabled()
}

export async function hasPaymentWatchUsageAccess(): Promise<boolean> {
  if (!Native) return false
  return Native.hasUsageAccess()
}

export async function hasPaymentWatchNotificationPermission(): Promise<boolean> {
  if (!Native) return false
  return Native.hasNotificationPermission()
}

export async function getPaymentWatchDelaySeconds(): Promise<number> {
  if (!Native) return 5
  const ms = await Native.getLogDelayMs()
  return Math.round(ms / 1000)
}

export async function setPaymentWatchDelaySeconds(seconds: number): Promise<void> {
  if (!Native) return
  const clamped = Math.max(0, Math.min(60, Math.round(seconds)))
  await Native.setLogDelayMs(clamped * 1000)
}

export async function getPaymentWatchKeepBackgroundNotification(): Promise<boolean> {
  if (!Native?.getKeepBackgroundNotification) return false
  return Native.getKeepBackgroundNotification()
}

export async function setPaymentWatchKeepBackgroundNotification(keep: boolean): Promise<void> {
  if (!Native?.setKeepBackgroundNotification) return
  await Native.setKeepBackgroundNotification(keep)
}

export async function setPaymentWatchEnabled(enabled: boolean): Promise<string> {
  if (!Native) return 'unavailable'
  return Native.setEnabled(enabled)
}

export async function openPaymentWatchUsageSettings(): Promise<void> {
  if (!Native) return
  await Native.openUsageAccessSettings()
}

export async function openPaymentWatchNotificationSettings(): Promise<void> {
  if (!Native) return
  await Native.openNotificationSettings()
}

export async function openPaymentWatchBatterySettings(): Promise<void> {
  if (!Native) return
  await Native.openBatterySettings()
}

export async function hasPaymentWatchBatteryUnrestricted(): Promise<boolean> {
  if (!Native?.hasBatteryUnrestricted) return Platform.OS !== 'android'
  return Native.hasBatteryUnrestricted()
}

export async function requestPaymentWatchBatteryUnrestricted(): Promise<boolean> {
  try {
    if (Native?.requestBatteryUnrestricted) {
      await Native.requestBatteryUnrestricted()
      return true
    }
    if (Native?.openBatterySettings) {
      await Native.openBatterySettings()
      return true
    }
  } catch {
    return false
  }
  return false
}

export async function getPaymentWatchTargetPackages(): Promise<string[]> {
  if (!Native) return []
  return Native.getTargetPackages()
}

export async function setPaymentWatchTargetPackages(packages: string[]): Promise<void> {
  if (!Native) return
  await Native.setTargetPackages(packages)
}

export async function getPaymentWatchLaunchableApps(): Promise<PaymentWatchApp[]> {
  if (!Native) return []
  return Native.getLaunchableApps()
}

export async function startPaymentWatchIfEnabled(): Promise<boolean> {
  if (!Native) return false
  return Native.startIfEnabled()
}

/** JSON array of payments the helper saved while the app was not looking. */
export async function getQueuedPaymentsJson(): Promise<string> {
  if (!Native?.getQueuedPayments) return '[]'
  return Native.getQueuedPayments()
}

export async function ackQueuedPayments(opIds: string[]): Promise<void> {
  if (!Native?.ackQueuedPayments) return
  await Native.ackQueuedPayments(opIds)
}

/** Buckets and currency the helper shows; it cannot read the database itself. */
export async function setHelperSnapshot(json: string): Promise<void> {
  if (!Native?.setHelperSnapshot) return
  await Native.setHelperSnapshot(json)
}

export type PaymentWatchBackupState = {
  enabled: boolean
  logDelayMs: number
  targetPackages: string[]
  keepBackgroundNotification?: boolean
}

export async function getPaymentWatchBackupState(): Promise<PaymentWatchBackupState | null> {
  if (!Native?.getBackupState) return null
  return Native.getBackupState()
}

export async function restorePaymentWatchBackupState(
  state: PaymentWatchBackupState,
): Promise<void> {
  if (!Native?.restoreBackupState) return
  await Native.restoreBackupState(
    state.enabled,
    state.logDelayMs,
    state.targetPackages,
    state.keepBackgroundNotification ?? false,
  )
}

/** Brief progress notice for the nightly backup (Android dev/prod builds only). */
export async function showBackupNotice(channelId: string, title: string, text: string) {
  if (Platform.OS !== 'android' || !Native?.showBackupNotice) return
  await Native.showBackupNotice(channelId, title, text).catch(() => {})
}

export async function hideBackupNotice() {
  if (Platform.OS !== 'android' || !Native?.hideBackupNotice) return
  await Native.hideBackupNotice().catch(() => {})
}

/** Daily alarm that runs the auto-backup in the background (Android). */
export async function scheduleBackupAlarm(hour: number, minute: number) {
  if (Platform.OS !== 'android' || !Native?.scheduleBackupAlarm) return
  await Native.scheduleBackupAlarm(hour, minute).catch(() => {})
}

export async function cancelBackupAlarm() {
  if (Platform.OS !== 'android' || !Native?.cancelBackupAlarm) return
  await Native.cancelBackupAlarm().catch(() => {})
}
