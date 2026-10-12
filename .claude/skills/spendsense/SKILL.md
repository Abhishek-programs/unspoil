---
name: spendsense
description: SpendSense project conventions — Nepal personal finance app on Expo SDK 54, Expo Router, NativeWind, Zustand, Drizzle. Use when working in this repo or when generic Expo advice conflicts with project rules.
---

# SpendSense

Read **[AGENTS.md](../../../AGENTS.md)** before making changes. It is the single source of truth.

## Quick pointers

- **Screens:** `docs/screen-flows.md`
- **Next tasks:** `BUILD_ORDER.md`
- **V2 overlay:** `docs/overlay-v2.md` — never modify `lib/categorize.ts`, `store/`, or `db/schema.ts`

## Hard rules (summary)

- NPR via `lib/format.ts`. Colors in `constants/colors.ts`. Light theme only.
- Categorization: remarks suffix → sure-shot merchant → fallback + flag.
- EF target = Core Living × multiplier — not income.
- `[+]` opens `ManualEntrySheet` — not a tab.
- `lib/ocr.ts` is mocked — replace, don't extend long-term.
- No tests, no drive-by refactors, no extra scope.

## Other skills

Restore vendor skills: `npx skills experimental_install` → `.agents/skills/` (see `skills-lock.json`). Pointers in `.claude/skills/` wire Claude to the same files.
