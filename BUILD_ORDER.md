# SpendSense — Build Order

> Track what's shipped and what's next. Check boxes as steps complete.
> Each step lists the files it touches and what "done" means.

---

## Phase 1 — Foundation

### Step 1: DB schema + Drizzle setup
- [x] `db/schema.ts` — 7 tables + `type` column on transactions (m0001 migration)
- [x] `db/client.ts` — expo-sqlite + Drizzle init, `runMigrations()`
- [x] `db/seed.ts` — seed default playbook, 8 buckets, keyword mappings
- [x] `db/migrations/` — m0000 (all tables) + m0001 (transaction type column)
- [x] `constants/defaults.ts` — default bucket values, income, EF floor, keyword map

**Done when:** migrations run on fresh install, seed populates defaults, TypeScript compiles clean.

### Step 2: Pulse screen — "Safe to Spend" dashboard
- [x] `app/(tabs)/index.tsx` — Home screen: HeroRing + Living + Future + Snapshot
- [x] `app/(tabs)/_layout.tsx` — Tab bar with center `[+]` FAB opening ManualEntrySheet
- [x] `components/home/HeroRing.tsx` — SVG ring (green/yellow/grey/red arcs), "Safe to Spend" center text, animated "N days left" pill, weekly rate below ring
- [x] `components/home/LivingSection.tsx` — spending buckets with progress bars
- [x] `components/home/FutureSection.tsx` — savings checklist, one-way checkbox, strikethrough on confirm, auto-logs transaction
- [x] `components/home/MonthSnapshotRow.tsx` — "Income: 1.25L | Saved: 50K | Spent: 22K"
- [x] `hooks/usePulseData.ts` — centralized calculations (available, flagged, savings split, weekly rate, days remaining)
- [x] `components/ui/Card.tsx`, `ProgressBar.tsx`, `Chip.tsx` — UI primitives
- [x] `constants/colors.ts` — design tokens
- [x] `lib/format.ts` — formatNPR, formatNPRShort, formatDate, formatMonth
- [x] `lib/month.ts` — getMonthRange, getDaysRemaining

**Done when:** Pulse shows "Safe to Spend" ring with real data. Living progress bars and Future checklist functional. Checking a savings item logs transaction and updates ring.

### Step 3: Zustand stores + wire Pulse to live data
- [x] `store/playbook.ts` — income, month start day, EF floor, onboarded flag
- [x] `store/buckets.ts` — bucket list, keyword mappings, sure-shot merchants
- [x] `store/transactions.ts` — month transactions, flagged list, spentByBucket, getTotalIncome, addTransaction, ensureSalaryTransaction
- [x] `store/goals.ts` — goal definitions
- [x] `app/_layout.tsx` — DB init -> seed -> hydrate all stores -> auto-salary on launch

**Done when:** Stores hydrate from DB. Salary auto-created on month start. All Pulse data is live.

---

## Phase 2 — Core Transaction Flow

### Step 4: Manual Entry sheet
- [x] `components/manual-entry/ManualEntrySheet.tsx` — Modal form: amount (large/centered), expense/income toggle, bucket chips, merchant, remarks (#tag hint), date picker, recurring toggle
- [x] Wire `[+]` FAB via custom `tabBarButton` to open ManualEntrySheet
- [x] `lib/categorize.ts` — 3-step auto-categorization (remarks suffix "keyword -" > sure-shot merchant > fallback + flag)
- [x] Income handling: salary auto-created, manual income toggle for extras, `_income` sentinel bucket
- [x] `@react-native-community/datetimepicker` installed

**Done when:** user can tap `[+]`, fill form, save transaction, see Pulse update reactively.

### Step 5: Categorization engine
- [x] `lib/categorize.ts` — 3-step priority logic
- [x] Wired into ManualEntrySheet save flow
- [ ] Wire into OCR flow (step 11)

**Done when:** `coffee fun -` → Fun bucket. Known merchant → mapped bucket. Unknown → fallback + flag.

### Step 6: Ledger screen (Transactions tab)
- [x] `app/(tabs)/transactions.tsx` — transaction list grouped by date, filter chips, summary row, list/chart toggle
- [x] `components/transactions/TransactionRow.tsx` — merchant, bucket pill, amount (red/green), flagged border
- [x] `components/transactions/TransactionDetailSheet.tsx` — edit bucket/remarks, delete with confirmation
- [x] `components/transactions/ChartsView.tsx` — spending by bucket bar chart (react-native-gifted-charts)
- [x] `store/transactions.ts` — added `updateTransaction()`, `deleteTransaction()`
- [x] Filter chips: All | per-bucket | Savings | Income | Flagged

**Done when:** Transactions tab shows all this-month entries. User can view details, edit bucket, delete. Charts toggle works.

### Step 7: Flagged transaction prompt
- [ ] `components/flagged/FlaggedTransactionPrompt.tsx` — surfaces one flagged txn at a time on app open
- [ ] Bucket picker for reassignment
- [ ] Option to add merchant as sure-shot for future auto-categorization
- [ ] Yellow ring segment on Pulse reflects flagged amount

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
- [x] `app/(tabs)/settings.tsx` — 7-section settings: Playbook, Buckets, Keywords, Merchants, Notifications, Data, Developer
- [x] Playbook: inline-editable income, month start day, EF floor
- [x] Buckets: list + tap-to-edit + add + explicit delete button
- [x] Keyword mappings: list + add + delete
- [x] Sure-shot merchants: list + add + delete
- [x] Notification toggles (local state, wired in step 12)
- [x] CSV export (builds CSV string from this-month transactions)
- [x] Developer: "Clear All Data" — clears tables, re-seeds defaults, reloads stores
- [x] `store/buckets.ts` — added CRUD: addBucket, updateBucket, deactivateBucket, addKeywordMapping, deleteKeywordMapping, addSureShotMerchant, deleteSureShotMerchant

**Done when:** all playbook values editable. Bucket/keyword/merchant CRUD works. CSV export works. Dev reset works.

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
- [ ] Nudge triggers: budget breach, savings reminder, EF warning, recurring draft confirm
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
