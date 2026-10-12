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
- [x] `app/(tabs)/index.tsx` — Home screen: HeroRing + Living + Future + NetWorthCard
- [x] Standardized Header (64px padding) + Dynamic Greeting ("Good Morning, Abhishek")
- [x] `components/home/HeroRing.tsx` — SVG ring, Safe to Spend center, weekly rate
- [x] `components/home/LivingSection.tsx` — spending buckets with progress bars + empty placeholder
- [x] `components/home/FutureSection.tsx` — savings/investment checklist (one-way check)
- [x] `components/home/MonthSnapshotRow.tsx` — Removed (redundant with NetWorthCard)
- [x] Future section shows savings AND investment buckets with showOnHome
- [ ] **[TODO]** Expand Net Worth Card: Tap for asset breakdown (EF, MacBook, Shares)

### Step 3: Zustand stores + wire Pulse to live data
- [x] `store/playbook.ts` — income, start day, EF floor, `userName`, `isOnboarded`
- [x] `store/buckets.ts` — bucket list, keyword mappings, sure-shot merchants, EF protection guard
- [x] `store/transactions.ts` — CRUD, spentByBucket, getTotalIncome
- [x] `store/goals.ts` — goal definitions, CRUD (addGoal, updateGoal, deleteGoal)
- [x] `app/_layout.tsx` — DB init -> migration -> seed -> hydration

---

## Phase 2 — Core Transaction Flow (Completed ✅)

### Step 4: Manual Entry center [+] button
- [x] `app/(tabs)/_layout.tsx` — Center circular raised green FAB
- [x] `components/manual-entry/ManualEntrySheet.tsx` — Amount-first form, bucket chips, remarks hint
- [x] Integration with `lib/categorize.ts` logic
- [x] Mode toggle: Manual vs Scan Receipt (PRD F1/F5)

### Step 5: Categorization engine
- [x] `lib/categorize.ts` — 3-step logic: Remarks suffix -> Sure-shot -> Fallback + Flag
- [x] Bucket auto-selection based on remarks suffix ("keyword -")
- [ ] **[TODO]** Wire into OCR flow (Step 11)

### Step 6: Ledger screen (Transactions tab)
- [x] `app/(tabs)/transactions.tsx` — List grouped by date, Filter chips, Summary row
- [x] `components/transactions/TransactionRow.tsx` — bucket pill, merchant, amount
- [x] `components/transactions/TransactionDetailSheet.tsx` — reassign bucket, delete
- [x] `ChartsView.tsx` — Horizontal bar chart with green/amber/red thresholds, 6-month trend, annual view
- [x] Annual View toggle wired to period prop
- [x] Empty states for no data and insufficient history

### Step 7: Flagged transaction prompt (PRD F4 / Flow 9)
- [x] `app/(tabs)/index.tsx` — Amber banner shown when `transactions.filter(t => t.isFlagged)` is not empty
- [x] `components/flagged/FlaggedTransactionPrompt.tsx` — Bottom sheet identifying "Needs Review" items
- [x] Sequential walkthrough of flagged items (1 of N)
- [x] Assignment clears flag bit in DB
- [x] "Always use this bucket for [merchant]" adds to sure_shot_merchants
- [x] Banner disappears when all flags cleared, HeroRing updates reactively

---

## Phase 3 — Goals & Vault (Completed ✅)

### Step 8: Vault / Goals screen
> **Note:** EF target = 6 × Core Living, not income-based. See `EF_MULTIPLIER` in `constants/defaults.ts`.
- [x] `app/(tabs)/goals.tsx` — Goal cards with circular progress rings
- [x] Emergency Fund pseudo-goal derived from playbook efFloor, pinned at top
- [x] `components/goals/AddGoalSheet.tsx` — Create/edit goals with bucket picker
- [x] `components/goals/GoalDetailSheet.tsx` — Details view, projection, delete button
- [x] `lib/projection.ts` — Linear math for "Days remaining" and "Projected Date"
- [x] `components/goals/GoalCard.tsx` — Sensitivity nudge suggestion
- [x] Goal balance calculation uses only `__savings_confirm__` transactions
- [x] Summary card: "Total Saved" + EF coverage months + monthly commitment

---

## Phase 4 — Onboarding & Setup (Completed ✅)

### Step 9: Onboarding
- [x] `app/onboarding/` — 5-step first-launch wizard
  1. [x] Welcome / Personal Info (Step 1)
  2. [x] Set monthly income & month start day (Step 2)
  3. [x] Review default buckets — edit amounts, toggle off (Step 3)
  4. [x] Set EF floor with auto-suggestion (Step 4)
  5. [x] Initial balances — EF, equity/shares (Step 5)
  6. [x] Confirmation + mark `isOnboarded = true`
