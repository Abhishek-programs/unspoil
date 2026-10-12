# SpendSense — Screens & Flows
**Version:** 1.1
**Platform:** Android (React Native + Expo)
**Last Updated:** 2026-04-06

---

## Design Principles

- Light theme only. Background `#F7F8FA`, cards `#FFFFFF`, accent green `#16A34A`
- Clean and clinical — like a well-designed banking app. No decoration for decoration's sake
- Numbers are the hero — large, prominent, tabular figures, NPR with commas (`1,50,000`)
- Inform, never block. No hard stops, no modals that interrupt flow
- Every screen must answer its core question in under 10 seconds
- V1 capture method: screenshot gallery pick → on-device OCR → pre-fill entry form. Bubble and share intent are V2.
- Remarks prefix is the primary categorization signal — UI should reinforce this habit
- Center [+] nav button opens Manual Entry / Scan Receipt bottom sheet. It is not a tab.
- No animations except chart first-render. No gamification, no confetti
- See `SpendSense — Design Language` for full color system, typography, spacing, and component specs

---

## Navigation Structure

Bottom tab bar — 4 tabs + raised FAB in center:

```
Home | Transactions | [FAB] | Goals | Settings
```

FAB is a green circular button raised above the nav bar, visible on all main screens. Tapping opens the Manual Entry bottom sheet without navigating away.

Nav bar uses glassmorphism — white/translucent background, blurred, floated above content with rounded pill shape or rounded top corners. Active tab uses green accent. Inactive tabs use tertiary muted color.

---

## Screen Index

1. Home
2. Transactions List
3. Transaction Detail (bottom sheet)
4. Manual Entry + Scan Receipt (bottom sheet — opened via center [+] nav button)
5. Insights — Monthly / Annual
6. Goal Detail
7. Settings / Playbook
8. Onboarding (flow, 7 steps)
9. Flagged Transaction Prompt (on next open)
10. Bubble Capture *(V2 — not in V1)*
11. Share Receive *(V2 — not in V1)*

---

## 1. Home Screen

**Core question this screen answers:** How am I doing this month?

**Scrollable sections (top to bottom):**

### Header
- Greeting: "Good morning, Abhishek"
- Current month label

### Flagged Transaction Banner (conditional)
- Shown only if flagged transactions exist from fallback categorization
- Amber color: "2 transactions need your confirmation"
- Tapping opens the Flagged Transaction Prompt (Screen 11)
- Disappears when all flags are cleared

### Net Worth Card
- Label: "Net worth"
- Large number: total net worth (NPR)
- Sub-label: "+X,XXX this month" in green
- Three mini pills below: Assets | Liabilities | Savings rate
- Tap to expand → shows asset breakdown (EF, BigExpense, Shares portfolio)

### Lifestyle Section
- Section header: "Lifestyle · [Month]" + "See all" link
- Three bucket rows: Core Living, Dates, Fun
- Each row:
  - Icon + bucket name
  - Amount spent (sub-label)
  - Amount spent / limit (right side)
  - Thin progress bar below
  - Bar color: green (0–79%) → amber (80–99%) → red (100%+)
- Tapping a bucket row → filters Transactions screen to that bucket

### Savings Section
- Section header: "Savings · [Month]" + "Checklist" link (V2)
- Four rows: Emergency Fund, MacBook Goal, SIPs, Direct Shares
- Each row:
  - Circular checkbox (empty or green checkmark)
  - Bucket name + sub-label (progress or status)
  - Contribution amount (right side, green if confirmed)
- Checkbox is tapped to manually confirm a transfer
- Or user shares receipt → notification confirms it → checkbox auto-checks

### Month Health Card
- Section header: "Month health"
- Four rows, each with a label and a badge pill:
  - Lifestyle within budget → green "On track" / amber "X% used" / red "Over"
  - Investment transfers → green "All confirmed" / amber "X pending"
  - EF growing on schedule → green "On track" / amber "Behind"
  - Any bucket breached → green "None" / red "Fun exceeded"

---

## 2. Transactions Screen

**Core question:** What have I spent and where?

### Top Bar
- Screen title left, search icon and filter icon right

### Logs / Charts Toggle
- Dynamic pill toggle centered below the top bar
- Active pill is wider, heavier, more prominent
- Inactive pill is smaller and muted
- Logs is the default active view

### Logs View

**Below toggle:**
- Search bar, full width, search icon inside left
- Filter chips row, horizontally scrollable: All (active = green), Core Living, Dates, Fun, Savings
- Summary row: Income (green) | Expenses (red) | Total — small uppercase labels above each value

**Transaction list grouped by date:**
- Date group header: date number large left, day name and full date below, daily total right (red for net spend, green for income days)
- Each transaction row: square icon with tinted background, merchant name bold, bucket tag pill + source badge (eSewa / Khalti / Bubble / Manual) below name, amount right in red for debits, time below amount
- Flagged rows: amber "Needs Review" badge instead of bucket pill
- Tap any row → Transaction Detail bottom sheet

