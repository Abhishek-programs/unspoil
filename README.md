# SpendSense

Personal finance tracker for Android — NPR, bucket-based playbook, receipt OCR, goals.

## Setup

```bash
npm install
cp .env.example .env
npx expo start
```

Press `a` for Android emulator or scan QR with Expo Go. **OCR and native overlay need a dev client** (see AGENTS.md).

## Docs

| File | Purpose |
|---|---|
| [AGENTS.md](./AGENTS.md) | **Start here** — for you and AI agents |
| [BUILD_ORDER.md](./BUILD_ORDER.md) | Shipped work and next tasks |
| [docs/screen-flows.md](./docs/screen-flows.md) | Screen specs |
| [docs/prd.md](./docs/prd.md) | Product requirements (partially stale) |

## AI agent skills

After clone, install vendor Expo skills (gitignored cache in `.agents/skills/`):

```bash
npx skills experimental_install
```

Project skill: `.claude/skills/spendsense/` (committed). Other skills in `.claude/skills/` are pointers to `.agents/skills/`.

## Env

Copy `.env.example` → `.env`. Only needed for EAS builds or future OCR server fallback — the app runs without it for local dev.