- [x] `constants/defaults.ts` — EF_BUCKET_ID stable identifier
- [x] `db/seed.ts` — Uses stable EF_BUCKET_ID for Emergency Fund
- [x] `store/buckets.ts` — EF bucket deactivation guard
- [x] `app/(tabs)/settings.tsx` — Protected badge for EF bucket

---

## Phase 5 — Home Polish (Completed ✅)

### Step 10: Month Start Checklist (PRD F10)
- [x] Modal/Banner on start of month. but show them if not ticked off before.
- [x] Confirm salary received, confirm fixed transfers (SIP, EF, etc.)
- [ ] User could come to the page when ever, if they have not filled for that month, show. And when they tick off, update the last_checklist_month in playbook. And add relevant transaction
- [ ] Auto-create recurring drafts (PRD F5)

### Step 5.1-5.4: Home Polish
- [x] Removed MonthSnapshotRow (redundant with NetWorthCard)
- [x] FutureSection shows investment buckets with `showOnHome: true`
- [x] LivingSection shows "No transactions yet this month" placeholder for empty buckets
- [x] Header heights consistent across all 4 tabs (paddingTop: 64)

---

## Remaining Work

### Step 11: OCR Scanner — V1 (image picker flow)
- [ ] `lib/ocr.ts` — add `parseOcrText()` with regex for eSewa, Khalti, NMB, Global IME
- [ ] Validation: confirm NPR amount matched before pre-filling form
- [ ] Pre-fill `ManualEntrySheet` from parsed fields (amount, merchant)
- [ ] Wire `expo-image-picker` → OCR → pre-fill → user confirms

### Step 12: Notifications & Nudges (F9)
- [ ] Add `expo-notifications` plugin to `app.json`
- [ ] `lib/notifications.ts` — 1-per-day limit logic, quiet hours (10pm–8am)
- [ ] Nudge triggers: 80% ceiling, investment pending, EF milestone
- [ ] Permission prompt on first app open (Android + iOS)

---

## V2 — Bubble Overlay (separate effort, Android only)

> Full architecture + LLM-ready implementation prompt: `reference/OVERLAY_LLM_PROMPT.md`

### Phase 1: Bubble infrastructure (no OCR)
- [ ] `android/.../overlay/OverlayService.kt` — Foreground service + WindowManager
- [ ] `android/.../overlay/FloatingBubbleView.kt` — Draggable green bubble
- [ ] `android/.../overlay/OverlayModule.kt` + `OverlayPackage.kt` — RN bridge
- [ ] `AndroidManifest.xml` — FOREGROUND_SERVICE + media_projection service declaration
- [ ] `MainApplication.kt` — register OverlayPackage
- [ ] `lib/overlay.ts` — JS wrapper
- [ ] Settings toggle (start/stop bubble)
- [ ] **Done when:** bubble appears over banking app, drags, dismisses ✅

### Phase 2: Screen capture
- [ ] `android/.../overlay/ScreenCaptureManager.kt` — MediaProjection → Bitmap
- [ ] `OverlayModule.requestMediaProjectionPermission()` — one-time permission dialog
- [ ] Wire tap → capture → debug toast with bitmap dimensions
- [ ] **Done when:** tap bubble → toast shows "Captured 1080×2340" ✅

### Phase 3: OCR pipeline
- [ ] `android/.../overlay/MLKitOCRProcessor.kt` — ML Kit on captured bitmap
- [ ] `android/.../overlay/OcrResultBridge.kt` — emits `onOcrResult` to JS
- [ ] `hooks/useOverlay.ts` — receive event, log raw text
- [ ] Add ML Kit gradle dep (`com.google.mlkit:text-recognition:16.0.1`)
- [ ] **Done when:** tap over eSewa → toast shows extracted text ✅

### Phase 4: Categorize + save
- [ ] Extend `lib/ocr.ts` with `parseOcrText()` (amount/merchant regex)
- [ ] Complete `hooks/useOverlay.ts` — categorize → addTransaction → toast
- [ ] Add `useOverlay()` to `app/_layout.tsx`
- [ ] Add `'overlay'` to transaction source union + migration if needed
- [ ] **Done when:** silent end-to-end flow, transaction in Ledger ✅

---

## Dependency Graph

```
Step 1 ──> Step 2 ──> Step 3 ──> Step 4 ──> Step 5
                                    │          │
                                    v          v
                                  Step 6    Step 7
                                    │
                                    v
                                  Step 8 ✅
                                    │
                                    v
                          Step 9 ✅ + Step 10
                                    │
                                    v
                            Step 11 + Step 12
```

---

## Phase 6 — AI Layer (exploratory, no timeline)

- [ ] `ai/insights.ts` — monthly data → plain English commentary
- [ ] `ai/goals.ts` — goal + surplus → acceleration scenarios
- [ ] `ai/ef.ts` — multi-month patterns → EF contribution nudge
- Tap-triggered UI only. No chat. No text input.
- Prerequisite: 3+ months of real transaction data
