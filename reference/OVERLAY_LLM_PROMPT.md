# SpendSense — Android Overlay Module Implementation Prompt

> **Usage:** Copy this entire file as your prompt to any LLM. It contains full context, file structure, and a precise task definition. No additional context needed.

---

## Project Context

SpendSense is a personal finance Android app built with:
- **React Native + Expo SDK 54** (bare workflow — `android/` folder exists)
- **Expo Router v4** (file-based navigation)
- **NativeWind v4** (Tailwind for RN)
- **Zustand** for state
- **expo-sqlite + Drizzle ORM** for local DB
- **TypeScript** (lenient, no strict mode)
- **Package name:** `com.spendsense` (verify from `android/app/build.gradle`)
- **Language:** The existing Android code uses Kotlin

The app is Nepal-focused, NPR-denominated, no backend, no cloud sync.

### Existing `lib/categorize.ts` signature
```ts
export function categorize(opts: {
  remarks: string | null
  merchant: string | null
  keywords: { keyword: string; bucketId: string }[]
  sureShotMerchants: { merchantName: string; bucketId: string }[]
  fallbackBucketId: string
}): { bucketId: string; isFlagged: boolean }
```

### Existing `store/transactions.ts` — addTransaction
```ts
// The store has an addTransaction action that takes:
{
  amount: number
  merchant: string | null
  bucketId: string
  remarks: string | null
  source: 'manual' | 'ocr' | 'overlay'  // add 'overlay' as new source
  isFlagged: boolean
  date: string // ISO
}
```

### Existing `android/app/src/main/AndroidManifest.xml`
- `SYSTEM_ALERT_WINDOW` is already declared ✅
- `INTERNET`, `READ_EXTERNAL_STORAGE`, `VIBRATE` already declared ✅
- Single `<activity android:name=".MainActivity">` exists ✅
- No services declared yet

---

## What You Need to Build

A **floating bubble overlay** (like Messenger chat heads) for Android that:
1. Persists above all other apps as a draggable green circle
2. When tapped → silently captures the current screen
3. Runs on-device OCR (ML Kit) on the captured bitmap
4. Parses the OCR text for transaction data (amount, merchant)
5. Categorizes using existing `lib/categorize.ts`
6. Saves to DB using existing `store/transactions.ts`
7. Shows a toast confirmation — user never leaves their banking app

---

## Files to Create (Native Kotlin)

All in: `android/app/src/main/java/com/spendsense/overlay/`

### 1. `OverlayService.kt`
A `Service` subclass that:
- Runs as a **foreground service** with a persistent notification (channel ID: `"spendsense_overlay"`, channel name: "SpendSense Overlay")
- Notification: small icon from `@drawable/ic_launcher`, title: "SpendSense", text: "Tap the bubble to capture a transaction"
- On `onStartCommand`: if action == `"com.spendsense.overlay.START"` → create and attach `FloatingBubbleView` to `WindowManager`
- On `onStartCommand`: if action == `"com.spendsense.overlay.STOP"` → remove view, stop self
- Exposes a callback interface `OnScreenCaptureRequested` that `FloatingBubbleView` calls on tap
- When `OnScreenCaptureRequested` fires → call `ScreenCaptureManager.capture()` → pass result to `MLKitOCRProcessor` → pass raw text to `OcrResultBridge.emitResult(rawText)`
- All capture/OCR work on `Dispatchers.Default` coroutine scope (not main thread)

### 2. `FloatingBubbleView.kt`
A `FrameLayout` subclass that:
- Inflates a simple layout: 56dp × 56dp green circle (`#16A34A`) with a white scan/camera icon in the center
- Supports touch drag: updates `WindowManager.LayoutParams` x/y on `ACTION_MOVE`
- On `ACTION_UP` after drag: snap to nearest screen edge (left or right) with a 200ms `ObjectAnimator`
- Detects tap vs drag: if total touch delta < 10px → it's a tap → call `onCaptureRequested()` callback
- Long press (500ms threshold): show a small floating "Stop bubble" button (TextView anchored above the bubble) — tapping it sends `ACTION_STOP` intent to `OverlayService`
- `WindowManager.LayoutParams`:
  - Type: `WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY`
  - Flags: `FLAG_NOT_FOCUSABLE or FLAG_LAYOUT_IN_SCREEN`
  - Format: `PixelFormat.TRANSLUCENT`
  - Initial position: right edge center of screen

