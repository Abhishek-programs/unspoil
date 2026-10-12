# Transaction wallet + income put-back

**Date:** 2026-09-29  
**Status:** Approved for implementation  
**App:** SpendSense

## Problem

1. Every transaction already has `accountId` (Bank / eSewa / Cash). Manual entry sets it. The detail sheet never shows it — only “Manual entry” / “Payment helper”.
2. Group spend is logged in full (e.g. Fun NPR 5,000). When friends pay their share, that income cannot return to Fun, so the bar stays at 5,000 even though the user’s share was less.

## Non-goals

- New transaction type (Refund)
- Editing the original expense down instead of logging income
- Assigning salary or `__savings_confirm__` this way
- Putting income into savings/investment buckets (those stay confirm-only)
- Ledger row redesign (account stays on the detail sheet)
- Cloud / AI / new tables

## 1. Wallet on transaction details

On **Transaction details**, after Description (or with the other chips):

- Expense: **Paid from**
- Income: **Lands in**

Same Bank / eSewa / Cash chips as [+]. Default to the row’s `accountId`, or Bank if null. Saving writes `accountId`. Changing wallet uses the existing update path (reverse old account, apply new).

## 2. Optional bucket on income

**[+]** Income, after Lands in: **Put back into** (optional).

Chips: all active **spending** buckets (including Personal) plus **None**.

- **None** (default): `bucketId = _income` — today’s income. Salary, extra cash, unassigned shares.
- A spending bucket: `bucketId = that bucket`. Cash still lands in the chosen account. That bucket’s **spent** goes down by the income amount.

Example: Fun expense 5,000, then income 2,000 → Fun. Fun spent = 3,000. Your money +2,000.

Detail sheet for income gets the same chips (including None). Saving updates `bucketId`.

Salary (`__salary__`) stays None / `_income`. Do not offer Put back into on salary rows.

## 3. Spent math

One rule, used by Home bars, ring, Personal draws, month leftover / rollover, and Share for Claude:

```
spent(bucket) =
  expenses on that bucket (same filters as today, including funded-from)
  − income whose bucketId is that bucket
    (not draft, not flagged)
```

Floor display at 0 if you want the bar not to go negative; the signed remainder can still help the ring (over-reimbursement gives more room). **Floor spent at 0 for the bar; ring/safe-to-spend uses the same floored spent** so a 2,000 dinner + 3,000 put-back does not invent extra safe-to-spend beyond emptying the bucket.

Cash / Your money still counts the income in full (money arrived). Do not also treat bucket-assigned income as unallocated salary.

`getSpentByBucket` is the single place for period spend. `computeMonthSurplus` / snapshot `spentThisPeriod` must use the same rule (extract a shared helper if both copies would drift).

## 4. Ledger

Income assigned to a bucket still shows as green income. Title/description unchanged. No new row type.

## Verification

- Open an expense/income: wallet is visible and editable; save persists.
- Income + None: bars unchanged; Your money up.
- Income + Fun: Fun spent drops by that amount; Your money up.
- Salary still has no Put back into.
- Export / Share for Claude spent column matches Home.
- Typecheck.
