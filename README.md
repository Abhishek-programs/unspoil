# SpendSense

Personal finance tracker for Android — NPR, bucket-based playbook, manual entry, goals.

## Setup

```bash
npm install
cp .env.example .env
npx expo start
```

Press `a` for Android emulator, or use a development build: `npx expo run:android` — see [AGENTS.md](./AGENTS.md).

## Docs

| File | Purpose |
|---|---|
| [AGENTS.md](./AGENTS.md) | **Start here** — stack, rules, repo map |
| [docs/core-function.md](./docs/core-function.md) | Mental model and money flows |
| [docs/design-and-features.md](./docs/design-and-features.md) | Current UI and features |
| [BUILD_ORDER.md](./BUILD_ORDER.md) | Shipped work and next tasks |

## AI agent skills

After clone:

```bash
npx skills experimental_install
```
