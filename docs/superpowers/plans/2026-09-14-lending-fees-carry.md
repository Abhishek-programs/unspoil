# Lending, Fees, Carry, and Checklist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add lending edit/delete, one-shot checklist prompting, transaction fees with SIP chunks and analytics, correct carried-forward cash math, and remove Living ceiling reallocation.

**Architecture:** Extend the existing SQLite rows rather than creating synthetic fee or settlement transactions. Keep lending as its own ledger, make all cash effects converge in `usePulseData` and rollover math, and reuse existing sheets/forms for edits and confirmations.

**Tech Stack:** Expo SDK 54, React Native, TypeScript, Expo Router, Zustand, expo-sqlite, Drizzle.

## Global Constraints

- No backend, auth, sync, new dependency, or new bucket.
- Playbook months use `month_start_day`.
- Fees apply only to expense transactions and never count toward bucket/SIP progress.
- A cash debit is `amount + feeAmount`.
- Carry is floored at zero only at rollover; Safe to spend never includes carry.
- No automated test framework exists in V1; verify with TypeScript, lint diagnostics, and focused runtime checks.
- Do not touch the user's modified `assets/adaptive-icon.png`.
- Do not run git commands without explicit permission.

---

### Task 1: Persist fee and checklist-prompt fields

**Files:**
- Modify: `db/schema.ts`
- Modify: `db/migrations/index.ts`
- Modify: `db/migrations/meta/_journal.json`
- Modify: `db/client.ts`
- Modify: `store/playbook.ts`
- Modify: `store/transactions.ts`

**Interfaces:**
- Produces: `Transaction.feeAmount: number`
- Produces: `PlaybookState.lastChecklistPromptMonth: string | null`

- [ ] Add `fee_amount real NOT NULL DEFAULT 0` to transactions and `last_checklist_prompt_month text` to playbook.
- [ ] Add a new inlined Drizzle migration and matching journal entry.
- [ ] Add idempotent `hasColumn` fallback ALTER statements in `db/client.ts`.
- [ ] Map defaults (`row.feeAmount ?? 0`) so existing rows remain valid.
- [ ] Include both fields in store load/update/insert paths.
- [ ] Run `npx tsc --noEmit`; expected: no new errors from these files.

### Task 2: Make transaction fee cash accounting correct

**Files:**
- Modify: `store/transactions.ts`
- Modify: `components/manual-entry/ManualEntrySheet.tsx`
- Modify: `components/transactions/TransactionDetailSheet.tsx`
- Modify: `components/transactions/TransactionRow.tsx`

**Interfaces:**
- Consumes: `Transaction.feeAmount`
- Produces: expense account debit/reversal using `amount + feeAmount`

- [ ] Add hidden-by-default Fee chip and decimal fee input beside the amount section for every manual expense, including savings/investment destinations.
- [ ] Save fee as zero for income, lending, and payment-helper-created rows.
- [ ] Let expense details edit amount and fee; keep fee hidden until nonzero or chip tapped.
- [ ] In add/update/delete account effects, debit or reverse `amount + feeAmount`.
- [ ] Keep bucket balances, funded-from debit, progress, and categorization based on `amount` only.
- [ ] Show `fee NPR …` on Ledger rows and details when nonzero.
- [ ] Run `npx tsc --noEmit`; expected: no new errors.

### Task 3: Add SIP 5,000 chunks and per-chunk fees

**Files:**
- Modify: `app/(tabs)/index.tsx`
- Modify: `components/home/FutureSection.tsx`
- Modify: `components/home/MonthStartChecklist.tsx`
- Modify: `components/home/ShareConfirmSheet.tsx`
- Modify: `store/transactions.ts`

**Interfaces:**
- Produces: remaining SIP amount derived from current-month `__savings_confirm__` rows
- Produces: one SIP transaction per chunk with `{ amount: min(5000, remaining), feeAmount }`

- [ ] Change SIP completion from “any confirmation exists” to confirmed principal ≥ monthly SIP amount.
- [ ] Render pending SIP as `+5,000` chunk actions (plus remainder chunk) in Future and Month Start Ritual.
- [ ] On a SIP chunk tap, open confirmation with fixed principal and editable fee (zero allowed), then insert one transaction.
- [ ] Keep Direct Shares as one editable principal confirmation, with optional fee.
- [ ] Ensure fees do not increase SIP progress, net worth, or checklist completion.
- [ ] Run `npx tsc --noEmit`; expected: no new errors.

### Task 4: Correct Your money and month rollover

**Files:**
- Modify: `hooks/usePulseData.ts`
- Modify: `lib/month-surplus.ts`
- Modify: `app/_layout.tsx`
- Modify: `components/home/NetWorthCard.tsx`
- Modify: `components/lending/SettleUpSheet.tsx`

