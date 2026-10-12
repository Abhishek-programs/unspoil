# Build Order

What's shipped and what's next. For stack and rules see [AGENTS.md](./AGENTS.md). For behavior and UI see [docs/core-function.md](./docs/core-function.md) and [docs/design-and-features.md](./docs/design-and-features.md).

---

## Shipped

| Area | Status |
|---|---|
| DB + Drizzle + seed + migrations | Done |
| Zustand stores + root hydration + month rollover / surplus carry-forward | Done |
| 6-step onboarding (Foundations → Bucket Builder → Goals → Balances) | Done |
| Home — Your money → ring → lent/borrow → Living → Future | Done |
| Lent & borrowed — contacts, person ledger, settle up | Done |
| Salary-gated safe to spend | Done |
| Personal accumulating fund + cap prompts | Done |
| Goals / Vault | Done |
| Month start checklist | Done |
| **Manual entry only** (expense / income / lend-borrow) via center [+] | Done |
| Transactions ledger + charts + detail sheet | Done |
| Settings — playbook, buckets, keywords, notifications, CSV export | Done |
| Payment helper (eSewa / nBank usage access + amount notification) | Done — needs `npx expo run:android` |

**Removed from scope (for now):** OCR / gallery scan, share-to-app, scan bubble overlay.

---

## Next

- [ ] Use the app daily — log expenses via [+]
- [ ] Optional polish (fonts, recurring auto-drafts) when needed
- [ ] Capture / OCR later if manual entry gets tedious

---

## Deferred / out of scope

- Share intent, SMS/email ingest, dark mode, AI chat, iOS, cloud sync
