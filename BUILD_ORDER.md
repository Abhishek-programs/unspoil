# SpendSense — Build Order

> Track what's shipped and what's next. Check boxes as steps complete.
> Each step lists the files it touches and what "done" means.

---

## Phase 1 — Foundation (Completed ✅)

### Step 1: DB schema + Drizzle setup
- [x] `db/schema.ts` — 7 tables + `type` column + `user_name` column
- [x] `db/client.ts` — expo-sqlite + Drizzle init, `runMigrations()`
- [x] `db/seed.ts` — seed default playbook, 8 buckets, keyword mappings (idempotent)
- [x] `db/migrations/` — m0000, m0001, m0002 (automated with manual registry)
- [x] `constants/defaults.ts` — default bucket values, income, EF floor, keyword map

### Step 2: Pulse screen — "Safe to Spend" dashboard
- [x] `app/(tabs)/index.tsx` — Home screen: HeroRing + Living + Future + Snapshot
- [x] Standardized Header (64px padding) + Dynamic Greeting ("Good Morning, Abhishek")
- [x] `components/home/HeroRing.tsx` — SVG ring, Safe to Spend center, weekly rate
- [x] `components/home/LivingSection.tsx` — spending buckets with progress bars
- [x] `components/home/FutureSection.tsx` — savings checklist (one-way check)
- [x] `components/home/MonthSnapshotRow.tsx` — Basic Income/Saved/Spent summary
- [ ] The future section needs to show the buckets from savings and investment, if new bucket is added, reflect there.
- [ ] Completely remove the BigExpense Debt bucket. User should be able to add that custom if needed.
- [ ] Start the screens title from same distance from top of phone. Make design consistent between pages
- [ ] Make sure the net worth calculation are working properly. The pulse page does not require 2 section showing same info. If netw worth is added, remove the last compontent showing income, saved and spent
- [ ] **[TODO]** Expand Net Worth Card: Tap for asset breakdown (EF, MacBook, Shares)

### Step 3: Zustand stores + wire Pulse to live data
- [x] `store/playbook.ts` — income, start day, EF floor, `userName`, `isOnboarded`
- [x] `store/buckets.ts` — bucket list, keyword mappings, sure-shot merchants
- [x] `store/transactions.ts` — CRUD, spentByBucket, getTotalIncome
- [x] `store/goals.ts` — goal definitions
- [x] `app/_layout.tsx` — DB init -> migration -> seed -> hydration

---

## Phase 2 — Core Transaction Flow (In Progress 🚧)

### Step 4: Manual Entry center [+] button
- [x] `app/(tabs)/_layout.tsx` — Center circular raised green FAB
- [x] `components/manual-entry/ManualEntrySheet.tsx` — Amount-first form, bucket chips, remarks hint
- [x] Integration with `lib/categorize.ts` logic
- [x] **[TODO]** Mode toggle: Manual vs Scan Receipt (PRD F1/F5)

### Step 5: Categorization engine
- [x] `lib/categorize.ts` — 3-step logic: Remarks suffix -> Sure-shot -> Fallback + Flag
- [x] Bucket auto-selection based on remarks suffix ("keyword -")
- [ ] **[TODO]** Wire into OCR flow (Step 11)

### Step 6: Ledger screen (Transactions tab)
- [x] `app/(tabs)/transactions.tsx` — List grouped by date, Filter chips, Summary row
- [x] `components/transactions/TransactionRow.tsx` — bucket pill, merchant, amount
- [x] `components/transactions/TransactionDetailSheet.tsx` — reassign bucket, delete
- [ ] Make sure if the section like spending by bucket has no content then have a info or placeholder informing what is meant to be here and when it will show
- [ ] **[TODO]** `ChartsView.tsx` — Donut breakdown, 6-Month Trend, Milestone markers
- [ ] **[TODO]** Annual View toggle (PRD F11)

### Step 7: Flagged transaction prompt (PRD F4 / Flow 9)
- [ ] `app/(tabs)/index.tsx` — Amber banner shown when `transactions.filter(t => t.isFlagged)` is not empty
- [ ] `components/flagged/FlaggedTransactionPrompt.tsx` — Bottom sheet identifying "Needs Review" items
- [ ] Sequential walkthrough of flagged items (1 of N)
- [ ] Assignment clears flag bit in DB

---

## Phase 3 — Goals + Planning 🎯

### Step 8: Vault / Goals screen
- [ ] `app/(tabs)/goals.tsx` — Goal cards with circular progress rings
- [ ] `components/goals/GoalDetailSheet.tsx` — Details view, history list, edit button
- [ ] `lib/projection.ts` — Linear math for "Days remaining" and "Projected Date"
- [ ] `components/goals/SensitivityNudge.tsx` — "Add NPR X/month to finish Y months sooner"
- [ ] Emergency Fund is a default bucket, which should be shown in the goals page as well.

### Step 9: Onboarding & Setup
- [ ] `app/onboarding/` — 7-step first-launch wizard (Phase 1 built core 2 steps)
  1. [x] Welcome / Personal Info (Step 1)
  2. [x] Set monthly income & month start day (Step 2)
  3. [ ] Review default buckets (edit amounts)
  4. [ ] Set EF floor
  5. [ ] Initial balances (EF, shares)
  6. [ ] Add sure-shot merchants (optional)
  7. [x] Confirmation + mark `isOnboarded = true`
  8. [ ] Make Emergency Fund a mandatory and pre calculated bucket which operates depending on the EF floor. Allow user to set the monthly savings like currrently, but also suggest what should be saved depending on the EF floor.
- [x] `store/playbook.ts` — `setOnboarded()` logic
- [x] `app/(tabs)/settings.tsx` — Playbook edit, Bucket/Keyword/Merchant CRUD
- [x] Developer: Clear All Data / Reset

---

## Phase 4 — Advanced Features (Completed ✅)

### Step 10: Month Start Checklist (PRD F10)
- [x] Modal/Banner on start of month. but show them if not ticked off before.
- [x] Confirm salary received, confirm fixed transfers (SIP, EF, etc.)
- [ ] User could come to the page when ever, if they have not filled for that month, show. And when they tick off, update the last_checklist_month in playbook. And add relevant transaction
- [ ] Auto-create recurring drafts (PRD F5)

### Step 11: OCR Scanner (F1)
- [ ] `lib/ocr.ts` — `rn-mlkit-ocr` + Regex templates for eSewa, Khalti, major Banks
- [ ] Validation checklist ("NPR", "Amount", "Success" keywords)
- [ ] Pre-fill feedback loop into ManualEntrySheet

### Step 12: Notifications & Nudges (F9)
- [ ] `expo-notifications` 1-per-day limit logic
- [ ] Quiet hours (10pm - 8am)
- [ ] Nudge triggers: 80% ceiling, investment pending, EF milestone

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
