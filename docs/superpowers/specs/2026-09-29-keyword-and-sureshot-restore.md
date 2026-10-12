# Restore: keyword mappings + sure-shot merchants

**Date:** 2026-09-29  
**Status:** Parked — not a product feature  
**App:** SpendSense

Keyword mappings and sure-shot merchants used to auto-pick a bucket when logging an expense. The Settings UI, flagged “always use this merchant,” and live auto-categorize path were removed. Tables, store methods, seed defaults, and `lib/categorize.ts` stayed so this can be turned back on without a schema rewrite.

Ask an agent: *follow `docs/superpowers/specs/2026-09-29-keyword-and-sureshot-restore.md` and restore keyword mappings and sure-shot merchants as a Settings feature.*

---

## What it did

When an expense had no chosen bucket (or Payment helper / flagged review needed a guess):

1. **Keyword word match** — keyword appears in title (`description`), extra detail (`merchant`), or non-`__` remarks → that bucket.
2. **Sure-shot merchant** — exact merchant / title match → that bucket, never flagged.
3. **Fallback** — playbook fallback bucket + `is_flagged = true`.

Users managed lists in Settings. Flagged review had **Always use this bucket for “{title}”**, which inserted a sure-shot row. Only sure-shot (not every merchant) was memorized.

Never auto-memorize ambiguous merchants.

---

## What still exists (do not delete on restore)

| Piece | Where |
|---|---|
| Tables | `keyword_mappings`, `sure_shot_merchants` in `db/schema.ts` |
| Store | `store/buckets.ts` — `keywordMappings`, `sureShotMerchants`, `addKeywordMapping`, `deleteKeywordMapping`, `addSureShotMerchant`, `deleteSureShotMerchant` |
| Engine | `lib/categorize.ts` — same priority as above |
| Defaults | `constants/defaults.ts` → `DEFAULT_KEYWORD_MAPPINGS`; seeded in `db/seed.ts` |
| Clear-all | Settings still deletes both tables on reset |
| Snapshot | Share for Claude still lists leftover rows if any |

---

## Put back in the UI

### Settings (`app/(tabs)/settings.tsx`)

Two sections after Buckets, before Personal recovery / Money locations:

**Keyword Mappings** — description: *A word in the title or description maps to a bucket.*  
Rows: keyword + bucket name + delete. Add: text field + bucket chips (`BucketPicker`) + Add.

**Sure-Shot Merchants** — description: *Auto-categorize by merchant name.*  
Same pattern with merchant name.

Reuse the old `BucketPicker` + mapping row styles (or copy from git history if they were removed).

### Manual entry (`components/manual-entry/ManualEntrySheet.tsx`)

If expense bucket is unset, call `categorize()` with store keywords + sure-shots + `fallbackBucketId`. If the user picked a bucket, do not override it and do not flag.

Expense save already requires a bucket today; restore either keeps that **or** allows empty bucket so categorize can fill it.

### Flagged review (`components/flagged/FlaggedTransactionPrompt.tsx`)

Restore the **Always use this bucket for "{title}"** switch. On confirm, if on and title is known, `addSureShotMerchant(title, bucketId)`.

### Docs / rules

Put these lines back:

- `AGENTS.md` — Auto-categorization priority (keyword → sure-shot → fallback + flag).
- `docs/core-function.md` — Categorization section.
- `docs/design-and-features.md` — Settings list includes keywords + sure-shot.
- `.claude/skills/spendsense/SKILL.md` — same priority.
- `BUILD_ORDER.md` — Settings row mentions keywords again.

---

## Out of scope unless asked

- Changing table names or adding a new categorize engine
- Memorizing every merchant from every save
- Cloud sync of mappings
