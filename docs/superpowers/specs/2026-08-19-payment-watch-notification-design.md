# Payment watch — usage access + reply notification

**Date:** 2026-08-19  
**Status:** Implemented  
**App:** SpendSense

## Constraint

No MediaProjection, no screenshot, no SYSTEM_ALERT_WINDOW overlay, no Accessibility service.

## Flow

1. Watcher runs in the background **without** a persistent “helper on” notification.  
2. After eSewa/nBank has been in the foreground for **5 seconds**: amount + Log.  
3. After Log: bucket chips (native RemoteInput choices). Tap a chip to assign.  
4. After bucket (or amount-only if no chips): no log again until you **leave** that payment app. Re-open → 5 second delay again.

Android still requires a brief FGS handshake when the service starts; it is dismissed immediately if you are not in a payment app.

## Save

Amount insert is flagged. Chip tap sets `bucket_id` and `is_flagged = 0`.
