# Build Order

What’s shipped and what’s next. For stack and rules see [AGENTS.md](./AGENTS.md). For screen specs see [docs/screen-flows.md](./docs/screen-flows.md).

---

## Shipped

| Area | Status |
|---|---|
| DB + Drizzle + seed + migrations | Done |
| Zustand stores + root hydration | Done |
| Home (HeroRing, Living, Future, NetWorth) | Done |
| Manual entry + center [+] FAB | Done |
| Categorization (3-step) + flagged prompt | Done |
| Transactions list, detail sheet, charts | Done |
| Goals + EF pseudo-goal + projections | Done |
| 5-step onboarding | Done |
| Month start checklist | Done |
| Notifications + settings toggles | Done |

---

## Next (V1)

### OCR scanner — Step 11

- [ ] Replace mock in `lib/ocr.ts` with real parsing (`parseOcrText()` — eSewa, Khalti, NMB, Global IME)
- [ ] Wire `expo-image-picker` → OCR → pre-fill `ManualEntrySheet`
- [ ] Run through `lib/categorize.ts` on save
- [ ] Add `rn-mlkit-ocr` + dev client build when ready

### Polish

- [ ] Net worth card: tap for asset breakdown (EF, MacBook, shares)
- [ ] Auto-create recurring drafts on month start (PRD F5)

---

## V2 — Bubble overlay (Android)

Full implementation prompt: [docs/overlay-v2.md](./docs/overlay-v2.md)

1. Bubble UI + foreground service
2. Screen capture (MediaProjection)
3. ML Kit OCR pipeline
4. Categorize + save via existing stores (additive only)

---

## Exploratory (no timeline)

AI insights layer in `ai/` — tap-triggered only, no chat. Needs 3+ months of real data first.
