import { NativeModules, Platform } from 'react-native'

const Native = NativeModules.PaymentWatch as
  | {
      isEnabled: () => Promise<boolean>
      hasUsageAccess: () => Promise<boolean>
      setEnabled: (enabled: boolean) => Promise<string>
      openUsageAccessSettings: () => Promise<boolean>
      startIfEnabled: () => Promise<boolean>
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

export async function setPaymentWatchEnabled(enabled: boolean): Promise<string> {
  if (!Native) return 'unavailable'
  return Native.setEnabled(enabled)
}

export async function openPaymentWatchUsageSettings(): Promise<void> {
  if (!Native) return
  await Native.openUsageAccessSettings()
}

export async function startPaymentWatchIfEnabled(): Promise<boolean> {
  if (!Native) return false
  return Native.startIfEnabled()
}
