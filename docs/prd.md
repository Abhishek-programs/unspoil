# SpendSense — Product Requirements Document
**Version:** 1.2
**Platform:** Android (first)
**Status:** Active development
**Last Updated:** 2026-06-08

---

## 1. Overview

### 1.1 Product Summary
SpendSense is a personal finance tracking app for Android built with React Native + Expo. It captures expenses by scanning payment receipts (screenshot OCR) or manual entry, maps them to a user-defined financial plan (playbook), and keeps the user passively informed about their financial health — without requiring a separate app for every payment service.

### 1.2 The Problem
- Payment apps (eSewa, Khalti, bank apps) are siloed — no single view of spending
- Generic expense apps don't understand personal financial plans (buckets, floors, goals)
- SMS/email reading requires invasive permissions and inconsistent parsing
- Manual entry apps fail because the habit doesn't stick

### 1.3 The Solution
- **Screenshot OCR capture (V1)** — user picks a receipt screenshot from gallery; on-device OCR extracts the transaction data automatically
- **Manual entry** — for cash payments or any receipt the OCR can't parse; accessible via the center "+" button in the nav bar
- **Playbook layer** — user's financial plan (buckets, floors, goals) is loaded into the app and all spending is mapped against it
- **Passive informing** — no blocking, no hard stops; just honest, timely nudges
- **Bubble overlay (V2)** — draggable scan bubble over banking apps; silent capture + save via MediaProjection + on-device OCR
- **Share intent capture** — deferred

### 1.4 Target User (V1)
Single professional, Nepal, NPR-based income, uses digital payments almost exclusively (eSewa, Khalti, bank transfer apps), has a structured personal finance plan with defined buckets and goals.

---

## 2. Goals & Non-Goals

### 2.1 V1 Goals
- Capture digital payment receipts via screenshot OCR with minimal friction (pick screenshot → auto-fill → confirm)
- Support manual entry for cash or any receipt OCR can't parse
- Map every transaction to the correct budget bucket automatically
- Surface playbook health passively throughout the month
- Track EF and MacBook goal progress at a glance
- Confirm monthly investment transfers via manual confirmation or receipt scan

### 2.2 Non-Goals (V1)
- Share intent / share-sheet capture — deferred
- SMS or email thread reading — deferred
- Dark mode — V2
- SIP/share portfolio tracking (NAV, returns, holdings) — V2
- "Ask the Plan" conversational feature — V2
- Bank account syncing or open banking
- Multi-user or shared budgets
- iOS support — V3
- Cloud backup / sync — V3

> **Note:** Floating bubble overlay is implemented in V2 (dev client required). Gallery OCR remains the primary V1 capture path for Expo Go / first-time users.

---

## 3. Core Concepts

### 3.1 Playbook
The user's personal financial plan. Contains:
- **Income** — monthly net
- **Buckets** — named spending or savings categories with monthly amounts
- **Floors** — minimum balances that must not be breached (e.g. Min EF)
- **Goals** — target amounts with timelines (e.g. MacBook, Full EF)

The playbook is pre-loaded with recommended default values. Every field is editable. Adding new buckets is supported.

### 3.2 Buckets
Two types:
- **Spending buckets** — Core Living, Food, Dates, Fun (have monthly limits)
- **Savings/investment buckets** — EF, SIPs, Shares (have monthly contribution targets)
- **Goal-linked buckets** — created per goal at onboarding: either one bucket (pay in full) or two (Pay upfront + EMI reserve)

### 3.3 Transaction
A single financial event. Has:
- Amount
- Date & time
- Merchant / recipient
- Source app (eSewa, Khalti, etc.)
- Bucket assignment
- Remarks / notes (optional)
- Entry type: Manual / OCR / Bubble (overlay)

### 3.4 Floors
Hard minimums the user has defined. App warns when approaching — never blocks.
- Example: Min EF = NPR 1,50,000 — never to be touched

---

## 4. Features

---

### F1 — Screenshot OCR Capture (V1 Primary)

