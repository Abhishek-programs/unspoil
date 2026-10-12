# Lending edit, fees, checklist, carry, drop Living reallocate

**Date:** 2026-09-14  
**Status:** Approved for implementation  
**App:** SpendSense

## Problem

1. Lent/borrow entries cannot be edited or deleted in the UI; wrong amounts require a fake settle. People cannot be removed if they have history.
2. Month Start Ritual auto-opens on every launch while incomplete.
3. SIP (and other expenses) incur broker/bank fees. Fees are not modeled; SIP confirm is one lump (e.g. 10k) instead of NPR 5,000 brackets.
4. Your money clamps this month’s leftover at 0, so overspend (including spending from carry, or settling a borrow) does not reduce the displayed total. Month rollover only **adds** unused leftover; it never subtracts overspend from carry.
5. Living **reallocate** cuts other bucket ceilings after overspend. That is not wanted; playbook amounts should stay as set.

## Non-goals

- Negative carried-forward (floor at 0 on rollover).
- Fee chip on income, salary, or lend/borrow.
- Auto-splitting manual SIP entry into 5k chunks (user types 5,000 twice if needed).
- 5k chunk UI for Direct Shares.
- Logging settle as a second expense transaction (would double-count).
- Changing Personal recovery (1,000/mo) or double-red overspend bars.
- Transaction recategorize on the Ledger detail sheet (that is not Living reallocate).

---

## 1. Lent & borrowed

**Person history:** tap a row → sheet (amount, type lend/borrow/settle, note, date). Save → `updateEntry`. Delete → confirm → `deleteEntry`. Balances, Home row, purple ring slice, net worth, Ledger lending filter recompute.

Settle still cannot exceed the net of **other** entries for that person.

**Delete person:** trash on the person screen. Confirm: removes the contact **and all** their entries. Navigate back to the person list.

Store: add `updateEntry`; change `deleteContact` to cascade-delete entries (today it refuses if history exists).

---

## 2. Month checklist

Playbook month = `month_start_day`, not calendar day 1.

New playbook field: `lastChecklistPromptMonth` (`YYYY-MM`, same key as `currentMonthKey`).

- **Auto-open** the ritual sheet when `lastChecklistPromptMonth !== monthKey` and the checklist is not all done.
- As soon as that auto-open happens, set `lastChecklistPromptMonth = monthKey` (same if they tap “I’ll finish this later”). Later launches this month do not auto-open.
- **Banner + header list icon** stay until all items are confirmed (`lastChecklistMonth` still set only when all done — do **not** reuse that field for dismiss).

---

## 3. Fees

### Data

`transactions.feeAmount` real, default `0`. Not a bucket. Never shown on Home, Living, Future, or playbook.

### Cash vs invested

| Quantity | Uses |
|----------|------|
| `amount` | Bucket spend / SIP invested / net worth / lifestyle bars |
| `feeAmount` | Extra cash leaving |
| Debit account / Your money | `amount + feeAmount` |

Lifestyle `getSpentByBucket` ignores `feeAmount`. Charts get a **Fees** total (sum of `feeAmount` this period + optional trend). Ledger expense rows with fee > 0 show muted `fee NPR x`.

### UI

**Manual [+] expense:** small **Fee** chip beside the amount field, off by default. Tap reveals a fee field. Same on **transaction detail** for expenses (plus amount edit so a wrong number can be fixed).

**Income / lend-borrow:** no fee chip.

**Payment helper** first save: `feeAmount = 0`; add the fee later on detail.

### SIP confirm (Future + Month Start SIP row)

Split the **remaining** SIP to confirm this month into NPR **5,000** chunks (last chunk = remainder). Remaining = `max(0, monthlyAmount - sum of this month’s SIP `__savings_confirm__` amounts)` (fees excluded).

Row UI: `+5000 +5000` (not a single 10k). Each tap: confirm that chunk, then a **fee** prompt (0 allowed). One transaction per chunk: `bucketId` SIP, `remarks` `__savings_confirm__`, `amount` = chunk, `feeAmount` = fee.

SIP is **not** fully confirmed for checklist/Future check-off until this month’s SIP confirm **amounts** sum to ≥ monthly plan. (`getConfirmedSavingsBuckets` today treats any confirm as done — special-case SIP.)

Month Start must **not** log SIP as a single `monthlyAmount` tap. Same chunk + fee flow as Future. Other checklist rows (salary, EF, goals) stay one tap.

Shares stay a single amount sheet (optional fee chip / field on that confirm, same as any expense).

---

## 4. Your money, settle, month-end

### This month

Stop clamping leftover before adding carry.

```
feesThisMonth        = sum(feeAmount) for this month’s non-flagged, non-draft expenses
monthLeftover        = adjustedSafeToSpend - feesThisMonth
                       (adjustedSafeToSpend already includes lend/borrow cash adjust)
yourMoney            = max(0, monthLeftover + carriedForward + stillInBank + foundMoney)
```

Expanded card: **Remaining this month** may be negative (overspend / settle / fees eating the month). **Carried forward** still shown. Collapsed total is the sum.

**Ring / safe to spend:** still this month’s plan, salary-gated, **not** carry. Subtract `feesThisMonth` so cash that left as fees is not still “safe”. Carry is not added to the ring.

### Settle (borrow repay or collect lend)

Keep a **single** settle entry. No extra expense txn.

- Collect (they repay you): cash in, as today (`settleReceived`).
- Pay back (you owed): cash out (`settlePaid`) from **Your money** (month leftover + carry), not a Living bucket.
- Settle Up copy: this leaves (or adds to) Your money. Living ceilings unchanged.

### Rollover (new playbook month)

Rollover must include the same signed month leftover as Home, plus unconfirmed Future money that is still in the bank. It must not use `max(0, plan-only surplus)`.

```
newCarry = max(0, oldCarry + previousMonthLeftover + previousMonthStillInBank)
```

Unused leftover adds; overspend/settle-paid/fees subtract; carry never below 0. Next month ring is the new plan only. Personal top-up / cap override reset unchanged.

Borrow IOUs stay on the person ledger until settled; they do not become negative carry.

---

## 5. Remove Living reallocate

Remove the Living header reallocate control and `LivingReallocateSheet`. Overspend still allowed; double-red overshoot bars stay. **Do not** cut other buckets’ `monthlyAmount`. Ceilings stay as onboarding/Settings.

Leave Personal cap prompt / recovery as-is. Leave Ledger “change this txn’s bucket”.

---

## Files (expected)

- Schema + migration + `db/client.ts` ALTER: `transactions.feeAmount`, `playbook.lastChecklistPromptMonth`
- `store/transactions.ts`, `store/lending.ts`, `store/playbook.ts`
- `hooks/usePulseData.ts`, `lib/month-surplus.ts`
- `components/home/MonthStartChecklist` wiring in `app/(tabs)/index.tsx`
- `components/home/LivingSection.tsx` (drop reallocate)
- `components/home/NetWorthCard.tsx` (negative remaining)
- `components/manual-entry/ManualEntrySheet.tsx`, `TransactionDetailSheet.tsx`, `ShareConfirmSheet` / SIP chunk UI, `FutureSection`
- `components/lending/*`, `app/lending/[contactId].tsx`
- `components/transactions/ChartsView.tsx`, `TransactionRow.tsx`
- `docs/core-function.md`, `docs/design-and-features.md` (formulas + settle copy)

## Out of scope (again)

Bank sync, iOS, fee presets (4.52 / 4 hardcoded), auto 5k split on [+], deleting `lib/living-reallocate.ts` math if still used only by the sheet (delete with the sheet if unused).