**Interfaces:**
- Produces: signed `monthRemainingBalance`
- Produces: `yourMoney = max(0, monthLeftover + carry + stillInBank + foundMoney)`
- Produces: rollover `max(0, oldCarry + previousMonthLeftover + previousMonthStillInBank)`

- [ ] Sum current-month expense fees and subtract them once from Safe to spend / month leftover.
- [ ] Stop clamping the month component before adding carried-forward cash.
- [ ] Let signed month leftover consume still-in-bank cash before flooring the final Your money total.
- [ ] Display signed “Remaining this month” in the expanded card while keeping the collapsed cash total nonnegative.
- [ ] Make previous-month rollover include lifestyle/personal spending, lending/settlement cash adjustment, fees, and unconfirmed Future cash.
- [ ] Preserve borrow/settle entries as the only source of lending cash effects; do not create normal transactions.
- [ ] Update Settle Up copy to say cash adds to or leaves Your money.
- [ ] Ensure rollover reloads current transactions/playbook after calculating the previous month.
- [ ] Run `npx tsc --noEmit`; expected: no new errors.

### Task 5: Add lending entry and person edit/delete

**Files:**
- Modify: `store/lending.ts`
- Modify: `app/lending/[contactId].tsx`
- Modify: `app/(tabs)/transactions.tsx`
- Modify: `components/transactions/LendingRow.tsx`
- Create: `components/lending/LendingEntrySheet.tsx`

**Interfaces:**
- Produces: `updateEntry(id, patch)`
- Produces: cascading `deleteContact(id)`

- [ ] Add `updateEntry` for amount/type/note/date and reload cached lists.
- [ ] Validate edited settlement amount against the person balance excluding that settlement entry.
- [ ] Make `deleteContact` delete all of the person's lending rows before deleting the contact.
- [ ] Open a reusable entry details sheet from person history and Ledger Lending rows.
- [ ] Add save/delete controls with destructive confirmation.
- [ ] Add person trash control and navigate back after confirmed cascade deletion.
- [ ] Run `npx tsc --noEmit`; expected: no new errors.

### Task 6: Prompt checklist once per playbook month

**Files:**
- Modify: `app/(tabs)/index.tsx`
- Modify: `store/playbook.ts`

**Interfaces:**
- Consumes: `lastChecklistPromptMonth`

- [ ] Auto-open only when prompt month differs and checklist is incomplete.
- [ ] Persist the month key immediately when auto-opening.
- [ ] Keep `lastChecklistMonth` exclusively for all-items-complete state.
- [ ] Preserve pending banner and manual list-icon access after dismiss.
- [ ] Run `npx tsc --noEmit`; expected: no new errors.

### Task 7: Remove Living reallocation

**Files:**
- Modify: `components/home/LivingSection.tsx`
- Modify: `components/home/PersonalCapPrompt.tsx`
- Modify: `app/(tabs)/index.tsx`
- Delete if unused: `components/home/LivingReallocateSheet.tsx`
- Delete if unused: `lib/living-reallocate.ts`

**Interfaces:**
- Preserves: overspend bars and Personal recovery

- [ ] Remove the reallocate icon, sheet state, and ceiling-cut action.
- [ ] Remove the Personal cap prompt's reallocate branch while keeping cap controls/recovery.
- [ ] Keep bucket `monthlyAmount` unchanged after overspending.
- [ ] Delete now-unused reallocation files/imports.
- [ ] Run `npx tsc --noEmit`; expected: no new errors.

### Task 8: Add fee analytics and update product docs

**Files:**
- Modify: `app/(tabs)/transactions.tsx`
- Modify: `components/transactions/ChartsView.tsx`
- Modify: `lib/chart-data.ts`
- Modify: `docs/core-function.md`
- Modify: `docs/design-and-features.md`

**Interfaces:**
- Produces: period fee total and monthly fee trend

- [ ] Compute fee totals from non-flagged, non-draft expenses.
- [ ] Add a Fees analytics card/line and fee trend without creating a filter bucket.
- [ ] Keep spending trend principal behavior unchanged except where the design explicitly requires fee visibility.
- [ ] Document fee semantics, signed current-month cash, rollover subtraction, one-shot checklist, lending CRUD, and removed reallocation.
- [ ] Run `npx tsc --noEmit`; expected: exit code 0.
- [ ] Read IDE lints for all modified files; expected: no newly introduced diagnostics.
- [ ] Review the final diff manually for duplicate cash debits and accidental changes to `assets/adaptive-icon.png`.