**Description**
User opens SpendSense after completing a digital payment, taps "Scan Receipt", picks the payment receipt screenshot from their gallery, and the app extracts transaction data automatically using on-device OCR. The parsed fields pre-fill the entry form for quick review and save.

**OCR Engine**
- `rn-mlkit-ocr` — Google ML Kit Text Recognition, fully on-device, no internet required
- Per-app templates in `lib/ocr-templates/` (eSewa, Khalti, NMB, Global IME) extend shared regex patterns
- Extracted fields: amount, merchant/recipient, remarks, transaction ID
- Receipt validation: OCR output checked for receipt keywords ("NPR", "amount", "transaction", "success") — if not found, user is notified "this doesn't look like a receipt" and dropped into manual entry
- Requires **EAS dev client** build (not Expo Go)

**Permission Required**
- Gallery read access via `expo-image-picker` — standard, prompted on first use

**UX Flow**
1. User completes payment in eSewa / Khalti / bank app
2. Opens SpendSense, taps "+" center nav button or "Scan Receipt" in Transactions screen
3. Gallery picker opens — user selects the receipt screenshot
4. On-device OCR runs (< 2 seconds)
5. Parsed fields pre-fill Manual Entry bottom sheet: amount, merchant, date
6. User reviews, adjusts bucket if needed, taps Save
7. Auto-categorization runs; transaction saved

**Success Metric**
Gallery pick → pre-filled entry form in under 3 seconds.

---

### F2 — Floating Bubble Capture *(V2 — shipped in codebase)*

**Description**
A floating overlay bubble on Android. User taps it on a receipt screen in a whitelisted app; SpendSense captures a screenshot via `MediaProjection`, runs on-device OCR in a **Headless JS worker** (`rn-mlkit-ocr` + shared `processReceiptImage`), categorizes, and saves — user never leaves their payment app.

**Permissions Required**
- `SYSTEM_ALERT_WINDOW` (Draw over other apps)
- `PACKAGE_USAGE_STATS` (App usage access — whitelist visibility)
- `MediaProjection` (Screen capture)
- All opt-in via Settings → Scan Bubble

**UX Flow**
1. Enable bubble in Settings after granting all three permissions
2. Pay in banking app → receipt on screen (bubble visible only on whitelisted apps)
3. Tap green floating bubble (draggable, snaps to edge; long-press → stop)
4. Silent capture → headless OCR → save → toast: `NPR 500 saved` or `… needs review`
5. Transaction appears in Ledger with source badge **Bubble**

**Implementation** *(see [overlay-v2.md](./overlay-v2.md) for current architecture)*
- Native Kotlin in `native/android/screenshotbubble/` via `plugins/withSpendSenseOverlay.js`
- TypeScript: `lib/overlay.ts`, `lib/overlay-headless.ts`, `index.js` (headless task)

---

### F3 — Share Intent Capture *(V2 — deferred from V1)*

**Description**
User taps Share on a receipt in their payment app and selects SpendSense from the share sheet. App receives shared text, parses it via regex templates, and processes in background.

**Deferred because:** Requires OS-level share target registration and per-app regex templates built from real invoice samples. V1 uses gallery picker instead.

**Supported Apps (V2):** eSewa, Khalti, and 1–3 bank apps (templates built once invoice samples are provided).

---

### F4 — Auto-Categorization

**Description**
Every incoming transaction is automatically assigned to a bucket using a three-step priority logic.

**Step 1 — Remarks prefix (highest priority)**
User writes a `#` prefix in the payment remark:
- `#fun - coffee` → Fun bucket
- `#core - electricity` → Core Living
- `#ef - march` → Emergency Fund
- `#sip - kumari` → SIPs

App reads the word after `#` and before the space or dash. Case-insensitive. Assigned silently.

**Step 2 — Sure-Shot Merchant Match**
If no remarks prefix, check merchant against a hardcoded list of unambiguous merchants:
- NTC, Ncell → Core Living
- User can add their own sure-shot merchants in Settings

