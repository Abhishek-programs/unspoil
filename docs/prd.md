# SpendSense — Product Requirements Document
**Version:** 1.1
**Platform:** Android (first)
**Status:** Active development
**Last Updated:** 2026-04-06

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
- **Bubble overlay (V2)** and **share intent capture (V2)** — deferred to V2

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
- Floating bubble overlay (SYSTEM_ALERT_WINDOW) — V2
- Share intent / share-sheet capture — V2
- SMS or email thread reading — V2
- Dark mode — V2
- SIP/share portfolio tracking (NAV, returns, holdings) — V2
- "Ask the Plan" conversational feature — V2
- Bank account syncing or open banking
- Multi-user or shared budgets
- iOS support — V3
- Cloud backup / sync — V3

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
- **Spending buckets** — Core Living, Dates, Fun (have monthly limits)
- **Savings/investment buckets** — EF, SIPs, Shares, BigExpense (have monthly contribution targets)

### 3.3 Transaction
A single financial event. Has:
- Amount
- Date & time
- Merchant / recipient
- Source app (eSewa, Khalti, etc.)
- Bucket assignment
- Remarks / notes (optional)
- Entry type: Auto (shared) / Manual

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
- Extracted fields: amount, merchant/recipient, date, transaction ID
- Receipt validation: OCR output checked for receipt keywords ("NPR", "amount", "transaction", "success") — if not found, user is notified "this doesn't look like a receipt" and dropped into manual entry
- Fallback: if on-device OCR fails or confidence is low, user may optionally send to own server for higher-accuracy OCR (requires internet, opt-in)

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

### F2 — Floating Bubble Capture *(V2 — deferred from V1)*

**Description**
A floating overlay bubble on whitelisted apps. User taps it on any receipt screen; SpendSense captures a screenshot via `MediaProjection`, runs on-device OCR, and saves — entirely in the background. User never leaves their payment app.

**Permissions Required (V2)**
- `SYSTEM_ALERT_WINDOW` (Draw over other apps)
- `MediaProjection` (Screen capture)
- Both opt-in, explained during V2 onboarding

**Deferred because:** Requires `SYSTEM_ALERT_WINDOW` + `MediaProjection` permissions and a foreground service — significantly more complex than screenshot upload. V1 uses gallery picker instead.

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

### F6 — Bucket Dashboard (Home Screen)

**Description**
The primary screen. Shows the full financial picture for the current month at a glance.

**Layout**

**Header**
- Current month and year
- Days remaining in month

**Lifestyle Section** (spending buckets)
- Each bucket shown as a row: name, amount spent, monthly limit, progress bar
- Color coding: green (under 70%), amber (70–90%), red (90%+)
- Tapping any bucket opens filtered transaction list for that bucket

**Savings Section** (savings/investment buckets)
- Each bucket shown as a row: name, contribution sent this month (yes/no), target amount
- Confirmed via receipt scan or manual confirmation
- Tapping opens detail

**Uncategorized Badge**
- If any transactions are uncategorized, a visible badge/card appears at the top prompting review

**Month Health Indicator**
- Simple pass/fail summary at the bottom of the home screen:
  - Lifestyle within budget? ✅ / ⚠️
  - All investment transfers confirmed? ✅ / ⚠️
  - EF growing on schedule? ✅ / ⚠️

---

### F7 — Goal Trackers

**Description**
Two persistent goal cards always visible — one for EF, one for MacBook (or any user-defined goal).

**Emergency Fund Card**
- Current EF balance (manually updated or inferred from contributions)
- Progress bar: 0 → 1,50,000 (Stage 1) then 1,50,000 → 3,00,000 (Stage 2)
- Stage 1 and Stage 2 clearly labeled
- Projected date to hit Min EF at current contribution rate
- Alert if contribution not confirmed this month

**MacBook / Big Expense Goal Card**
- Total contributed to date (equity + debt combined)
- Monthly contribution (24,000)
- Projected months remaining
- Equity vs debt split shown

**General Goal Structure**
- Goals are editable — target amount, name, monthly contribution
- New goals can be added (e.g. car down payment, trip)
- Each goal linked to one or two buckets

---

### F8 — Playbook Setup & Settings

**Description**
One-time setup during onboarding, fully editable at any time.

**Onboarding Flow**
1. Welcome + explanation of how the app works
2. Set monthly income
3. Review pre-loaded bucket defaults (user's playbook values pre-filled)
4. Edit any bucket amount, name, or limit
5. Add/remove buckets
6. Set keyword list for auto-categorization
7. Review floors (Min EF, etc.)
8. Done — home screen shown

**Settings (always accessible)**
- Edit any bucket
- Edit income
- Edit floors
- Edit keyword list
- Manage supported apps / parsing templates
- Manage recurring manual entries
- Data export (CSV)

**Default Values (pre-loaded)**

| Bucket | Type | Default (NPR) |
|---|---|---|
| Core Living | Spending | 50,000 |
| Dates | Spending | 10,000 |
| Fun | Spending | 5,000 |
| Emergency Fund | Savings | 15,000/month |
| SIPs | Investment | 6,000/month |
| Direct Shares | Investment | 15,000/month |
| BigExpense Equity | Savings | 14,000/month |
| BigExpense Debt | Savings | 10,000/month |

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
- [ ] BigExpense Equity transfer done?
- [ ] BigExpense Debt transfer done?
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
- Emergency Fund balance (inferred from contributions + manual setup value)
- BigExpense Equity + Debt bucket totals (inferred from contributions)
- Existing share portfolio (manually entered once, updatable)
- Any other assets user adds manually (e.g. savings account balance)

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

**Example (MacBook Goal)**
```
MacBook Goal 🎯
Contributed:      NPR 96,000
Monthly:          NPR 24,000
Target:           NPR 3,40,000
On track:         ✅ ~10 months away
Increase by 2,000/month → saves 1 month
```

**Rules**
- Projections are simple linear math — no interest or return assumptions for debt portion, conservative flat estimate for equity portion
- Clearly labeled as estimates, not financial advice
- Available for all user-defined goals, not just MacBook

---

## 5. Screens & Navigation

### 5.1 Bottom Navigation (5 slots)
1. **Home** — Bucket Dashboard
2. **Transactions** — Full list, filterable
3. **[+]** — Center button (not a tab); opens Manual Entry / Scan Receipt bottom sheet
4. **Goals** — Goal cards and projections
5. **Settings** — Playbook, keywords, preferences

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
- `rn-mlkit-ocr` — Google ML Kit Text Recognition, on-device, no internet required
- Receipt validation: check OCR output for keywords ("NPR", "amount", "transaction", "success") before processing
- Fallback: if on-device OCR fails, optionally POST image to own server for higher-accuracy OCR
- Regex templates applied to extracted text to parse: amount, merchant, date, transaction ID
- App requires **EAS Build + expo-dev-client** (managed workflow, no ejection) — `rn-mlkit-ocr` is a native module not included in Expo Go

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
- `SYSTEM_ALERT_WINDOW` and `MediaProjection` — **V2 only** (bubble overlay, not in V1)

---

## 7. Out of Scope (V1) → Future Versions

| Feature | Version |
|---|---|
| Floating bubble overlay (SYSTEM_ALERT_WINDOW) | V2 |
| Share intent / share-sheet capture | V2 |
| SMS / email thread reading | V2 |
| Dark mode | V2 |
| "Ask the Plan" conversational feature | V2 |
| SIP / share portfolio tracking (NAV, returns) | V2 |
| iOS version | V3 |
| Cloud backup / sync | V3 |
| Multi-currency | V3 |

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