### 3. `ScreenCaptureManager.kt`
A class that:
- Constructor takes `(context: Context, mediaProjection: MediaProjection, windowManager: WindowManager)`
- Has a `capture(): Bitmap?` suspend function that:
  1. Gets display metrics from `windowManager`
  2. Creates an `ImageReader` with screen dimensions, format `PixelFormat.RGBA_8888`, maxImages = 1
  3. Creates a `VirtualDisplay` from `mediaProjection`
  4. Waits for an `Image` from `ImageReader` (use `suspendCoroutine` + `setOnImageAvailableListener`)
  5. Converts `Image` planes to `Bitmap`
  6. Releases `Image` and `VirtualDisplay`
  7. Returns the `Bitmap`
- `MediaProjection` token is passed in from `OverlayService` (which holds it after `OverlayModule` receives it from the permission intent result)

### 4. `MLKitOCRProcessor.kt`
A class that:
- Has a `process(bitmap: Bitmap): String` suspend function
- Uses `TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)`
- Calls `recognizer.process(InputImage.fromBitmap(bitmap, 0)).await()` (use `kotlinx-coroutines-play-services` or `suspendCoroutine` wrapper)
- Returns `result.text` (full recognized string)
- Calls `recognizer.close()` when done

### 5. `OcrResultBridge.kt`
A `ReactContextBaseJavaModule` that:
- Module name: `"OcrResultBridge"`
- Holds a static `reactContext: ReactContext?` — set from `OverlayModule` on init
- Has a `companion object` with `fun emitResult(rawText: String)` that sends a `DeviceEventManagerModule.RCTDeviceEventEmitter` event named `"onOcrResult"` with a `WritableMap` containing:
  - `rawText: String`
  - `timestamp: Long` (System.currentTimeMillis())
- This is called from `OverlayService` (which is a non-RN context, hence the static companion pattern)

### 6. `OverlayModule.kt`
A `ReactContextBaseJavaModule` that:
- Module name: `"OverlayModule"`
- On init: sets `OcrResultBridge.reactContext = reactApplicationContext`
- `@ReactMethod fun startOverlay(promise: Promise)`:
  - Check `Settings.canDrawOverlays(context)` → reject with `"PERMISSION_DENIED"` if false
  - Requires `MediaProjection` token to be stored first → if missing, reject with `"NO_MEDIA_PROJECTION"`
  - Sends `Intent(ACTION_START)` to `OverlayService`, resolves promise with `true`
- `@ReactMethod fun stopOverlay(promise: Promise)`:
  - Sends `Intent(ACTION_STOP)` to `OverlayService`, resolves with `true`
- `@ReactMethod fun requestOverlayPermission()`:
  - Opens `Settings.ACTION_MANAGE_OVERLAY_PERMISSION` intent for package
- `@ReactMethod fun requestMediaProjectionPermission()`:
  - Uses `MediaProjectionManager.createScreenCaptureIntent()`
  - Starts the system dialog via `currentActivity`
  - Override `onActivityResult` to capture the `MediaProjection` token
  - Store token for use by `OverlayService`
- `@ReactMethod fun isOverlayPermissionGranted(promise: Promise)`:
  - Resolves with `Boolean` from `Settings.canDrawOverlays(context)`

### 7. `OverlayPackage.kt`
A `ReactPackage` that:
- Returns `listOf(OverlayModule(reactContext), OcrResultBridge(reactContext))` from `createNativeModules`
- Returns `emptyList()` from `createViewManagers`

---

## Files to Modify

### `android/app/src/main/AndroidManifest.xml`
Add inside `<manifest>`:
```xml
<uses-permission android:name="android.permission.FOREGROUND_SERVICE"/>
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION"/>
```

Add inside `<application>`:
```xml
<service
    android:name=".overlay.OverlayService"
    android:foregroundServiceType="mediaProjection"
    android:exported="false"/>
```