Ambiguous merchants (e.g. Daraz) are deliberately excluded — they go to fallback.

**Step 3 — Fallback Bucket**
If neither step resolves, transaction is saved to the user's defined fallback bucket (default: Core Living) but flagged internally for confirmation.

Next time user opens the app → flagged transaction is surfaced:
*"Was this Core Living or something else?"*
User confirms or reassigns. Merchant is NOT memorized (too ambiguous). Flag clears.

**Manual Override**
User can always tap any transaction and change its bucket at any time.

---

### F5 — Manual Entry

**Description**
For cash payments, informal splits, or any expense that screenshot OCR cannot parse. Also used as the review/confirm step after OCR pre-fills the form. Accessible via the "+" center button in the bottom nav bar — not from any other screen or button.

**Entry Fields**
- Amount (required) — large, centered, auto-focused on open
- Bucket (required) — horizontal scrollable chip selector
- Merchant / description (optional)
- Remarks (optional) — hint text: "e.g. Fun - coffee" to nudge prefix habit
- Date — defaults to today, tappable to change
- Recurring toggle — off by default; if on, shows frequency (monthly only in V1)

**Recurring Entries**
- Monthly recurring entries auto-create as drafts on the user's defined month start day
- Drafts appear on the Home screen as a pending item — user confirms or edits before they count toward totals
- If not confirmed within 3 days of month start, a nudge notification fires

**Access**
- FAB only — center of bottom nav bar, raised above it, visible on all main screens
- No "Add manually" button anywhere else in the app

**Remarks Prefix Nudge**
- Remarks field always shows hint: "e.g. Fun - coffee"
- If user fills in a valid prefix (matching their keywords list), bucket auto-selects
- If bucket already selected and remarks prefix conflicts, remarks prefix wins

---

### F6 — Pulse Check (Home Screen)

**Description**
The primary screen. Shows safe-to-spend, bucket health, investment checklist, EF progress, and net worth for the current month.

**Layout**

**HeroRing (dual safe-to-spend)**
- Center: **actualSafeToSpend** — what you can spend after committed savings
- Outer arc: lifestyle budget consumed
- Inner arc: planned savings set aside (SIP, Shares, goal reserves)
- Floating pill: **safeBeforeInvestments** (*before savings*)

**Metric pills**
- Weekly spend rate vs plan
- Status pill (on track / caution / over)

**Lifestyle Section** (spending buckets)
- Progress bars with color coding: green (under 70%), amber (70–90%), red (90%+)

**Future Section** (month checklist)
- SIP confirm (one tap)
- Shares confirm (amount sheet)
- Goal transfers grouped by payment mode: pay in full → one row; upfront + EMI → Pay upfront + EMI reserve rows

**EF Goal Card + Net Worth Card**
- EF progress toward target with start balance from onboarding
- Net worth from EF + goal start balances + manual assets

**Uncategorized / flagged**
- Banner when flagged transactions need review

---

### F7 — Goal Trackers

**Description**
Persistent goal cards for EF and user-defined goals (e.g. MacBook).

**Emergency Fund Card**
- Current EF balance (from onboarding start balance + contributions)
- Progress bar toward target
- Projected date at current contribution rate

**User-defined goals**
- Payment mode at setup:
  - **Pay in full** — one savings bucket, monthly reserve until target date
  - **Pay upfront + EMI reserve** — two buckets: lump sum target + monthly EMI reserve until loan paid off
- Plain language in UI: "Pay upfront", "EMI reserve" — never Equity/Debt
- Projected completion from `computeGoalPlan` (linear math, labeled as estimate)
- Goals can be paused; buckets linked via `linked_goal_id`

**General Goal Structure**
- Goals editable — target, date, payment mode, monthly pace
- New goals via Goals tab or onboarding multi-goal flow

---

### F8 — Playbook Setup & Settings

**Description**
One-time setup during onboarding, fully editable at any time.

