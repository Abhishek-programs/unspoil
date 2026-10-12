# Early salary month start

**Date:** 2026-09-16  
**Status:** Approved for implementation

## Goal

When salary arrives a few days before the configured `month_start_day`, let the user explicitly close the old period and start the new plan immediately. Spending after the tap belongs to the new ring. The configured start day remains unchanged and is the next regular boundary.

## Behavior

- Show a small floating **Paid early?** pill near the Hero ring only during the 7 days before the next configured start day, when this period already has salary and no early period is active.
- Tap → confirmation:
  - Title: **Start new month today?**
  - Body: **Closes this month, logs NPR {salary} salary, and counts spending from today in the new month. Your regular start day stays {day}.**
  - Actions: Cancel / Start month.
- Confirm:
  1. Snapshot Your money on the card as X. Carry is X plus today’s expenses, minus today’s income and lending-in, so items that stay in the new period are not deducted twice. A same-day borrow+spend is a wash and must not inflate carry. After the tap, cash is carry + new salary − this period’s flow.
  2. Start a new period today and run normal Personal top-up/cap rollover.
  3. Reload transactions/lending for today through the day before next month’s configured start.
  4. Log salary at today’s period start.
  5. Open the new month checklist; salary is already complete.

Example: configured day 25, early start 23 Jan → period is 23 Jan–24 Feb. The regular 25 Jan boundary is skipped. Next period begins 25 Feb.

## Data and month identity

- Add nullable `playbook.early_month_start_date` as a local ISO date (`YYYY-MM-DD`).
- `getMonthRange(day, earlyStart?)` uses the override only while now is within its early period.
- Normal period keys stay `YYYY-MM` to avoid replaying existing rollovers. An early period key is `YYYY-MM@early-YYYY-MM-DD`.
- When the following regular boundary arrives, previous-period rollover uses the saved early start, then clears the override.

## Guardrails

- The action is unavailable outside the 7-day early window.
- It is unavailable if the current period’s salary is not confirmed (that case is late/current salary, not early salary).
- Confirmation is required.
- Late salary behavior is unchanged.
- Bucket amounts are not prorated; the new period gets the normal monthly plan.
