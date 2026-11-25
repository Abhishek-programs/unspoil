import { forwardRef, useState, type ReactNode } from 'react'
import { StyleSheet, type ScrollView, type StyleProp, type ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  KeyboardAvoidingView,
  KeyboardAwareScrollView,
  KeyboardStickyView,
  type KeyboardAwareScrollViewProps,
} from 'react-native-keyboard-controller'

/** Space kept between the focused field and the keyboard (or the footer above it). */
export const KEYBOARD_FIELD_GAP = 24

type KeyboardFormProps = KeyboardAwareScrollViewProps & {
  children?: ReactNode
  /** Pinned under the scroll area; rides up on top of the keyboard while it is open. */
  footer?: ReactNode
  /**
   * How far to tuck the footer down while the keyboard is open, usually the
   * footer's own bottom safe-area padding (the keyboard already covers that area).
   */
  footerKeyboardTuck?: number
}

/**
 * The one way to lay out a screen or sheet with text inputs.
 *
 * Scrolls the focused field above the keyboard (Android edge-to-edge no longer
 * resizes the window for the keyboard, so `adjustResize` alone does nothing).
 * Render it inside a flex column, e.g. a `SafeAreaView` with `flex: 1`.
 */
export const KeyboardForm = forwardRef<ScrollView, KeyboardFormProps>(function KeyboardForm(
  {
    children,
    footer,
    footerKeyboardTuck = 0,
    bottomOffset = KEYBOARD_FIELD_GAP,
    style,
    keyboardShouldPersistTaps = 'handled',
    ...rest
  },
  ref,
) {
  const [footerHeight, setFooterHeight] = useState(0)
  const footerVisibleHeight = footer ? Math.max(0, footerHeight - footerKeyboardTuck) : 0

  return (
    <>
      <KeyboardAwareScrollView
        ref={ref}
        style={[styles.scroll, style]}
        bottomOffset={bottomOffset + footerVisibleHeight}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        {...rest}
      >
        {children}
      </KeyboardAwareScrollView>
      {footer ? (
        <KeyboardStickyView
          offset={{ opened: footerKeyboardTuck }}
          onLayout={(e) => setFooterHeight(e.nativeEvent.layout.height)}
        >
          {footer}
        </KeyboardStickyView>
      ) : null}
    </>
  )
})

type KeyboardAvoidingSheetProps = {
  children?: ReactNode
  style?: StyleProp<ViewStyle>
}

/**
 * Wrap a short bottom sheet (no scrolling) so it rides up with the keyboard.
 * The sheet's own bottom safe-area padding sits behind the keyboard, so it is
 * not counted twice.
 */
export function KeyboardAvoidingSheet({ children, style }: KeyboardAvoidingSheetProps) {
  const insets = useSafeAreaInsets()
  return (
    <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={-insets.bottom} style={style}>
      {children}
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
})
