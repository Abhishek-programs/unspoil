import type { ReactNode, RefObject } from 'react'
import { useCallback, createContext, useContext } from 'react'
import {
  View,
  ScrollView,
  Platform,
  StyleSheet,
  ViewStyle,
  KeyboardAvoidingView,
  type TextInputProps,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors } from '@/constants/colors'
import { useScrollFocusedToTop } from '@/hooks/useKeyboardHeight'

interface OnboardingShellProps {
  children: ReactNode
  footer: ReactNode
  header?: ReactNode
  scrollRef?: RefObject<ScrollView | null>
  contentContainerStyle?: ViewStyle
}

interface FieldScrollContextValue {
  bindField: (key: string) => {
    onFocus: NonNullable<TextInputProps['onFocus']>
  }
}

const FieldScrollContext = createContext<FieldScrollContextValue | null>(null)

export function useOnboardingFieldScroll() {
  const ctx = useContext(FieldScrollContext)
  if (!ctx) {
    throw new Error('useOnboardingFieldScroll must be used inside OnboardingShell')
  }
  return ctx
}

const FOOTER_TOP_PAD = 12

export function OnboardingShell({
  children,
  footer,
  header,
  contentContainerStyle,
}: OnboardingShellProps) {
  const insets = useSafeAreaInsets()
  const { keyboardHeight, scrollRef, scrollHostRef, onInputFocus, onScroll } =
    useScrollFocusedToTop()

  const bindField = useCallback(
    (_key: string) => ({
      onFocus: onInputFocus,
    }),
    [onInputFocus],
  )

  return (
    <FieldScrollContext.Provider value={{ bindField }}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {header}
        <View ref={scrollHostRef} style={styles.scroll} collapsable={false}>
          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={[
              styles.scrollContent,
              contentContainerStyle,
              {
                paddingTop: header ? 16 : Math.max(insets.top, 16),
                paddingBottom: 24 + keyboardHeight,
              },
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
          >
            {children}
          </ScrollView>
        </View>
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          {footer}
        </View>
      </KeyboardAvoidingView>
    </FieldScrollContext.Provider>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.pageBg,
  },
  scroll: {
    flex: 1,
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
