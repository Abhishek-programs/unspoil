# Account on details + income put-back Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show Bank / eSewa / Cash on transaction details, and let income optionally put money back into a spending bucket so that bar comes down.

**Architecture:** Extract one `spentTowardBucket` helper. Income with a spending `bucketId` subtracts from that bucket’s spent (floored at 0). UI reuses existing account and bucket chips. No schema change — `accountId` and `bucketId` already exist.

**Tech Stack:** Expo SDK 54, React Native, TypeScript, Zustand.

## Global Constraints

- No new tables, transaction types, or backend.
- Salary (`__salary__`) stays on `_income` / None. No Put back into on salary rows.
- Put back into is spending buckets only (including Personal), not savings/investment.
- Your money still counts the income in full.
- Bar / ring / leftover use floored spent (`max(0, expenses − put-backs)`).
- No git commands without explicit permission.
- No automated tests in V1; verify with `npx tsc --noEmit`.

**Spec:** `docs/superpowers/specs/2026-09-29-account-and-income-bucket-design.md`

---

### Task 1: Shared spent helper

**Files:**
- Create: `lib/spent.ts`
- Modify: `store/transactions.ts` (`getSpentByBucket`)
- Modify: `lib/month-surplus.ts` (lifestyleSpent, personalDraws)
- Modify: `lib/claude-snapshot.ts` (`spentThisPeriod`)

**Interfaces:**
- Produces: `spentTowardBucket(bucket, txns): number` — expenses toward bucket minus income with that `bucketId`, floored at 0. Skip flagged and drafts. Expense rules match today’s `getSpentByBucket` (accumulating vs regular, funded-from `__savings_confirm__`).

```ts
export function spentTowardBucket(
  bucket: { id: string; accumulates?: boolean },
  txns: { type: string; amount: number; bucketId: string; fundedFromBucketId?: string | null; remarks: string | null; isFlagged: boolean; isRecurringDraft: boolean }[],
): number {
  let spent = 0
  let putBack = 0
  for (const t of txns) {
    if (t.isFlagged || t.isRecurringDraft) continue
    if (t.type === 'income') {
      if (t.bucketId === bucket.id) putBack += t.amount
      continue
    }
    if (t.type !== 'expense') continue
    if (bucket.accumulates) {
      if (
        (t.bucketId === bucket.id && (!t.remarks || !t.remarks.startsWith('__'))) ||
        (t.fundedFromBucketId === bucket.id && t.remarks === '__savings_confirm__')
      ) {
        spent += t.amount
      }
      continue
    }
    if (t.bucketId === bucket.id) spent += t.amount
    else if (t.fundedFromBucketId === bucket.id && t.remarks === '__savings_confirm__') spent += t.amount
  }
  return Math.max(0, spent - putBack)
}
```

- [ ] Add `lib/spent.ts` with `spentTowardBucket`.
- [ ] `getSpentByBucket` returns `spentTowardBucket(bucket, get().transactions)` (0 if bucket missing).
- [ ] `computeMonthSurplus` lifestyleSpent / personalDraws call `spentTowardBucket` per bucket instead of inlined expense-only filters.
- [ ] `spentThisPeriod` in `lib/claude-snapshot.ts` calls `spentTowardBucket`.
- [ ] Run `npx tsc --noEmit`. Expected: clean.

---

### Task 2: Detail sheet wallet + income put-back UI

**Files:**
- Modify: `components/transactions/TransactionDetailSheet.tsx`
- Modify: `components/manual-entry/ManualEntrySheet.tsx`
- Modify: `docs/core-function.md`
- Modify: `docs/design-and-features.md`

**Interfaces:**
- Consumes: `accountId`, `bucketId`, `INCOME_BUCKET_ID`
- Manual income save: `bucketId = selectedBucketId ?? INCOME_BUCKET_ID`

- [ ] **Detail sheet — wallet**

Load `accountId` (default `defaultAccountId()`). Render chips **Paid from** (expense) or **Lands in** (income) using `useAccountsStore().accounts`. On save, include `accountId` in the patch so `updateTransaction` reverses/applies accounts.

- [ ] **Detail sheet — income put-back**

If income and `remarks !== '__salary__'`: chips **Put back into** = None (`INCOME_BUCKET_ID`) + active spending buckets. Save `bucketId`. Hide Put back into on salary.

- [ ] **Manual entry**

After Lands in on income: same **Put back into** chips. `canSave` stays amount > 0 (bucket optional). Pass `bucketId: selectedBucketId ?? INCOME_BUCKET_ID`. Reset selected bucket on open.

- [ ] **Docs**

Manual entry: income may Put back into a spending bucket. Transaction details show wallet. Spent = expenses − those incomes, floored at 0.

- [ ] Run `npx tsc --noEmit`. Expected: clean.
- [ ] Rebuild/install on the phone if that is the current workflow. Check: open a txn → see wallet; add income → Fun → Fun bar drops; Your money rises; salary has no Put back into.
