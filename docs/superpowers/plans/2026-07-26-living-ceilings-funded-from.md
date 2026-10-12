# Living ceilings + funded-from Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox syntax.

**Goal:** Reframe Living ceilings as spent-first, and add optional “Funded from” on savings/investment manual entries so source Living/Personal usage is applied with the EF (etc.) contribution.

**Architecture:** One `transactions.funded_from_bucket_id` column. Savings confirms keep `bucketId` = destination + `remarks = __savings_confirm__`. Spent/personal-draw math also attributes amount to `fundedFromBucketId`. Personal debit runs when funded-from is an accumulating bucket.

**Tech Stack:** Expo SDK 54, Drizzle/SQLite, Zustand, existing ManualEntrySheet / LivingSection.

**Spec:** `docs/superpowers/specs/2026-07-26-living-ceilings-funded-from-design.md`

## Global Constraints

- Manual entry only (no OCR/share/Transfer type).
- Funded-from UI only when destination is savings|investment.
- No tests in V1; verify with tsc + acceptance checklist in spec.

---

### Task 1: Schema + migration + patch

- [ ] Add `fundedFromBucketId` to `db/schema.ts` transactions
- [ ] Add `m0010` SQL + journal entry + `db/migrations/index.ts`
- [ ] Idempotent `ALTER` in `applySchemaPatches` in `db/client.ts`

### Task 2: Store + pulse attribution

- [ ] Extend `Transaction` + insert/update/delete funded-from Personal debit/restore
- [ ] `getSpentByBucket` includes funded-from savings confirms for regular buckets
- [ ] `usePulseData` personalDraws includes funded-from Personal confirms
- [ ] `ensureSalaryTransaction` / other `addTransaction` callers pass `fundedFromBucketId: null`

### Task 3: Living UI

- [ ] `LivingSection` spent-primary / ceiling-secondary + subtitle

### Task 4: Manual entry + ledger hint

- [ ] Funded-from chips when dest is savings/investment; save as `__savings_confirm__` + fundedFrom
- [ ] TransactionRow / DetailSheet “from {bucket}” hint (read-only ok)

### Task 5: Docs touch

- [ ] Short notes in AGENTS / design-and-features / core-function
- [ ] Mark spec Status: Implemented
