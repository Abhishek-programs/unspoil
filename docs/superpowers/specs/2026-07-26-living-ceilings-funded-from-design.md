# Living ceilings + funded-from savings contributions

**Date:** 2026-07-26  
**Status:** Implemented  
**App:** SpendSense (manual-entry V1)

---

## Problem

1. **Living framing** — Rows show `0 / 35,000`, which reads as a spend *target*. In the playbook model that number is a **ceiling** (don’t exceed), not an amount you should try to fill. Removing the ceiling entirely loses useful guardrail info.

2. **Savings without a source** — Manual entry (and savings confirms) only pick a *destination* bucket. Moving money that already sits in Personal / Core Living / Fun into EF (or other savings) cannot debit the source, so Living ceilings and Personal balance stay wrong while EF still fills.

---

## Goals

- Living copy/layout emphasizes **spent** first and **ceiling** second (not `spent / target`).
- When contributing to a **savings or investment** bucket, user may optionally choose **Funded from** a spending/Personal bucket.
- One transaction; save applies both destination contribution and source usage.
- Safe-to-spend decreases when the source is a Living/Personal bucket (same economic effect as spending that amount there).
- No source → destination contribution only (today’s “I saved from general money” behavior).

## Non-goals (this pass)

- Separate “Transfer” entry type in the type toggle.
- Home-row shortcut on Personal.
- Funded-from on normal spending destinations (Fun, Core Living as *destination*).
- OCR / share / bubble (already out of scope).

---

## 1. Living UI

### Regular spending buckets (non-accumulating)

| Element | Behavior |
|--------|----------|
| Primary amount | `Spent NPR {spent}` (or `Spent NPR 0` when empty) |
| Secondary | muted `ceiling NPR {monthlyAmount}` |
| Progress | unchanged: `spent / monthlyAmount` when spent > 0 |
| Empty hint | keep italic “No transactions yet this month” under the row |

Avoid `spent / ceiling` as a single primary fraction string.

### Personal (accumulating)

Unchanged structure: `NPR {balance} / {cap}` + top-up hint. This is a fund, not a spend target.

### Section chrome

- Subtitle: **“Ceilings & personal fund”** (replace “Spending budgets & personal fund”).

### Files

- `components/home/LivingSection.tsx` (copy + amount layout only; math stays in stores/pulse).

---

## 2. Optional “Funded from” on savings contributions

### When it appears

In `ManualEntrySheet`, after the destination **Bucket** chips:

- Show **Funded from (optional)** only when the selected destination bucket has `type === 'savings' | 'investment'`.
- Hide when destination is spending, or entry type is income / lend-borrow.
- Chips: active **spending** buckets (including Personal). Exclude the destination itself and other savings/investment buckets.

### Save semantics

Single expense transaction:

| Field | Value |
|-------|--------|
| `bucketId` | Destination (e.g. EF) |
| `type` | `expense` |
| `remarks` | `__savings_confirm__` (same family as Future / checklist confirms so EF/Vault/progress keep working) |
| `fundedFromBucketId` | optional source id, or null |
| `description` / `merchant` / `date` | as entered |
| `source` | `manual` |

### Effects on write

1. **Destination** — counts as a savings contribution everywhere `__savings_confirm__` already does (EF balance, Future check-off progress, Vault, `confirmedSavedInvested` math).
2. **If `fundedFromBucketId` is a regular spending bucket** — that bucket’s **spent** includes this amount (Living bar + `lifestyleSpent` / safe-to-spend).
3. **If `fundedFromBucketId` is Personal (accumulating)** — debit Personal balance via existing `deductFromAccumulatingBucket`; include amount in **personal draws** for safe-to-spend (same as drawing Personal).
4. **If no funded-from** — destination contribution only; no Living/Personal debit.

### Effects on delete / edit

- Delete: reverse destination contribution (remove txn) and reverse source effect (restore Personal balance / stop counting toward source spent).
- Edit of amount / funded-from / destination: reverse old effects, apply new (same pattern as today’s Personal debit on delete).

### Ledger / detail UI

