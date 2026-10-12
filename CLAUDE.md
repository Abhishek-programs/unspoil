# SpendSense — CLAUDE.md

Personal finance Android app. React Native + Expo. NPR-denominated, Nepal-focused. No backend, no auth, no cloud sync.

> **PRD is stale in places.** Where PRD and `screen-flows.md` conflict, **screen-flows.md wins**. Where both conflict with this file, **this file wins.**

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Expo SDK 54, managed workflow (EAS Build + expo-dev-client — not pure Expo Go) |
| Language | TypeScript (lenient — no strict mode) |
| Navigation | Expo Router v4 (file-based) |
| Styling | NativeWind v4 (Tailwind for RN) |
| State | Zustand |
| Database | expo-sqlite + Drizzle ORM |
| Charts | react-native-gifted-charts |
| Image pick | expo-image-picker (screenshot OCR flow) |
| OCR | rn-mlkit-ocr (Google ML Kit, fully on-device) |
| Fonts | expo-google-fonts (Inter) |

No tests in V1. No testing libraries. No error boundaries beyond what screen specs require.

---

## Folder Structure

```
app/
  _layout.tsx              # Root layout: font load, DB init, Zustand hydration
  onboarding/              # First-launch 2-step flow
    _layout.tsx            # Stack for onboarding
    index.tsx              # Step 1: Name
    money.tsx              # Step 2: Income & Start Day
  (tabs)/
    _layout.tsx            # Tab bar with center Add button
    index.tsx              # Home / Dashboard
    transactions.tsx       # Transactions list + Charts toggle
    goals.tsx              # Goals tab (standalone)
    settings.tsx           # Settings / Playbook

components/
  ui/                      # Primitives: Button, Card, Sheet, Chip, ProgressBar
  home/                    # NetWorthCard, BucketRow, SavingsRow, MonthHealthCard
  transactions/            # TransactionRow, TransactionDetailSheet, ChartsView
  goals/                   # GoalCard, GoalDetailSheet, ProjectionNudge
  manual-entry/            # ManualEntrySheet (triggered from center nav button)
  flagged/                 # FlaggedTransactionPrompt

db/
  schema.ts                # Drizzle schema — single source of truth for data shape
  client.ts                # expo-sqlite + drizzle client init
  migrations/              # Drizzle-generated migration files

store/
  playbook.ts              # Zustand: income, month start day, floors, fallback bucket
  buckets.ts               # Zustand: bucket list, keyword mappings, sure-shot merchants
  transactions.ts          # Zustand: this-month transactions, flagged list
  goals.ts                 # Zustand: goal definitions, contributions

lib/
  format.ts                # formatNPR, formatNPRShort, formatDate, formatMonth
  categorize.ts            # 3-step auto-categorization logic
  ocr.ts                   # Screenshot → extracted text → parsed fields
  projection.ts            # Linear goal projection math

constants/
  colors.ts                # Design tokens (see below)
  defaults.ts              # Default bucket values, keyword map, onboarding defaults
```

---

## Navigation

**Bottom tab bar — 5 slots:**

```
Home  |  Transactions  |  [+]  |  Goals  |  Settings
```

- `[+]` center button: green circle, raised above nav bar. Opens `ManualEntrySheet`. It is **not** a tab — it does not navigate anywhere.
- Nav bar: translucent white, floats above content, active tab = `#16A34A`, inactive = `#9CA3AF`.
- Transaction detail, Goal detail: bottom sheets opened within their tab. No separate routes.

---

## Design Tokens (`constants/colors.ts`)

```ts
export const colors = {
  pageBg:       '#F7F8FA',
  surface:      '#FFFFFF',
  border:       '#E2E8F0',
  divider:      '#F0F2F5',
  green:        '#16A34A',
  greenFill:    '#DCFCE7',
  amber:        '#F59E0B',
  amberFill:    '#FEF3C7',
  red:          '#DC2626',
  textPrimary:  '#1A1C1E',
  textSecond:   '#6B7280',
  textMuted:    '#9CA3AF',
}
```

- Typeface: Inter. All NPR amounts: `fontVariant: ['tabular-nums']`.
- Light theme only in V1. No dark mode.
- Standardized Header: `paddingTop: 64`, `fontSize: 22`, `Inter_700Bold`.
- Continuous Curves: Use `borderCurve: 'continuous'` (iOS-style smooth corners).
- No drop shadows, no gradients (except HeroRing).

---

## Business Rules

### Auto-categorization (3-step, priority order)

1. **Remarks suffix** — remark ends with `keyword -` (e.g. "lunch core -"). Map keyword → bucket. Case-insensitive. Always wins.
2. **Sure-shot merchant list** — unambiguous merchants (NTC, Ncell → Core Living). User adds more in Settings.
3. **Fallback** — save to fallback bucket (default: Core Living), set `is_flagged = true`. Next app open: `FlaggedTransactionPrompt` surfaces one at a time.

Merchant is **never** auto-memorized for ambiguous cases. Only sure-shot merchants (set explicitly in Settings) are remembered.

### Bucket Types

| Type | Behavior | Color logic |
|---|---|---|
| `spending` | Monthly limit. Progress bar. | Green < 80%, Amber 80–99%, Red ≥ 100% |
| `savings` | Monthly contribution target. Confirmed / not. | Check circle: green if confirmed |
| `investment` | Same as savings | Same |

### Month Boundaries

Month start day is user-set (default: 1). All "this month" queries use this. Stored in playbook store. A "month" = from month_start_day of current calendar month to day before next month_start_day.

### Recurring Entries

Monthly only in V1. Auto-create draft on month_start_day. Draft shown on Home as pending item. Must be confirmed within 3 days or nudge fires. Drafts do NOT count toward totals until confirmed.

