import { useCallback, useEffect, useState } from 'react'
import {
  AppState,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { OnboardingBack } from '@/components/onboarding/OnboardingBack'
import { OnboardingPermissionRow } from '@/components/onboarding/OnboardingPermissionRow'
import { colors } from '@/constants/colors'
import {
  hasNotificationPermission,
  requestPermissions,
  setupNotificationChannel,
} from '@/lib/notifications'
import {
  hasPaymentWatchBatteryUnrestricted,
  isPaymentWatchAvailable,
  requestPaymentWatchBatteryUnrestricted,
} from '@/lib/payment-watch'

export default function OnboardingPermissionsScreen() {
  const insets = useSafeAreaInsets()
  const showBattery = Platform.OS === 'android' && isPaymentWatchAvailable()
  const [notificationsGranted, setNotificationsGranted] = useState(false)
  const [batteryGranted, setBatteryGranted] = useState(!showBattery)

  const refresh = useCallback(async () => {
    const notif = await hasNotificationPermission()
    setNotificationsGranted(notif)
    if (showBattery) {
      setBatteryGranted(await hasPaymentWatchBatteryUnrestricted())
    }
  }, [showBattery])

  useEffect(() => {
    setupNotificationChannel()
    refresh()
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') refresh()
    })
    return () => sub.remove()
  }, [refresh])

  const grantNotifications = async () => {
    await requestPermissions()
    await refresh()
  }

  const grantBattery = async () => {
    await requestPaymentWatchBatteryUnrestricted()
    await refresh()
  }

  return (
    <View style={styles.container}>
      <View style={[styles.content, { paddingTop: Math.max(insets.top, 24) + 8 }]}>
        <OnboardingBack />
        <Animated.View entering={FadeInDown.duration(600).delay(100)}>
          <View style={styles.iconContainer}>
            <Ionicons name="notifications-outline" size={32} color={colors.green} />
          </View>
          <Text style={styles.title}>Welcome!</Text>
          <Text style={styles.subtitle}>
            Let's set some things up first. You can always change these in settings later too.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(600).delay(220)}>
          <View style={styles.card}>
            <OnboardingPermissionRow
              title="Notification permission"
              description="Plan nudges, payment log prompts, and month reminders."
              granted={notificationsGranted}
              onGrant={grantNotifications}
            />
            {showBattery && (
              <>
                <View style={styles.divider} />
                <OnboardingPermissionRow
                  title="Background battery usage"
                  description="Set UnSpoil to Unrestricted so reminders and payment helper are not cut off."
                  granted={batteryGranted}
                  onGrant={grantBattery}
                />
              </>
            )}
          </View>
        </Animated.View>
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        <TouchableOpacity style={styles.button} onPress={() => router.push('/onboarding/money')}>
          <Text style={styles.buttonText}>Next</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.pageBg,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.green + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecond,
    marginBottom: 28,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    borderCurve: 'continuous',
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  button: {
    backgroundColor: colors.green,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    gap: 8,
    borderCurve: 'continuous',
  },
  buttonText: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
  },
})
