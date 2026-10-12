# Payment watch — usage access + reply notification

**Date:** 2026-08-19  
**Status:** Implemented  
**App:** SpendSense

## Constraint

No MediaProjection, no screenshot, no SYSTEM_ALERT_WINDOW overlay, no Accessibility service.

## Flow

1. Payment Helper watches eSewa and nBank (defaults). Settings → **Payment helper** toggle.
2. After about 5 seconds in the payment app: amount + Log notification.
3. After Log: open SpendSense (or the bucket picker) to assign a Living bucket.
4. After bucket (or amount-only if no buckets): no log again until you leave that payment app.

Usage access (`UsageStatsManager`) detects the foreground app. No screenshot, overlay, or Accessibility.

## Save

Amount insert is flagged. Chip tap sets `bucket_id` and `is_flagged = 0`.