### Charts View
- Month selector: left chevron, month/year centered, right chevron
- Spending Summary card: progress bars per bucket, green/amber/red
- Savings and Investments confirmation grid
- 6-Month Trend bar chart, current month highlighted, category list below
- Goal Projections: EF progress bar + projected date, MacBook progress bar + projected date
- Suggestion nudge card at bottom

---

## 3. Transaction Detail (Bottom Sheet)

**Triggered by:** Tapping any transaction row

**Contents:**
- Merchant name (large, top)
- Amount (large)
- Date and time
- Source (Bubble / Share — eSewa / Manual)
- Transaction ID (if parsed)
- Bucket (tappable dropdown to reassign)
- Remarks (editable text field)
- "Save changes" button (appears only if edits made)
- "Delete transaction" link (bottom, destructive)

**Bucket reassignment:**
- Tapping bucket field opens a picker with all buckets
- On save, merchant is NOT auto-memorized (ambiguous merchants)
- Only sure-shot merchants are memorized — those are set in Settings

---

## 4. Manual Entry + Scan Receipt (Bottom Sheet)

**Triggered by:** Center [+] button in the bottom nav bar — the raised green circular button. Not accessible from any other screen or button.

**Two entry modes (toggle at top of sheet):**

**Mode A — Scan Receipt (default)**
1. Sheet opens with "Scan Receipt" as the active mode
2. "Pick Screenshot" button — opens `expo-image-picker` (gallery)
3. User selects receipt screenshot
4. On-device OCR runs (rn-mlkit-ocr, < 2 seconds)
5. Parsed fields pre-fill the form below: Amount, Merchant, Date
6. If OCR fails or no receipt keywords found: toast "Couldn't read receipt — fill in manually" and switches to Mode B
7. User reviews pre-filled fields, adjusts bucket if needed, saves

**Mode B — Manual**
- Amount — large numeric input, centered, auto-focused
- Bucket — horizontal scrollable chip selector (required). If remarks prefix matches a keyword, bucket auto-selects
- Merchant / description — text input (optional)
- Remarks — persistent hint "e.g. Fun - coffee" to nudge prefix habit. Valid prefix overrides selected bucket.
- Date — defaults to today, tappable to change
- Recurring toggle — off by default; if on, shows monthly frequency label (monthly only in V1)

**Recurring Entry Behavior**
- Recurring entries auto-create as drafts on the user's month start day each month
- Draft appears on Home screen as a pending confirmation item
- User confirms or edits the draft before it counts toward totals
- If draft not confirmed within 3 days of month start → nudge notification fires

**Save behavior**
- Save button active only when Amount + Bucket filled
- On save: sheet closes, transaction saved, success toast fires
- Remarks prefix always takes priority over manually selected bucket if both are present

---

## 5. Insights Screen

**Core question:** Am I on track over time?

### Top Controls
- Monthly / Annual toggle
- Month selector (swipe left/right, or tap to pick)

### Monthly View Sections

**Spending Summary**
- Horizontal bar chart per lifestyle bucket
- Each bar: actual spend vs budget limit
- Color follows same green/amber/red logic as home screen

**Savings Confirmation**
- List of savings buckets with confirmed / not confirmed status this month

**Savings Rate**
- Single metric card: "X% saved this month" vs target 48%

**Spending Trends**
- Line or bar chart showing total lifestyle spend over last 6 months
- Tap any month bar to see that month's breakdown

**Category Breakdown**
- Donut chart: Core Living / Dates / Fun as % of total lifestyle spend

### Annual View Sections

**Year Overview**
- Month-by-month bar chart of total spending vs total budget (full year)
- Highlights months where budget was exceeded

**Annual Totals**
- Total spent vs total budgeted per bucket for the year
- Captures irregular and one-off expenses that monthly view misses

### Goal Projections (both views)

**EF Trajectory**
- Line chart showing EF balance growing month by month
- Two milestone markers: 1,50,000 (Min EF) and 3,00,000 (Full EF)
- Projected date to hit each milestone at current contribution rate

**MacBook / Goal Cards**
- One card per user-defined goal
- Cumulative contribution bar chart
- Projected completion date
- Sensitivity nudge: "Add NPR X/month → reach goal Y months sooner"
- If projected date exceeds target date: amber message
  "At current pace, MacBook is ready in 18 months — 6 months past your March 2027 target. Add NPR 4,000/month to stay on track."
- Never shows negative numbers

---

## 6. Goal Detail Screen

**Triggered by:** Tapping a goal card in Insights or Savings section on Home

**Contents:**
- Goal name + target amount (header)
- Large circular progress ring (contributed / target)
- Stats row: Contributed | Monthly | Target | Projected date
- Equity vs debt split bar (if goal has two buckets e.g. MacBook)
- Sensitivity nudge card (same logic as Insights)
- Recent contributions list (date + amount, last 6 entries)
- Edit goal button (opens inline edit for name, target, date, monthly amount)

---

## 7. Settings Screen