### Floors

Stored in playbook. Warn when EF balance approaches floor. Never block.

### Nudges (notifications)

Max 1 per day. Quiet hours 10pm–8am. All types individually toggleable. Trigger table is in `screen-flows.md`.

---

## Default Playbook (`constants/defaults.ts`)

| Bucket | Type | NPR/month |
|---|---|---|
| Core Living | spending | 50,000 |
| Dates | spending | 10,000 |
| Fun | spending | 5,000 |
| Emergency Fund | savings | 15,000 |
| SIPs | investment | 6,000 |
| Direct Shares | investment | 15,000 |
| BigExpense Equity | savings | 14,000 |
| BigExpense Debt | savings | 10,000 |

Default income: NPR 1,25,000. EF floor: NPR 1,50,000. Default fallback bucket: Core Living.

---

## Database Schema (Drizzle)

**`playbook`** (single row)
`monthly_income`, `month_start_day`, `fallback_bucket_id`, `ef_floor`, `is_onboarded`

**`buckets`**
`id`, `name`, `type` (spending|savings|investment), `monthly_amount`, `color`, `icon`, `sort_order`, `is_active`

**`keyword_mappings`**
`id`, `keyword`, `bucket_id`

**`sure_shot_merchants`**
`id`, `merchant_name`, `bucket_id`

**`transactions`**
`id`, `amount`, `merchant`, `bucket_id`, `date`, `source` (manual|ocr), `remarks`, `parsed_txn_id`, `is_flagged`, `is_recurring_draft`, `created_at`

**`goals`**
`id`, `name`, `target_amount`, `monthly_contribution`, `target_date`, `linked_bucket_ids` (JSON array), `start_balance`, `created_at`

**`net_worth_snapshots`**
`id`, `snapshot_date`, `total_assets`, `total_liabilities`, `note`

No foreign key enforcement needed (personal app, no concurrent writes, no transactions needed).

---

## Key Utilities

### `lib/format.ts`
```ts
// 150000 → "1,50,000"  (lakh-aware, always with NPR prefix in UI)
export function formatNPR(amount: number): string

// 150000 → "1.5L"  (for tight spaces like pills/badges)
export function formatNPRShort(amount: number): string

export function formatDate(date: string | Date): string   // "15 Apr"
export function formatMonth(date: string | Date): string  // "April 2026"
```

### `lib/categorize.ts`
```ts
export function categorize(opts: {
  remarks: string | null
  merchant: string | null
  keywords: { keyword: string; bucketId: string }[]
  sureShotMerchants: { merchantName: string; bucketId: string }[]
  fallbackBucketId: string
}): { bucketId: string; isFlagged: boolean }
```

### `lib/projection.ts`
```ts
// Linear math only. No interest/return assumptions.
export function projectGoalCompletion(opts: {
  contributed: number
  target: number
  monthlyContribution: number
}): { monthsRemaining: number; projectedDate: Date }
```

---

## V1 Scope

**In:**
- Manual entry (ManualEntrySheet via center `[+]` button)
- Screenshot → OCR → pre-fill entry form
- Auto-categorization (3-step)
- Home dashboard (buckets, savings, month health, net worth card)
- Transactions list + detail sheet + Charts view
- Goals tab + goal detail + projections
- Insights screen (monthly; annual is stretch goal)
- Settings / Playbook (buckets, keywords, goals, notifications)
- Onboarding (2 steps)
- Month Start checklist
- Passive nudge notifications
- CSV export

**Out of V1:**
- Bubble overlay / SYSTEM_ALERT_WINDOW → V2
- Share intent capture → V2
- SMS/email reading → V2
- Dark mode → V2
- "Ask the Plan" AI → V2
- SIP portfolio tracking (NAV, returns) → V2
- iOS → V3
- Cloud sync / backup → V3

---

## OCR (V1 Implementation)

**Library:** `rn-mlkit-ocr` — Google ML Kit Text Recognition, fully on-device, no internet required.

**Note on Expo Go:** `rn-mlkit-ocr` is a native module with an Expo config plugin. It does not run in pure Expo Go — requires **EAS Build + expo-dev-client**. Managed workflow is preserved (no ejection needed).

**`app.json` plugin config:**
```json
["rn-mlkit-ocr", { "ocrModels": ["latin"], "ocrUseBundled": true }]
```

**V1 flow:**
1. User taps "+" → opens bottom sheet, "Scan Receipt" tab is default
2. `expo-image-picker` opens gallery — user selects receipt screenshot
3. `rn-mlkit-ocr` runs on-device (target: < 2 seconds)
4. OCR output validated for receipt keywords ("NPR", "amount", "transaction", "success")
5. Regex applied to extracted text to parse: amount, merchant, date, transaction ID
6. Parsed fields pre-fill the entry form — user reviews, adjusts bucket, saves
7. If OCR fails or validation fails → toast + switch to manual mode

**Fallback priority (for poor screenshots):**
1. On-device `rn-mlkit-ocr` — always tried first (offline)
2. Own server — higher accuracy, internet required, opt-in (temporary bridge)
3. Manual entry — always available

---

## Working Style

- Implement directly. Explain architectural decisions inline — no approval-seeking on code choices.
- Only raise blockers that affect product behavior or scope.
- Suggest commits at feature-complete milestones. Never execute git commands without explicit confirmation.
- Don't add docstrings, tests, or comments to self-evident code.
- Only comment non-obvious business logic (e.g. the categorization priority order).
- Don't refactor adjacent code unless it directly blocks the task.
- Don't add features, fallbacks, or validation beyond what the screen spec requires.
