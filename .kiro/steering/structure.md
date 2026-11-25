# Repository Structure

```
here-lies/
├── .kiro/                    Kiro configuration (committed for Kiroween)
│   ├── steering/             Steering documents
│   │   ├── product.md        Product vision and principles
│   │   ├── tech.md           Platform facts and architecture
│   │   ├── structure.md      This file
│   │   ├── game-rules.md     Game rules (MUST constraints)
│   │   ├── art-direction.md  Visual identity
│   │   └── devvit-constraints.md  Devvit-specific rules
│   ├── hooks/                Automation hooks (file save, agent stop, etc.)
│   └── settings/             MCP configuration
│
├── docs/
│   ├── BRIEF.md              The source of truth for the game
│   └── KIRO_LOG.md           Running log of Kiro usage for the write-up
│
├── packages/
│   └── core/                 Shared game engine (pure TypeScript)
│       ├── src/
│       │   ├── rng.ts        Seeded random number generation
│       │   ├── generator.ts  Crypt generation
│       │   ├── solver.ts     Reference deduction engine
│       │   ├── rules.ts      Game state and action application
│       │   ├── scoring.ts    Score calculation
│       │   ├── types.ts      Core types
│       │   └── share.ts      Share text formatting
│       ├── test/             Property-based and unit tests
│       ├── package.json
│       └── tsconfig.json
│
├── src/
│   ├── client/               React webview
│   │   ├── pages/
│   │   │   ├── splash.tsx    Inline splash screen
│   │   │   ├── game.tsx      Main game screen
│   │   │   ├── death.tsx     Epitaph carving
│   │   │   ├── reveal.tsx    Map reveal and voting
│   │   │   ├── result.tsx    Result card
│   │   │   ├── leaderboard.tsx  Leaderboards
│   │   │   └── editor.tsx    Community crypt editor
│   │   ├── components/
│   │   │   ├── Grid.tsx      The crypt grid
│   │   │   ├── Lantern.tsx   Lantern canvas (light and fog)
│   │   │   ├── Tombstone.tsx Tombstone rendering
│   │   │   ├── Omens.tsx     Omen display
│   │   │   └── ...
│   │   ├── hooks/            Custom React hooks
│   │   ├── styles/           CSS modules
│   │   ├── assets/           SVG glyphs
│   │   ├── splash.html       Entrypoint for splash
│   │   ├── game.html         Entrypoint for game
│   │   └── main.tsx          App shell
│   │
│   └── server/               Devvit Web server
│       ├── endpoints/
│       │   ├── api/          Public API endpoints
│       │   │   ├── today.ts
│       │   │   ├── run.ts
│       │   │   ├── act.ts
│       │   │   ├── epitaph.ts
│       │   │   ├── reveal.ts
│       │   │   ├── vote.ts
│       │   │   ├── share.ts
│       │   │   ├── leaderboard.ts
│       │   │   ├── practice.ts
│       │   │   └── ugc.ts
│       │   └── internal/     Scheduler, triggers, menu
│       │       ├── cron/
│       │       │   ├── daily.ts
│       │       │   └── necropolis.ts
│       │       ├── triggers/
│       │       │   └── install.ts
│       │       └── menu/
│       │           ├── create-today.ts
│       │           ├── review-ugc.ts
│       │           └── remove-epitaph.ts
│       ├── repo/             Redis repository layer
│       │   ├── crypts.ts
│       │   ├── runs.ts
│       │   ├── tombstones.ts
│       │   ├── votes.ts
│       │   ├── leaderboard.ts
│       │   ├── streaks.ts
│       │   └── ugc.ts
│       ├── moderation.ts     Epitaph filtering and Perspective API
│       ├── realtime.ts       Realtime channel helpers
│       └── index.ts          Devvit app setup
│
├── devvit.json               Devvit configuration
├── package.json              Root dependencies and scripts
├── tsconfig.json             TypeScript configuration
├── vite.config.ts            Vite bundler configuration
├── vitest.config.ts          Test runner configuration
├── README.md                 Public-facing documentation
├── LICENSE                   Apache-2.0
└── .gitignore                (never ignore .kiro/)
```

## Key Conventions

### Import Aliases
- `@core/*` → `packages/core/src/*`
- `@client/*` → `src/client/*`
- `@server/*` → `src/server/*`

### File Naming
- Components: PascalCase (`Grid.tsx`)
- Utilities: camelCase (`rng.ts`)
- Types: PascalCase in `types.ts`
- CSS Modules: `Component.module.css`

### Test Files
- Colocated with source: `generator.test.ts` next to `generator.ts`
- Property-based tests: `*.property.test.ts`
- Server tests with fakes: `*.server.test.ts`

### Redis Keys
See `docs/BRIEF.md` section 7.4 for the full key schema.

Prefix by entity:
- `crypt:{dayId}`
- `run:{dayId}:{userId}`
- `tombs:{dayId}`
- `tombcell:{dayId}:{cell}`
- etc.

### Realtime Channels
- `crypt-{dayId}` (note: no colon, Devvit constraint)

### Environment Variables
None required for the core game. The Perspective API key (if used) is configured through Devvit's secrets management.

## Build Outputs
- `dist/client/`: HTML entrypoints and bundled assets
- `dist/server/`: Single `index.js` with all server code
- Both consumed by `devvit upload`
