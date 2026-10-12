---
name: spendsense
description: SpendSense project conventions — Nepal personal finance app on Expo SDK 54, Expo Router, NativeWind, Zustand, Drizzle. Use when working in this repo or when generic Expo advice conflicts with project rules.
---

# SpendSense

Read **[AGENTS.md](../../../AGENTS.md)** before making changes. It is the single source of truth.

## Quick pointers

- **Logic:** `docs/core-function.md`
- **UI / features:** `docs/design-and-features.md`
- **Next tasks:** `BUILD_ORDER.md`

## Hard rules (summary)

- NPR via `lib/format.ts`. Colors in `constants/colors.ts`. Light theme only.
- Categorization: keyword word match (description / remarks / merchant) → sure-shot merchant → fallback + flag.
- EF target = Core Living × `EF_MULTIPLIER` — not income.
- Safe to spend unlocks after salary confirmed this month (`__salary__` txn).
- `[+]` opens `ManualEntrySheet` — not a tab. Manual entry only (no OCR / share).
- No tests, no drive-by refactors, no extra scope.

## Other skills

Restore vendor skills: `npx skills experimental_install` → `.agents/skills/` (see `skills-lock.json`). Pointers in `.claude/skills/` wire Claude to the same files.