**Onboarding Flow (6 steps)**
1. **Welcome** — name + how the app works
2. **Money** — monthly income
3. **Foundations** — Core Living amount, EF target, current EF balance
4. **Goals** — named goals, target + date, payment mode (pay in full / upfront + EMI / not sure), savings pace slider
5. **Bucket Builder** — lifestyle meter, locked savings buckets, per-goal bucket blocks (Food included)
6. **Balances** — SIP + Shares cumulative start balances only (EF captured in Foundations)

**Settings (always accessible)**
- Edit any bucket, income, floors, keywords
- Scan Bubble — overlay + app usage + screen capture permissions + enable toggle (Android, dev client)
- Dev mock-data inject (`__DEV__`)
- Data export (CSV)

**Default Values (pre-loaded)**

| Bucket | Type | Default (NPR) |
|---|---|---|
| Core Living | Spending | 50,000 |
| Food | Spending | (from playbook) |
| Dates | Spending | 10,000 |
| Fun | Spending | 5,000 |
| Emergency Fund | Savings | 15,000/month |
| SIPs | Investment | 6,000/month |
| Direct Shares | Investment | 15,000/month |

Big purchase goals create buckets dynamically (`pay_in_full` → 1 bucket; `upfront_emi` → Pay upfront + EMI reserve). Not in default seed.

---

### F9 — Passive Nudges (Notifications)

**Description**
Timely, informational notifications. No blocking. No spam.

**Nudge Types**

| Trigger | Message |
|---|---|
| Spending bucket hits 80% | "Fun is at 82% — NPR 900 left this month" |
| Spending bucket hits 100% | "Core Living budget reached for March" |
| Month end approaching (day 28) + investment not confirmed | "SIP transfer not confirmed yet this month" |
| EF milestone hit | "EF hit 1,50,000 — Min EF reached 🎉 Switch contribution to 10,000/month" |
| Uncategorized transactions sitting for 3+ days | "3 transactions need categorizing" |
| Month start (day 1) | "New month — time for your Month Start checklist" |

**Rules**
- Maximum 1 nudge per day
- All nudge types individually toggleable in Settings
- No nudges between 10pm and 8am

---

### F10 — Month Start Checklist

**Description**
A lightweight monthly ritual. Surfaces on the 1st of each month (or when user opens the app for the first time that month).

**Checklist Items**
- [ ] Salary received this month?
- [ ] EF transfer done? (confirm or scan receipt)
- [ ] SIP transfer done?
- [ ] Shares transfer done?
- [ ] MacBook / goal Pay upfront transfer done?
- [ ] MacBook / goal EMI reserve transfer done?
- [ ] Any last month transactions still uncategorized?

Each item is tappable — tapping opens the relevant screen or share intent.

Checklist can be dismissed and reopened from home screen anytime during the month.

---

### F11 — Reports

**Description**
Financial performance against the playbook, viewable monthly or annually.

**View Toggle**
- **Monthly view** — default, current month performance
- **Annual view** — full year trajectory, captures irregular expenses and one-off spends that monthly view misses

**Report Sections**
- **Spending Summary** — actual vs budget per spending bucket, bar chart
- **Savings Confirmation** — which investment transfers were confirmed this month
- **Month Health Score** — pass/fail on each playbook rule
- **Spending Trends** — month-over-month comparison (line/bar chart, last 6 months)
- **Category Breakdown** — donut chart of spending distribution
- **EF Trajectory** — line chart showing EF growth over time toward 1,50,000 then 3,00,000
- **MacBook Timeline** — bar chart showing cumulative BigExpense contributions

**Access**
- Reports tab in bottom navigation
- Defaults to current month, swipeable to past months

---

### F12 — Net Worth Tracker

**Description**
A simple, read-only snapshot of the user's total financial picture. Income builds lifestyle; net worth builds freedom. This section makes that number visible and watch it grow over time.

**Assets (manually entered or inferred)**
- Emergency Fund balance (onboarding start + contributions)
- Goal bucket totals (Pay upfront / EMI reserve contributions)
- Existing share portfolio (manually entered once, updatable)
- Any other assets user adds manually

