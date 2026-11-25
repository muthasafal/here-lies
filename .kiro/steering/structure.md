---
inclusion: always
---

# Repository Structure

This project is built on Reddit's official **devvit-template-react** (Devvit Web 0.15.4). Keep the template's layout; don't invent a different one. Also read `AGENTS.md` at the repo root (the template's agent rules).

```
here-lies/
├── .kiro/                     Kiro configuration (committed; required for Kiroween)
│   ├── steering/              product, tech, structure, game-rules, art-direction, devvit-constraints, brief
│   ├── specs/                 One folder per spec (requirements.md, design.md, tasks.md)
│   ├── hooks/                 Agent hooks (*.json)
│   ├── agents/                Custom agents
│   └── settings/mcp.json      MCP servers
├── docs/
│   ├── BRIEF.md               Source of truth for the game. NEVER shorten or rewrite it.
│   ├── KIRO_LOG.md            Running log of Kiro usage for the write-up
│   └── REVIEW.md              Review findings to fix
├── src/
│   ├── shared/                Code shared by client and server (tsconfig.shared: WebWorker libs, no DOM, no Node)
│   │   ├── core/              THE GAME ENGINE: pure TypeScript, no Devvit, no React
│   │   │   ├── types.ts       Core types and constants
│   │   │   ├── rng.ts         Seeded RNG (mulberry32) + day seed
│   │   │   ├── utils.ts       Coordinate helpers
│   │   │   ├── generator.ts   Crypt generation (to build)
│   │   │   ├── solver.ts      Reference deduction solver (to build)
│   │   │   ├── rules.ts       applyAction(state, action) (to build)
│   │   │   ├── scoring.ts     Score formula (to build)
│   │   │   ├── share.ts       Share text (to build)
│   │   │   └── *.test.ts      Vitest + fast-check tests, colocated
│   │   └── api.ts             Request/response types shared by client and server
│   ├── client/                Webview (runs in an iframe on reddit.com)
│   │   ├── splash.html/.tsx   Inline entry shown in the feed. Keep it light and fast.
│   │   ├── game.html/.tsx     Expanded entry: the game. Heavy code goes here.
│   │   ├── components/        Grid, Lantern (canvas), Tombstone, Omens, ...
│   │   ├── hooks/             React hooks
│   │   ├── index.css          Tailwind 4 entry + design tokens
│   │   └── global.ts, module.d.ts
│   └── server/                Devvit Web server: Hono app
│       ├── index.ts           Hono app: mounts /api and /internal routers
│       ├── routes/api.ts      /api/* game endpoints
│       ├── routes/menu.ts     /internal/menu/* (every menu item MUST be mapped in devvit.json)
│       ├── routes/triggers.ts /internal/triggers/*
│       ├── routes/cron.ts     /internal/cron/* (scheduler tasks in devvit.json) (to build)
│       ├── core/              Server helpers (post creation, ...)
│       └── repo/              Redis repository layer (to build)
├── tools/                     tsconfig.base/client/server/shared/vite (from the template)
├── devvit.json                Devvit config: entrypoints, server, permissions, scheduler, menu, triggers
├── vite.config.ts             react() + tailwind() + devvit() plugins (builds client and server)
├── vitest.config.ts           Runs src/**/*.test.ts
├── eslint.config.js           Template lint config (test files ignored)
├── AGENTS.md                  Template agent rules (navigateTo not window.location, no alert, no inline scripts, type aliases, named exports, no type casts)
└── package.json               Scripts: dev (devvit playtest), build, test, test:types, lint, deploy (devvit upload)
```

## Conventions
- **Import shared code with relative paths** (for example `../../shared/core/rules`). There are no path aliases.
- Prefer `type` aliases, named exports, and **no type casts** (from AGENTS.md).
- Tests sit next to their source as `*.test.ts` and run with `npm test` (Vitest). Property tests use fast-check.
- Redis keys: see `docs/BRIEF.md` section 7.4. Realtime channel: `crypt-{dayId}` (no colon).
- Build output: `dist/client` and `dist/server/index.cjs`. Both are produced by `vite build` via the Devvit plugin.

## Commands
- `npm run dev`: `devvit playtest` (live in your test subreddit)
- `npm run build`, `npm test`, `npm run test:types`, `npm run lint`
- `npm run deploy`: type-check, lint, then `devvit upload` (**never** `devvit publish` during the hackathon)
