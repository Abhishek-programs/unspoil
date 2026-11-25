import type { ReactNode, RefObject } from 'react'
import { View, StyleSheet, ViewStyle, type ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors } from '@/constants/colors'
import { KeyboardForm } from '@/components/ui/KeyboardForm'

interface OnboardingShellProps {
  children: ReactNode
  footer: ReactNode
  header?: ReactNode
  scrollRef?: RefObject<ScrollView | null>
  contentContainerStyle?: ViewStyle
}

const FOOTER_TOP_PAD = 12

export function OnboardingShell({
  children,
  footer,
  header,
  scrollRef,
  contentContainerStyle,
}: OnboardingShellProps) {
  const insets = useSafeAreaInsets()

  return (
    <View style={styles.container}>
      {header}
      <KeyboardForm
        ref={scrollRef}
        contentContainerStyle={[
          styles.scrollContent,
          contentContainerStyle,
          {
            paddingTop: header ? 16 : Math.max(insets.top, 16),
            paddingBottom: 24,
          },
        ]}
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        footerKeyboardTuck={insets.bottom}
        footer={
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            {footer}
          </View>
        }
      >
        {children}
      </KeyboardForm>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.pageBg,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: FOOTER_TOP_PAD,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.pageBg,
  },
})
