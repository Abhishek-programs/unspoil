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
      setTargetPackages: (packages: string[]) => Promise<boolean>
      getTargetPackages: () => Promise<string[]>
      getLaunchableApps: () => Promise<PaymentWatchApp[]>
      startIfEnabled: () => Promise<boolean>
      getBackupState: () => Promise<{
        enabled: boolean
        logDelayMs: number
        targetPackages: string[]
      }>
      restoreBackupState: (
        enabled: boolean,
        logDelayMs: number,
        targetPackages: string[],
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

export type PaymentWatchBackupState = {
  enabled: boolean
  logDelayMs: number
  targetPackages: string[]
}

export async function getPaymentWatchBackupState(): Promise<PaymentWatchBackupState | null> {
  if (!Native?.getBackupState) return null
  return Native.getBackupState()
}

export async function restorePaymentWatchBackupState(
  state: PaymentWatchBackupState,
): Promise<void> {
  if (!Native?.restoreBackupState) return
  await Native.restoreBackupState(state.enabled, state.logDelayMs, state.targetPackages)
}
