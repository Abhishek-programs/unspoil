# SpendSense

Personal finance app for Android. React Native + Expo. NPR, Nepal-focused. **No backend, no auth, no cloud sync in V1.**

## Doc map (read in this order)

| Priority | File | Use for |
|---|---|---|
| 1 | **This file** | Stack, rules, repo map, agent workflow |
| 2 | `docs/screen-flows.md` | Screen behavior and UX specs |
| 3 | `BUILD_ORDER.md` | What's done vs next |
| 4 | `docs/prd.md` | Product intent (may be stale) |
| 5 | `docs/overlay-v2.md` | V2 bubble overlay — only when building overlay |

If docs conflict: **AGENTS.md → screen-flows → BUILD_ORDER → prd**.

---

## Quick start

```bash
npm install
cp .env.example .env   # optional — app runs without it today
npx expo start
```

Copy `.env.example` → `.env`. See `.env.example` for EAS/OCR vars when needed.

**Native modules (OCR, overlay):** need a dev client, not Expo Go. See `.claude/skills/expo-dev-client` after running `npx skills experimental_install`.

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
| OCR (target) | `rn-mlkit-ocr` on-device — `lib/ocr.ts` is still mocked |
| Fonts | Inter via `@expo-google-fonts/inter` |

No tests in V1. No drive-by refactors.

---

## Repo map

```
app/
  _layout.tsx           DB init, font load, store hydration, nudges
  onboarding/           5-step first-launch wizard
  (tabs)/               Home, Transactions, Goals, Settings + center [+]

components/
  ui/                   Card, Chip, ProgressBar
  home/                 HeroRing, LivingSection, FutureSection, NetWorthCard, …
  transactions/         TransactionRow, ChartsView, detail sheet
  goals/                GoalCard, AddGoalSheet, GoalDetailSheet
  manual-entry/         ManualEntrySheet (center [+] button)
  flagged/              FlaggedTransactionPrompt

store/                  Zustand — playbook, buckets, transactions, goals
db/                     schema.ts, client.ts, migrations/, seed.ts
lib/                    format, categorize, projection, ocr, notifications, month, chart-data
constants/              colors.ts (design tokens), defaults.ts (playbook defaults)
hooks/                  usePulseData.ts
docs/                   screen-flows, prd, overlay-v2 prompt, mockup
.claude/skills/         Agent skills (see below)
```

Entry point: `expo-router/entry` (`package.json` `"main"`).

---

## Navigation

```
Home  |  Transactions  |  [+]  |  Goals  |  Settings
```

- `[+]` opens `ManualEntrySheet` — **not a tab**, no route change.
- Transaction/goal details: bottom sheets inside their tab.
- Design tokens: `constants/colors.ts`. Light theme only. Inter. NPR amounts use tabular nums.

---

## Business rules (do not break)

**Auto-categorization** (`lib/categorize.ts`) — strict priority:

1. Remarks suffix `keyword -` → bucket (case-insensitive)
2. Sure-shot merchant list (Settings)
3. Fallback bucket + `is_flagged = true`

Never auto-memorize ambiguous merchants.

**Month boundaries:** user `month_start_day` from playbook — not calendar month (`lib/month.ts`).

**EF target:** `EF_MULTIPLIER` × Core Living bucket — never from income (`constants/defaults.ts`).

**Spending buckets:** green &lt;80%, amber 80–99%, red ≥100%.

**Nudges:** max 1/day, quiet 10pm–8am (`lib/notifications.ts`).

**V2 overlay:** additive only — do not change `lib/categorize.ts`, `store/`, or `db/schema.ts`. See `docs/overlay-v2.md`.

---

## V1 scope (short)

**In:** manual entry, screenshot OCR flow, auto-categorize, home dashboard, transactions + charts, goals, settings/playbook, 5-step onboarding, month checklist, nudges, CSV export.

**Out:** bubble overlay, share intent, SMS/email, dark mode, AI chat, iOS, cloud sync.

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
| Native modules (overlay) | `expo-module` |
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
