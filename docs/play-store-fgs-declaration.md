# Play Console — FOREGROUND_SERVICE_SPECIAL_USE

## Task type

Select **Other** (Payment helper only; not location/media/sync).

## Video link

1. Record (or re-record):  
   `docs/play-store-assets/record-payment-helper-video.sh [device-id] [seconds]`  
   Output: `docs/play-store-assets/payment-helper-fgs-demo.mp4` (gitignored).

2. **Before recording:** Payment helper **on**, usage access + notifications granted, **eSewa** (or nBank) selected in watched apps.

3. Upload to **YouTube** (public or unlisted, ads off, not age-restricted). Paste URL in Play Console.

4. Optional voiceover: name the feature, show settings toggle, open payment app, show log notification after ~5s, log amount + bucket.

## Description (paste in Play Console)

UnSpoil’s optional Payment helper helps users manually log expenses right after paying in apps they choose (e.g. eSewa, nBank).

When the user enables Payment helper and grants Usage access, PaymentWatchService runs as a foreground service with type specialUse. The service periodically checks which app is in the foreground (UsageStatsManager events only). It does not capture the screen, use Accessibility, or read payment app content.

When a selected payment app stays in the foreground for the user-configured delay, the app shows a local notification so the user can enter the amount and assign a Living spending bucket. A second notification may offer bucket chips. All data stays on the device.

The foreground service is required because Android restricts background execution: without a foreground service, the OS often kills the helper while the user is in another app, so the post-payment prompt would be missed. Detection must run while the payment app is open; deferring to periodic background jobs would not reliably detect short payment sessions.

The user can disable Payment helper at any time, which stops the service. If “Keep watching notification” is on, a minimal ongoing notification improves reliability on aggressive battery policies.

This permission is not used for ads, analytics, or uploading financial data to our servers.

Manifest subtype (`PROPERTY_SPECIAL_USE_FGS_SUBTYPE`):

> Detects when eSewa or nBank is in the foreground so you can log an amount from a notification. Does not record the screen.