Grouped sections on `#F7F8FA` background. Each section has an uppercase tertiary label above it. Rows inside white cards separated by thin dividers. Each row: label left, value or chevron right.

### Playbook Section
- Monthly Income — current value, tappable to edit
- Month Start Day — current day, tappable to edit
- Active Buckets — summary of bucket names and amounts, chevron to expand and edit each

### Keyword Mapping Section
- Section header with "+" add button right
- Each row: keyword pill (monospace, green tinted) → arrow → bucket name, delete icon right
- These are the remarks prefixes used for auto-categorization

### Savings Goals Section
- Section header with "+" add button right
- Each goal shown as a mini card: name, target, progress bar, contribution amount
- Tap any goal to edit — only place goals are added or edited in the app

### Connected Services Section
- Whitelisted apps for bubble overlay
- Each row: app icon, name, active/idle status badge in green or muted

### Notifications Section
- Toggle rows: Budget Nudges, Transfer Reminders, Goal Milestones
- All on by default

### Data Management Section
- Export Data (CSV) with download icon
- Reset All Data in red — destructive, confirmation required

---

## 8. Onboarding Flow (7 Steps, First Launch Only)

**Step 1 — Welcome**
- App name + one line: "Your financial plan, tracked automatically"
- "Get started" button

**Step 2 — Set Income**
- Heading: "What's your monthly take-home pay?"
- Large monospace input with "NPR" label left, pre-filled 1,25,000
- Note below: "This helps us build your financial plan"
- App auto-generates suggested bucket breakdown on confirm
- Progress dots at top, step 2 active

**Step 3 — Review Lifestyle Buckets**
- Heading: "Your lifestyle budget"
- Auto-generated split shown as editable cards:
  - Core Living: 50,000 — with left border accent
  - Dates & Outing: 10,000
  - Fun: 5,000
- Bento grid for smaller categories
- Running total shown vs income
- Add bucket button below

**Step 4 — Review Savings Buckets**
- Auto-generated savings allocation shown as editable cards
- Same structure as Step 3

**Step 5 — Set Goals**
- Heading: "What are you saving for?"
- Goal rows with: Name, Target Amount (NPR), Target Date fields
- Auto-calculates required monthly contribution per goal, shown in a sidebar or below each row
- Add another goal button (dashed border)
- Savings analysis panel showing total monthly required
- Skippable

**Step 6 — Starting Balances**
- "How much is in your emergency fund today?" (default: 0)
- "What is your current share portfolio value?" (default: NPR 3,50,000)

**Step 7 — Remarks Prefixes**
- Heading: "Auto-categorize with prefixes"
- Example card showing: "Fun - coffee" → Fun bucket
- List of default mappings: CORE, FUN, DATE, EF — each as a round pill
- Add custom prefix link
- "Almost Done" button
- Skippable

**Confirmation Screen**
- "Your plan is live" heading
- Summary stats: monthly flow, savings rate, days to first goal
- "Go to Dashboard" button

---

## 9. Flagged Transaction Prompt

**Triggered by:** Opening app when flagged transactions exist from fallback categorization

**Not a full screen — appears as a focused card or bottom sheet on top of Home**

**Contents:**
- Transaction details: merchant, amount, date
- Current assigned bucket (fallback): shown in amber
- Question: "Does this look right?"
- Bucket reassignment chips (all buckets shown)
- Confirm button
- "Skip for now" link

**Flow:**
- If multiple flagged transactions: shows them one at a time
- Counter: "1 of 3 transactions"
- On confirm: flag cleared, transaction finalized, next shown
- On skip: remains flagged, shown again next app open
- Merchant is NOT memorized regardless of action

---

## Notification Reference

| Trigger | Message | Color |
|---|---|---|
| OCR success + category found | "NPR X · [Bucket] — [Merchant]" | Green |
| OCR success + no category | "NPR X saved — tap to categorize" | Amber |
| OCR fail / not a receipt | "Couldn't read receipt — fill in manually" | Red |
| Lifestyle bucket at 80% | "[Bucket] is at 80% — NPR X left" | Amber |
| Lifestyle bucket at 100% | "[Bucket] budget reached for [Month]" | Red |
| Investment unconfirmed near month end | "[Bucket] transfer not confirmed yet" | Amber |
| EF milestone hit | "EF hit X — [milestone message]" | Green |
| Flagged transactions waiting | "X transactions need your confirmation" | Amber |

Max 1 notification per day. Quiet hours 10pm–8am. All types individually toggleable.

---

## V2 Screens (Not in V1)

### 10. Bubble Capture *(V2)*

Floating overlay on whitelisted apps. Requires `SYSTEM_ALERT_WINDOW` + `MediaProjection` permissions. User taps bubble → screenshot captured via MediaProjection → on-device OCR → categorization → notification. User never leaves payment app. Deferred because of native permission complexity.

### 11. Share Receive *(V2)*

Background share target. User selects SpendSense from share sheet → app receives text → regex template parsing → categorization → notification. Requires OS share target registration and per-app templates (need real invoice samples). Deferred because V1 uses screenshot gallery pick instead.