import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Keyboard,
  Platform,
  ScrollView,
  View,
  type FocusEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native'

type Measurable = {
  measureInWindow: (cb: (x: number, y: number, w: number, h: number) => void) => void
}

const FIELD_TOP_GAP = 12

/** Keyboard height for sheets that still pad content (iOS). Resets on hide / unmount. */
export function useKeyboardHeight(enabled = true) {
  const [keyboardHeight, setKeyboardHeight] = useState(0)

  useEffect(() => {
    if (!enabled) {
      setKeyboardHeight(0)
      return
    }

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'

    const onShow = (e: { endCoordinates?: { height?: number } }) => {
      const height = e?.endCoordinates?.height ?? 0
      setKeyboardHeight(height > 0 ? height : 0)
    }
    const onHide = () => setKeyboardHeight(0)

    const showSub = Keyboard.addListener(showEvent, onShow)
    const hideSub = Keyboard.addListener(hideEvent, onHide)

    return () => {
      showSub.remove()
      hideSub.remove()
      setKeyboardHeight(0)
    }
  }, [enabled])

  return keyboardHeight
}

/** Extra scroll padding + move the focused field to the top of the visible list. */
export function useScrollFocusedToTop() {
  const keyboardHeight = useKeyboardHeight(true)
  const scrollRef = useRef<ScrollView>(null)
  const scrollHostRef = useRef<View>(null)
  const scrollY = useRef(0)
  const focusedNode = useRef<Measurable | null>(null)

  const scrollFocusedToTop = useCallback(() => {
    const node = focusedNode.current
    const host = scrollHostRef.current
    const scroll = scrollRef.current
    if (!node?.measureInWindow || !host || !scroll) return

    node.measureInWindow((_x, fieldY) => {
      host.measureInWindow((_sx, scrollYOnScreen) => {
        const delta = fieldY - (scrollYOnScreen + FIELD_TOP_GAP)
        if (Math.abs(delta) < 8) return
        scroll.scrollTo({
          y: Math.max(0, scrollY.current + delta),
          animated: true,
        })
      })
    })
  }, [])

  useEffect(() => {
    if (keyboardHeight <= 0 || !focusedNode.current) return
    const t1 = setTimeout(scrollFocusedToTop, 50)
    const t2 = setTimeout(scrollFocusedToTop, 220)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [keyboardHeight, scrollFocusedToTop])

  const onInputFocus = useCallback(
    (e: FocusEvent) => {
      focusedNode.current = e.target as unknown as Measurable
      setTimeout(scrollFocusedToTop, Platform.OS === 'android' ? 120 : 60)
    },
    [scrollFocusedToTop],
  )

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.current = e.nativeEvent.contentOffset.y
  }, [])

  return {
    keyboardHeight,
    scrollRef,
    scrollHostRef,
    onInputFocus,
    onScroll,
  }
}