### `android/app/src/main/java/com/spendsense/MainApplication.kt`
In `getPackages()`, add:
```kotlin
packages.add(OverlayPackage())
```

### `android/app/build.gradle`
In `dependencies {}`, add:
```groovy
implementation 'com.google.mlkit:text-recognition:16.0.1'
implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-play-services:1.7.3'
```

---

## Files to Create (React Native / TypeScript)

### `lib/overlay.ts` (new)
```ts
import { NativeModules, NativeEventEmitter, Platform } from 'react-native'

const { OverlayModule } = NativeModules

export type OcrResult = {
  rawText: string
  timestamp: number
}

export const Overlay = {
  start: (): Promise<boolean> => {
    if (Platform.OS !== 'android') return Promise.resolve(false)
    return OverlayModule.startOverlay()
  },
  stop: (): Promise<boolean> => {
    if (Platform.OS !== 'android') return Promise.resolve(false)
    return OverlayModule.stopOverlay()
  },
  isPermissionGranted: (): Promise<boolean> => {
    if (Platform.OS !== 'android') return Promise.resolve(false)
    return OverlayModule.isOverlayPermissionGranted()
  },
  requestPermission: (): void => {
    if (Platform.OS !== 'android') return
    OverlayModule.requestOverlayPermission()
  },
  requestMediaProjection: (): void => {
    if (Platform.OS !== 'android') return
    OverlayModule.requestMediaProjectionPermission()
  },
  onOcrResult: (cb: (result: OcrResult) => void) => {
    const { OcrResultBridge } = NativeModules
    const emitter = new NativeEventEmitter(OcrResultBridge)
    return emitter.addListener('onOcrResult', cb)
  },
}
```

### `hooks/useOverlay.ts` (new)
```ts
import { useEffect } from 'react'
import { ToastAndroid } from 'react-native'
import { Overlay } from '../lib/overlay'
import { parseOcrText } from '../lib/ocr'
import { categorize } from '../lib/categorize'
import { useTransactionStore } from '../store/transactions'
import { useBucketStore } from '../store/buckets'

export function useOverlay() {
  const addTransaction = useTransactionStore(s => s.addTransaction)
  const keywords = useBucketStore(s => s.keywordMappings)
  const sureShotMerchants = useBucketStore(s => s.sureShotMerchants)
  const fallbackBucketId = useBucketStore(s => s.fallbackBucketId)

  useEffect(() => {
    const sub = Overlay.onOcrResult(async ({ rawText, timestamp }) => {
      try {
        const parsed = parseOcrText(rawText)
        if (!parsed || !parsed.amount) {
          ToastAndroid.show('Could not read transaction', ToastAndroid.SHORT)
          return
        }
        const { bucketId, isFlagged } = categorize({
          remarks: parsed.remarks ?? null,
          merchant: parsed.merchant ?? null,
          keywords,
          sureShotMerchants,
          fallbackBucketId,
        })
        await addTransaction({
          amount: parsed.amount,
          merchant: parsed.merchant ?? null,
          bucketId,
          remarks: parsed.remarks ?? null,
          source: 'overlay',
          isFlagged,
          date: new Date(timestamp).toISOString(),
        })
        const msg = isFlagged
          ? `NPR ${parsed.amount} saved — needs review`
          : `NPR ${parsed.amount} saved`
        ToastAndroid.show(msg, ToastAndroid.SHORT)
      } catch (err) {
        ToastAndroid.show('Overlay capture failed', ToastAndroid.SHORT)
      }
    })
    return () => sub.remove()
  }, [keywords, sureShotMerchants, fallbackBucketId])
}
```

### `app/_layout.tsx` — add one line
```ts
// After existing hooks (font load, DB init, etc.)
useOverlay() // activates background OCR listener
```

### `app/(tabs)/settings.tsx` — add Overlay section
Add a new section at the bottom of Settings screen:
- Heading: "Scan Bubble"
- Row: "Draw over other apps" — shows current permission status (green check / red x)
  - Tap: calls `Overlay.requestPermission()`
- Row: "Screen capture access" — shows status
  - Tap: calls `Overlay.requestMediaProjection()`
