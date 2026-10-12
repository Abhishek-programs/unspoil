# Money accounts (Bank · eSewa · Cash)

## Intent

Split **Your money** into where cash sits without changing the playbook total formula. Optional spend-from on expenses; income destination optional.

## Decisions

- Accounts: **Bank**, **eSewa**, **Cash** (system, not deletable)
- Bank + eSewa + Cash = **Your money** always
- Income / expense: optional account chips; **default Bank**
- Payment helper: eSewa app → eSewa; nBank → Bank
- Overdraw: drain chosen account, remainder from Bank
- Home: balances under expanded Your money
- Settings: Add money (found) + Move between accounts
- Found money: `account_adjustments` — increases Your money + destination
- Seed: all current Your money in Bank; eSewa/Cash = 0
- Reconcile: after events, adjust Bank so sum matches Your money
- Carry-forward & still-in-bank: Bank by default (via reconcile)

## Personal on Home (same ship)

- Row like regular spending: **Spent** this month
- Bar: spent ÷ monthly top-up
- Under bar: fund balance / cap · rolls over

## Out of scope

- Custom user-defined accounts
- Blocking spends when empty
- Double-entry journals