- Show destination as primary bucket (EF, etc.).
- Secondary hint when funded-from set: e.g. `from Core Living`.
- Detail sheet: show Funded from when present; allow edit in a follow-up if cheap, else read-only for v1 of this feature is acceptable if add/delete cover the common case — **prefer editable funded-from on detail** if already touching that sheet.

### Safe-to-spend (explicit)

Today: `safeToSpend ≈ lifestyleBudget + personalTopUps - lifestyleSpent - personalDraws + unallocated` (salary-gated).

With funded-from:

- Funding from Core/Dates/Fun → increases that bucket’s spent → **lifestyleSpent ↑** → safe-to-spend ↓.
- Funding from Personal → **personalDraws ↑** (+ balance ↓) → safe-to-spend ↓.
- No funded-from → safe-to-spend **not** reduced via Living/Personal for that txn (planned savings path / general money).

Do **not** double-count: the txn’s `bucketId` is the savings bucket, so it must not also appear as a normal spending expense on the destination.

---

## 3. Data model

### Schema

Add nullable column on `transactions`:

```text
funded_from_bucket_id text  -- null = not funded from a Living/Personal bucket
```

- Migration `m0010_funded_from_bucket` (or next free index) + `applySchemaPatches` idempotent `ALTER` if needed (match existing patch style).
- Keep `source` enum as-is (`manual` | `ocr` | `overlay`) for historical rows; new rows stay `manual`.

### Store / helpers

- Extend `Transaction` type and `addTransaction` / `deleteTransaction` (and update if detail edit ships).
- `getSpentByBucket(id)` for non-accumulating: sum expenses where `bucketId === id` **or** (`fundedFromBucketId === id` and remarks `__savings_confirm__`), excluding flagged/recurring drafts as today.
- `personalDraws` (in `usePulseData` or helper): include `__savings_confirm__` rows with `fundedFromBucketId === personal`.
- Personal debit: when adding confirm with funded-from Personal, call `deductFromAccumulatingBucket` even though `bucketId` is EF (today’s debit keys off `bucketId === Personal`).

---

## 4. UX copy (Manual Entry)

- Label: **Funded from (optional)**
- Helper under chips (one line): `Uses that ceiling or Personal balance; EF (or destination) still gets the contribution.`
- Validation: amount > 0; destination required; if Personal funded-from and balance < amount → same overspend alert pattern as Personal expenses today.

---

## 5. Acceptance checks

1. Living shows `Spent …` + muted `ceiling …`; subtitle “Ceilings & personal fund”.
2. Manual entry to Fun: no Funded from row.
3. Manual entry to EF, no funded-from: EF progress ↑; Core/Personal unchanged; ring not reduced via Core spent.
4. Manual entry to EF, funded-from Core Living: EF ↑; Core spent ↑; safe-to-spend ↓ by that amount.
5. Manual entry to EF, funded-from Personal: EF ↑; Personal balance ↓; safe-to-spend ↓ via personal draws.
6. Delete that txn: reverses EF contribution and source usage.
7. Checklist / Future `__savings_confirm__` without funded-from still works unchanged.

---

## 6. Implementation touch list (for plan)

- `components/home/LivingSection.tsx`
- `components/manual-entry/ManualEntrySheet.tsx`
- `db/schema.ts`, `db/migrations/*`, `db/client.ts` patches
- `store/transactions.ts`
- `hooks/usePulseData.ts` (personalDraws / spent attribution)
- `components/transactions/TransactionRow.tsx` / `TransactionDetailSheet.tsx` (from hint)
- `docs/core-function.md` + `docs/design-and-features.md` (short notes)
- `AGENTS.md` business rule one-liner for funded-from

---

## Open decisions (resolved)

| Topic | Decision |
|-------|----------|
| Living primary metric | Spent primary, ceiling secondary |
| Entry shape | Destination bucket + optional funded-from (not a Transfer type) |
| Funded-from visibility | Only when destination is savings/investment |
| Allowed sources | Spending buckets including Personal |
| No source | Destination-only contribution |
