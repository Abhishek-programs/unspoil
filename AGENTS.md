# SpendSense

Personal finance app for Android. React Native + Expo. NPR, Nepal-focused. **No backend, no auth, no cloud sync in V1.**

## Doc map (read in this order)

| Priority | File | Use for |
|---|---|---|
| 1 | **This file** | Stack, rules, repo map, agent workflow |
| 2 | `docs/core-function.md` | Mental model, money flows, month logic |
| 3 | `docs/design-and-features.md` | Finalized UI, screens, formulas |
| 4 | `docs/screen-flows.md` | Screen behavior and UX specs (historical where stale) |
| 5 | `BUILD_ORDER.md` | What's done vs next |
| 6 | `docs/prd.md` | Product intent (historical where stale) |

If docs conflict: **AGENTS.md → core-function / design-and-features → screen-flows → BUILD_ORDER → prd**.

---

## Quick start

```bash
npm install
cp .env.example .env   # optional — app runs without it today
npx expo start
```

Copy `.env.example` → `.env`. See `.env.example` for EAS vars when needed.

**Recommended:** a development build (`npx expo run:android`) so local notifications work fully. Expo Go works for basic UI but warns on `expo-notifications`.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Expo SDK 54, managed workflow |
| Language | TypeScript (not strict) |
| Navigation | Expo Router (file-based) |
| Styling | NativeWind v4 + Tailwind v3 |
| State | Zustand (`store/`) |
| Database | expo-sqlite + Drizzle (`db/`) |
| Charts | react-native-gifted-charts |
| Fonts | Inter via `@expo-google-fonts/inter` |

No tests in V1. No drive-by refactors.

---

## Repo map

```
app/
  _layout.tsx           DB init, font load, store hydration, nudges
  onboarding/           6-step first-launch wizard
  (tabs)/               Home, Transactions, Goals, Settings + center [+]
  lending/              Person list + per-contact ledger

components/
  ui/                   Card, Chip, ProgressBar
  home/                 HeroRing, LivingSection, FutureSection, NetWorthCard, LentBorrowRow, …
  transactions/         TransactionRow, ChartsView, LendingRow, detail sheet
  goals/                GoalCard, AddGoalSheet, GoalDetailSheet
  lending/              LendBorrowForm, PersonPicker, SettleUpSheet
  manual-entry/         ManualEntrySheet (center [+] button)
  flagged/              FlaggedTransactionPrompt

store/                  Zustand — playbook, buckets, transactions, goals, lending
db/                     schema.ts, client.ts, migrations/, seed.ts
lib/                    format, categorize, projection, goals/, payment-watch
native/android/         Kotlin copied in by Expo config plugins on prebuild
plugins/                withPaymentWatch.js
constants/              colors.ts, defaults.ts
components/onboarding/  OnboardingBack (subtle chevron)
hooks/                  usePulseData.ts
docs/                   screen-flows, prd, mockup (historical where stale)
.claude/skills/         Agent skills (see below)
```

Entry point: `expo-router/entry` (`package.json` `"main"`).

---

## Navigation

```
Home  |  Transactions  |  [+]  |  Goals  |  Settings
```

- `[+]` opens `ManualEntrySheet` — **not a tab**, no route change. Manual entry only (expense / income / lend-borrow).
- Transaction/goal details: bottom sheets inside their tab.
- Design tokens: `constants/colors.ts`. Light theme only. Inter. NPR amounts use tabular nums.

---

## Business rules (do not break)

**Auto-categorization** (`lib/categorize.ts`) — strict priority:

1. Keyword appears in description, remarks, or merchant text → mapped bucket
2. Sure-shot merchant list (Settings)  
3. Fallback bucket + `is_flagged = true`

Never auto-memorize ambiguous merchants.

**Month boundaries:** user `month_start_day` from playbook — not calendar month (`lib/month.ts`).

**Safe to spend:** unlocks only after salary is confirmed this month (`__salary__` income txn). Ring and safe-to-spend exclude carried-forward balance (`hooks/usePulseData.ts`).

**EF target:** `EF_MULTIPLIER` × Core Living monthly amount (`constants/defaults.ts`, onboarding Foundations).

**Onboarding order:** Foundations → Bucket Builder (includes **Saving towards goal** pool) → Goals (split that pool) → Balances.

**Spending buckets:** green &lt;80%, amber 80–99%, red ≥100%.

**Nudges:** max 1/day, quiet 10pm–8am (`lib/notifications.ts`).

**Payment helper:** Optional. Usage access + amount notification while eSewa / nBank is in the foreground; after Log, a second notification with spending-bucket chips for that txn. No screenshot, overlay, or Accessibility. See `docs/superpowers/specs/2026-08-19-payment-watch-notification-design.md`.

**Funded-from savings:** When logging a contribution to a savings/investment bucket, optional `fundedFromBucketId` uses that Living/Personal ceiling or fund; destination still gets `__savings_confirm__`. See `docs/superpowers/specs/2026-07-26-living-ceilings-funded-from-design.md`.

---

## V1 scope (short)

**In:** manual entry, auto-categorize, home dashboard (Your money + Hero ring + Living/Future), lent & borrowed, transactions + charts, goals/Vault, settings/playbook, 6-step onboarding, month checklist, nudges, CSV export, optional eSewa/nBank payment-helper notification (dev client).

**Out:** OCR / receipt scan, share intent, bubble overlay, SMS/email, dark mode, AI chat, iOS, cloud sync.

---

## Agent workflow (Cursor / Claude)

### Skills

Vendor Expo skills install to `.agents/skills/` (gitignored). Restore after clone:

```bash
npx skills experimental_install
```

Pinned list: `skills-lock.json`. `.claude/skills/` has thin pointers to `.agents/skills/` plus the committed **`spendsense`** project skill.

Cursor and Claude both discover skills under `.claude/skills/` and `.agents/skills/`.

| Task | Skill |
|---|---|
| Project rules | `spendsense` |
| UI / Router / animations | `building-native-ui` |
| NativeWind / Tailwind | `expo-tailwind-setup` |
| Dev client builds | `expo-dev-client` |
| EAS / Play Store | `expo-deployment` |
| SDK upgrades | `upgrading-expo` |

### Coding style

- Implement directly. Match existing patterns in neighboring files.
- No docstrings/tests/comments on obvious code.
- Comment only non-obvious business logic (e.g. categorization priority).
- Don't add scope beyond the screen spec or BUILD_ORDER step.
- Suggest git commits at milestones — **never run git commands without explicit ask**.

---

## Key files

| Need | File |
|---|---|
| Schema | `db/schema.ts` |
| Default buckets / income | `constants/defaults.ts` |
| NPR formatting | `lib/format.ts` |
| Categorization | `lib/categorize.ts` |
| Goal math | `lib/projection.ts` |
| Colors | `constants/colors.ts` |
| What's next | `BUILD_ORDER.md` |
