# SpendSense — Build Order

> Track what's shipped and what's next. Check boxes as steps complete.
> Each step lists the files it touches and what "done" means.

---

## Phase 1 — Foundation

### Step 1: DB schema + Drizzle setup
- [x] `db/schema.ts` — 7 tables (playbook, buckets, transactions, goals, keywordMappings, sureShotMerchants, netWorthSnapshots)
- [x] `db/client.ts` — expo-sqlite + Drizzle init, `runMigrations()`
- [x] `db/seed.ts` — seed default playbook, 8 buckets, keyword mappings
- [x] `db/migrations/` — generated migration for all tables
- [x] `constants/defaults.ts` — default bucket values, income, EF floor, keyword map

**Done when:** migrations run on fresh install, seed populates defaults, TypeScript compiles clean.

### Step 2: Pulse screen UI shell
- [x] `app/(tabs)/index.tsx` — Home/Dashboard layout
- [x] `app/(tabs)/_layout.tsx` — Tab bar with center `[+]` FAB
- [x] `components/ui/Card.tsx`, `ProgressBar.tsx`, `Chip.tsx` — UI primitives
- [x] `components/home/NetWorthCard.tsx` — net worth display
- [x] `components/home/BucketRow.tsx` — spending bucket row with progress bar
- [x] `components/home/SavingsRow.tsx` — savings/investment row with confirm toggle
- [x] `components/home/MonthHealthCard.tsx` — 4-row health summary
- [x] `constants/colors.ts` — design tokens
- [x] `lib/format.ts` — formatNPR, formatNPRShort, formatDate, formatMonth
- [x] `lib/month.ts` — getMonthRange (custom month start day)

**Done when:** Pulse screen renders all sections with layout and styling matching spec.

### Step 3: Zustand stores + wire Pulse to live data
- [x] `store/playbook.ts` — income, month start day, EF floor, onboarded flag
- [x] `store/buckets.ts` — bucket list, keyword mappings, sure-shot merchants
- [x] `store/transactions.ts` — month transactions, flagged list, spentByBucket
- [x] `store/goals.ts` — goal definitions
- [x] `app/_layout.tsx` — DB init -> seed -> hydrate all stores on launch
- [x] `app/(tabs)/index.tsx` — buckets, spending, savings, month health from stores

**Done when:** Pulse shows real seeded data. No hardcoded values in UI (except net worth which needs snapshot data).

---

## Phase 2 — Core Transaction Flow

### Step 4: Manual Entry sheet
- [ ] `components/manual-entry/ManualEntrySheet.tsx` — bottom sheet with form fields (amount, merchant, bucket picker, date, remarks)
- [ ] Wire `[+]` FAB in tab layout to open ManualEntrySheet
- [ ] `store/transactions.ts` — `addTransaction()` writes to DB + refreshes state
- [ ] Auto-categorization call on save (step 5 dependency — use fallback bucket until then)
- [ ] Income entry: monthly income auto-creates as draft on month_start_day, confirm within 3 days

**Done when:** user can tap `[+]`, fill form, save transaction, see it reflected in Pulse bucket totals.

### Step 5: Categorization engine
- [ ] `lib/categorize.ts` — 3-step priority: remarks prefix > sure-shot merchant > fallback bucket
- [ ] Wire into ManualEntrySheet save flow
- [ ] Wire into OCR flow (step 11)

**Done when:** `#fun coffee` auto-assigns to Fun bucket. Known merchant (NTC) auto-assigns to Core Living. Unknown merchant saves to fallback + flags.

### Step 6: Ledger screen (Transactions tab)
- [ ] `app/(tabs)/transactions.tsx` — transaction list grouped by date, search/filter
- [ ] `components/transactions/TransactionRow.tsx` — single transaction row
- [ ] `components/transactions/TransactionDetailSheet.tsx` — bottom sheet for edit/delete
- [ ] `components/transactions/ChartsView.tsx` — toggle between list and charts (react-native-gifted-charts)
- [ ] Swipe or tap to edit/delete, bucket reassign

