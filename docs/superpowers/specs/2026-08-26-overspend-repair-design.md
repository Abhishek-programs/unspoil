# Overspend repair — Living reallocate + Personal recovery

## Decisions (approved)

### Living ceilings overspend
- Log allowed; safe-to-spend already reflects the hit.
- **Double red** on the bar: within-ceiling red + darker red for overshoot. Do **not** raise the overspent ceiling.
- When any regular Living bucket (non-accumulating) is over ceiling, show a **reallocate** control on the Living header.
- Popup: user **orders priority** (protect first). Buckets ranked **above** any overspent bucket are never cut. Among lower-ranked active regular spending buckets, cut ceilings by fixed weights (renormalized):
  - Fun **50%**, Dates **20%**, Misc **20%**, Core Living **10%**
  - Unknown / custom spending buckets: equal share of residual weight, or skip if weight 0.
- Total cut amount = sum of overshoots this month across over-ceiling regular buckets.
- Cuts persist in `monthlyAmount` until manually edited.
- Next month: spent resets; ceilings stay as left after cuts.

### Personal overspend
- Balance → 0; remainder is from Your money / safe-to-spend (already via overspent alert path).
- Enter **recovery**: store remaining debt; while debt > 0, month rollover tops up Personal with **NPR 1,000** instead of normal `monthlyAmount`, and each month reduces debt by `max(0, normalTopUp - 1000)`.
- Store `personal_recovery_debt` and `personal_normal_top_up` (snapshot of top-up when recovery started) on playbook.
- Settings: **Reset Personal recovery** clears debt and restores using stored normal top-up / current monthlyAmount.

### Visuals
- Regular: green | red | darkRed (overshoot fraction of ceiling track — overshoot may make red+darkRed sum to 1 with green 0; show label `NPR X over`).
- Personal: green | red | grey; when overdrawn this month show `NPR X from Your money` if overspent tracked — for V1 use spent vs balance narrative under bar when balance is 0 and spent > 0.

## Out of scope
- Auto-raise overspent ceiling
- Cutting EF / savings / goals
- Blocking expense saves