**Liabilities**
- Any loans or debts user adds manually
- Defaults to zero if none entered

**Net Worth = Total Assets − Total Liabilities**

**Display**
- Single net worth number prominently shown
- Simple line chart showing net worth trend over time (month by month)
- Breakdown card: assets vs liabilities

**Rules**
- No automatic bank syncing — all values are manually entered or inferred from in-app contributions
- User can update any value at any time
- Net worth history is preserved even if values are updated

---

### F13 — Goal Projection & Investment Gap

**Description**
For each savings goal, the app shows a simple projection of when the goal will be reached at the current contribution rate, and what adjusting the contribution would do to that timeline.

**Per Goal Display**
- Current total contributed
- Monthly contribution
- Target amount
- Projected completion date at current rate
- Sensitivity nudge: "Adding NPR X/month would reach your goal Y months earlier"

**Example (MacBook Goal — upfront + EMI)**
```
MacBook Goal 🎯
Pay upfront:      NPR 80,000 target
EMI reserve:      NPR 12,000/month × 12 months
On track:         ✅ ~8 months away
```

**Rules**
- Projections are simple linear math — clearly labeled as estimates, not financial advice
- Available for all user-defined goals, not just MacBook

---

## 5. Screens & Navigation

### 5.1 Bottom Navigation (5 slots)
1. **Pulse Check (Home)** — Safe-to-spend, buckets, checklist
2. **Ledger (Transactions)** — Full list + Charts toggle
3. **[+]** — Center button (not a tab); opens Manual Entry / Scan Receipt bottom sheet
4. **The Vault (Goals)** — Goal cards and projections
5. **Settings** — Playbook, keywords, Scan Bubble, preferences

### 5.2 Screen List
| Screen | Access |
|---|---|
| Home / Dashboard | Tab 1 |
| Transactions List | Tab 2 |
| Transaction Detail | Tap transaction |
| Goals | Tab 4 |
| Goal Detail + Projection | Tap goal card |
| Insights / Reports | Transactions → Charts toggle |
| Net Worth Tracker | Home → net worth card |
| Settings / Playbook | Tab 5 |
| Onboarding (first launch) | Auto |
| Month Start Checklist | Day 1 / home card |
| Manual Entry + Scan Receipt (bottom sheet) | Center "+" nav button |
| Flagged Transaction Prompt | On app open when flags exist |
| Bucket Detail | Tap bucket row |

---

## 6. Technical Approach

### 6.1 Screenshot OCR Capture
- `expo-image-picker` — gallery access to select a screenshot
- `rn-mlkit-ocr` — Google ML Kit Text Recognition, on-device
- `lib/ocr-templates/` — per-app regex extensions (eSewa, Khalti, NMB, Global IME)
- Shared `parseOcrText` used by gallery OCR and bubble overlay
- App requires **EAS Build + expo-dev-client** — native modules not in Expo Go

### 6.1b Bubble Overlay (V2)
- Kotlin foreground service (`ScreenshotBubbleService`) + `BubbleOverlayView` + `ScreenCaptureHelper`
- Usage-stats whitelist — bubble hidden on non-target apps
- Headless JS OCR (`ScreenshotHeadlessTaskService` → `lib/overlay-headless.ts`) — same `processReceiptImage` as gallery OCR
- Config plugin: `plugins/withSpendSenseOverlay.js` copies `native/android/screenshotbubble/` on prebuild
- Full spec: [overlay-v2.md](./overlay-v2.md)

### 6.2 Data Storage
- All data stored **on-device only** — no server, no cloud sync (V1)
- expo-sqlite + Drizzle ORM for transactions, buckets, goals
- No user account required

### 6.3 Privacy
- Transaction data never leaves the device (V1)
- OCR runs fully on-device via ML Kit; no data sent to Google
- Optional fallback to own server for OCR — user opt-in, no third-party cloud
- No analytics or tracking (V1)