**Done when:** Transactions tab shows all this-month entries. User can view details, edit bucket, delete. Charts toggle works.

### Step 7: Flagged transaction prompt
- [ ] `components/flagged/FlaggedTransactionPrompt.tsx` — surfaces one flagged txn at a time on app open
- [ ] Bucket picker for reassignment
- [ ] Option to add merchant as sure-shot for future auto-categorization
- [ ] Flagged banner on Pulse links to this flow

**Done when:** opening app with flagged transactions shows prompt. User can assign bucket or dismiss. Sure-shot merchant option works.

---

## Phase 3 — Goals + Planning

### Step 8: Vault / Goals screen
- [ ] `app/(tabs)/goals.tsx` — goal cards with progress
- [ ] `components/goals/GoalCard.tsx` — target, contributed, progress bar, projected date
- [ ] `components/goals/GoalDetailSheet.tsx` — bottom sheet for goal details + edit
- [ ] `components/goals/ProjectionNudge.tsx` — linear projection: "At this rate, you'll hit target by..."
- [ ] `lib/projection.ts` — `projectGoalCompletion()` math
- [ ] `store/goals.ts` — `addGoal()`, `updateGoal()`, `deleteGoal()`, contribution tracking

**Done when:** user can create goals, see progress, get projection nudges. Linked bucket contributions roll up.

---

## Phase 4 — Setup + Configuration

### Step 9: Onboarding flow
- [ ] `app/onboarding.tsx` — 7-step first-launch wizard
  1. Welcome / value prop
  2. Set monthly income
  3. Set month start day
  4. Review default buckets (edit amounts)
  5. Set EF floor
  6. Add sure-shot merchants (optional)
  7. Confirmation + mark `isOnboarded = true`
- [ ] `store/playbook.ts` — `setOnboarded()` navigates to tabs

**Done when:** fresh install shows onboarding. Completing it seeds personalized values and lands on Pulse.

### Step 10: Settings screen
- [ ] `app/(tabs)/settings.tsx` — playbook editor
- [ ] Edit income, month start day, EF floor
- [ ] Bucket management: add/edit/reorder/deactivate buckets
- [ ] Keyword mappings: add/edit/delete
- [ ] Sure-shot merchants: add/edit/delete
- [ ] Notification toggles (wired in step 12)
- [ ] CSV export of transactions

**Done when:** all playbook values editable. Bucket/keyword/merchant CRUD works. CSV export downloads file.

---

## Phase 5 — Advanced Features

### Step 11: OCR (Scan Receipt)
- [ ] `lib/ocr.ts` — screenshot -> rn-mlkit-ocr -> regex parse (amount, merchant, date, txn ID)
- [ ] Scan Receipt tab in ManualEntrySheet (default tab)
- [ ] `expo-image-picker` gallery selection
- [ ] Validation: check for receipt keywords before parsing
- [ ] Parsed fields pre-fill manual entry form
- [ ] Fallback: toast + switch to manual if OCR fails

**Done when:** user picks screenshot, OCR extracts fields, form pre-fills. Bad screenshots gracefully fall back to manual.

### Step 12: Notifications
- [ ] `expo-notifications` setup + permission request
- [ ] Nudge triggers (from screen-flows.md): budget breach, savings reminder, EF warning, recurring draft confirm
- [ ] Max 1 per day, quiet hours 10pm-8am
- [ ] Individual toggle per nudge type (wired from Settings)

**Done when:** nudges fire on trigger conditions. Quiet hours respected. Toggles work.

---

## Dependency Graph

```
Step 1 ──> Step 2 ──> Step 3 ──> Step 4 ──> Step 5
                                    │          │
                                    v          v
                                  Step 6    Step 7
                                    │
                                    v
                                  Step 8
                                    │
                                    v
                          Step 9 + Step 10
                                    │
                                    v
                            Step 11 + Step 12
```

Steps 9 and 10 can be built in parallel. Steps 11 and 12 can be built in parallel.