- Toggle: "Enable bubble" — calls `Overlay.start()` / `Overlay.stop()`
  - Disabled until both permissions are granted

---

## `lib/ocr.ts` — Extend with `parseOcrText`

Add this export to the existing `lib/ocr.ts`:
```ts
export type ParsedTransaction = {
  amount: number | null
  merchant: string | null
  remarks: string | null
  txnId: string | null
}

export function parseOcrText(raw: string): ParsedTransaction {
  const amountPatterns = [
    /(?:NPR|Rs\.?|रू)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    /(?:Amount|Debit|Payment|Paid)\s*:?\s*(?:NPR|Rs\.?)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    /Total\s*:?\s*(?:NPR|Rs\.?)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
  ]
  const merchantPatterns = [
    /(?:To|Merchant|Paid to|Store)\s*:?\s*(.{3,40}?)(?:\n|$)/i,
    /(?:Receiver|Payee)\s*:?\s*(.{3,40}?)(?:\n|$)/i,
  ]
  const txnPatterns = [
    /(?:Txn\.?|Transaction)\s*(?:ID|No\.?|#)\s*:?\s*([A-Z0-9\-]{6,30})/i,
    /(?:Ref\.?|Reference)\s*(?:No\.?|#)?\s*:?\s*([A-Z0-9\-]{6,30})/i,
  ]

  let amount: number | null = null
  for (const p of amountPatterns) {
    const m = raw.match(p)
    if (m) { amount = parseFloat(m[1].replace(/,/g, '')); break }
  }

  let merchant: string | null = null
  for (const p of merchantPatterns) {
    const m = raw.match(p)
    if (m) { merchant = m[1].trim(); break }
  }

  let txnId: string | null = null
  for (const p of txnPatterns) {
    const m = raw.match(p)
    if (m) { txnId = m[1].trim(); break }
  }

  return { amount, merchant, remarks: null, txnId }
}
```

---

## Implementation Order (follow this exactly)

1. **Phase 1 — Bubble only (no OCR)**
   - Create `FloatingBubbleView.kt`, `OverlayService.kt` (without capture logic)
   - Create `OverlayPackage.kt`, `OverlayModule.kt` (start/stop/permission methods only)
   - Update `AndroidManifest.xml`, `MainApplication.kt`
   - Create `lib/overlay.ts`
   - Add Settings toggle
   - **Test:** Green bubble appears over apps, can drag, can dismiss ✅

2. **Phase 2 — Screen capture**
   - Add `requestMediaProjectionPermission` to `OverlayModule`
   - Create `ScreenCaptureManager.kt`
   - Wire tap in `OverlayService` to call `ScreenCaptureManager.capture()`
   - Log captured bitmap dimensions as a debug Toast
   - **Test:** Tap bubble → Toast shows "Captured 1080×2340" ✅

3. **Phase 3 — OCR**
   - Add ML Kit gradle dep
   - Create `MLKitOCRProcessor.kt`
   - Create `OcrResultBridge.kt`
   - Wire: capture → OCR → emit event
   - Create `hooks/useOverlay.ts` (log raw text only)
   - **Test:** Tap bubble over eSewa → Toast shows extracted text ✅

4. **Phase 4 — Parse + Save**
   - Extend `lib/ocr.ts` with `parseOcrText`
   - Complete `hooks/useOverlay.ts` with categorize + addTransaction
   - Add `useOverlay()` to `app/_layout.tsx`
   - **Test:** Full silent flow — transaction appears in Ledger tab ✅

---

## Hard Rules

- **Do not modify** `lib/categorize.ts`, `store/transactions.ts`, `db/schema.ts`, or any existing screen beyond `settings.tsx` and `_layout.tsx`
- The bubble is **Android-only** — all JS code must guard with `Platform.OS === 'android'`
- No network calls — all OCR is on-device
- OCR and DB writes must never block the main thread
- If OCR returns empty string or no amount matched → show "Could not read" toast and stop — do not save anything
- Transaction `source` for overlay captures = `'overlay'` (add to the `source` union type in schema if needed)
- The foreground service notification is **non-dismissible** while overlay is active (Android requirement)