### 6.4 Tech Stack
- Language: TypeScript (lenient — no strict mode)
- Framework: React Native + Expo SDK 54 (managed workflow, EAS Build)
- Navigation: Expo Router v4 (file-based)
- UI: NativeWind v4 (Tailwind CSS for React Native)
- State: Zustand
- Database: expo-sqlite + Drizzle ORM
- OCR: rn-mlkit-ocr (on-device, Google ML Kit)
- Charts: react-native-gifted-charts
- Image pick: expo-image-picker
- Typeface: Inter (expo-google-fonts)

### 6.5 Permissions Required
- Gallery read access (`expo-image-picker`) — prompted on first "Scan Receipt" use
- `SYSTEM_ALERT_WINDOW` + `MediaProjection` — bubble overlay (Settings → Scan Bubble, dev client only)

---

## 7. Out of Scope (V1) → Future Versions

| Feature | Version |
|---|---|
| Share intent / share-sheet capture | V2+ |
| SMS / email thread reading | V2+ |
| Dark mode | V2 |
| "Ask the Plan" conversational feature | V2 |
| SIP / share portfolio tracking (NAV, returns) | V2 |
| iOS version | V3 |
| Cloud backup / sync | V3 |
| Multi-currency | V3 |

Bubble overlay is **shipped in codebase**; requires dev client build + on-device testing.

---

## 8. Decisions Log

| # | Decision | Choice |
|---|---|---|
| 1 | Platform/framework | React Native + Expo (managed, EAS Build) — not native Kotlin/Jetpack Compose |
| 2 | V1 capture method | Screenshot gallery pick + on-device OCR (bubble overlay and share intent deferred to V2) |
| 3 | OCR library | `rn-mlkit-ocr` (Google ML Kit, on-device); own server as fallback |
| 4 | Theme | Light only (V1); dark mode in V2 |
| 5 | Navigation | 5-slot bottom nav: Home \| Transactions \| [+] \| Goals \| Settings |
| 6 | State | Zustand |
| 7 | Database | expo-sqlite + Drizzle ORM |
| 8 | Charts | react-native-gifted-charts |
| 9 | EF balance tracking | Manual entry on setup; inferred from confirmed contributions thereafter |
| 10 | Data export | CSV only (V1); PDF report in V2 |

---

## 10. Design Language

### 10.1 Theme
- Light only (no dark mode in V1)
- Background: `#F7F8FA` (page), `#FFFFFF` (cards/surfaces)
- Accent: Green `#16A34A` (primary), `#DCFCE7` (light fills)
- Semantic: Amber for warnings, Red for over-budget/errors
- No gradients, no drop shadows, no colored screen backgrounds

### 10.2 Typography
- Typeface: Inter
- Numbers use tabular figures (`font-variant-numeric: tabular-nums`) — amounts always align
- NPR amounts always formatted with commas: `1,50,000`
- Display/amount sizes large and prominent — data is the hero

### 10.3 Principles
- Clean and clinical — like a well-designed banking app
- No decoration for decoration's sake — every element earns its place
- No animations except chart first-render — no looping, no confetti, no gamification
- Max one notification per day, quiet hours 10pm–8am
- Microcopy: direct and specific ("Fun is at 82%"), never preachy

### 10.4 Navigation
- Bottom tab bar: Home | Transactions | [+] | Goals | Settings (5 slots)
- Center [+] is a green circular button raised above the nav bar — opens Manual Entry / Scan Receipt bottom sheet. It is not a tab and does not navigate.
- Standard Android slide transitions — no custom animations
- Bottom sheets slide up with 20px top radius and dim overlay

### 10.5 Full Design Reference
See `SpendSense — Design Language` document for complete color system, spacing tokens, component specs, and iconography guidelines.

- Screenshot OCR → pre-filled entry form completes in under 3 seconds
- At least 90% of transactions auto-categorized without user intervention
- Month Start checklist used at least 3 months in a row
- User can answer "how am I doing this month?" from the home screen alone, without opening Reports