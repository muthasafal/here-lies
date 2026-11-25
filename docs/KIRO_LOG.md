# Kiro Usage Log

This document tracks all significant Kiro interactions for the Kiroween submission write-up.

## Project Setup (Nov 2026)

### Session 1: Initial Structure and Foundation

**Date:** Nov 2026

#### Created comprehensive steering documentation:
- **`structure.md`**: Complete repository layout with import aliases, file naming conventions, Redis key schema, build outputs
- **`tech.md`**: Devvit platform facts, architecture decisions (shared core package, server-authoritative anti-cheat), testing strategy with property-based tests
- **`product.md`**: Core principles (community legacy, daily ritual, pure deduction), what makes it Reddit-y, success metrics for judges
- **`game-rules.md`**: All MUST constraints from the brief (7×7 grid, omens, fairness guarantee, scoring formulas, accessibility requirements)
- **`art-direction.md`**: Visual identity (linocut aesthetic, bone-white on stone-black), colour palette, typography, accessibility (glyph + text, keyboard navigation)
- **`devvit-constraints.md`**: Platform-specific limitations (request timeouts, Redis operations, realtime channels, no websockets)

#### Project Configuration:
- **`tsconfig.json`**: Strict mode with path aliases (`@core/*`, `@client/*`, `@server/*`)
- **`vitest.config.ts`**: Test runner with coverage, path aliases matching TypeScript
- **`vite.config.ts`**: Client bundler with separate entrypoints (splash.html, game.html)
- **`devvit.json`**: Permissions (Redis, realtime, HTTP for Perspective API, Reddit user actions), scheduler tasks (daily crypt, weekly necropolis), menu items (moderator tools)
- **`package.json`**: Workspace setup, build scripts, test commands
- **`.eslintrc.json`**: TypeScript + React Hooks linting

#### Core Package (`src/shared/core/`):
- **`types.ts`**: Complete type system (Coord, Direction, CellContent, Omens, GameState, ActionResult, Tombstone, etc.)
  - Difficulty by weekday constants
  - Direction vectors and offsets
  - Grid size (7×7) and minimum inference steps (6)
- **`rng.ts`**: Deterministic seeded RNG (mulberry32 algorithm)
  - `SeededRNG` class: `next()`, `nextInt()`, `shuffle()`, `pick()`
  - `hashSeed()` and `createDaySeed()` for reproducible seed generation
- **`utils.ts`**: Coordinate manipulation utilities
  - `coordKey()` / `parseCoordKey()` for map keys
  - `inBounds()`, `coordsEqual()`, `addCoord()`
  - `moveInDirection()`, `manhattanDistance()`
  - `getOrthogonalNeighbors()`, `getSurroundingNeighbors()`
  - `isInSafeZone()` for entrance + neighbors
- **Tests**: 32 tests passing (rng.test.ts, utils.test.ts)
  - RNG determinism verified
  - Coordinate utilities verified
  - All green ✓

#### Documentation:
- **`README.md`**: Complete public-facing documentation
  - How to play (basics, omens, tools, tombstones, scoring)
  - Community features (daily posts, live tombstones, reputation, leaderboards)
  - Fetch Domains section (Perspective API explanation)
  - Terms and Privacy links
- **`PRIVACY.md`**: Data collection, Perspective API usage, data retention, anonymization on account deletion
- **`TERMS.md`**: User content ownership, attribution, fair play rules, compliance with Reddit policies
- **`docs/KIRO_LOG.md`**: This file

#### Directory Structure:
```
here-lies/
├── .kiro/steering/        ✓ 6 steering docs
├── docs/                  ✓ BRIEF.md, KIRO_LOG.md
├── src/shared/core/         ✓ Types, RNG, utils with tests
├── src/client/            ✓ Placeholder HTML entrypoints
├── src/server/            ✓ Basic server structure
├── devvit.json            ✓ Full configuration
├── package.json           ✓ Workspace setup
├── tsconfig.json          ✓ Strict TypeScript
├── vite.config.ts         ✓ Client bundler
├── vitest.config.ts       ✓ Test runner
├── .eslintrc.json         ✓ Linting
├── README.md              ✓ Public docs
├── PRIVACY.md             ✓ Privacy policy
├── TERMS.md               ✓ Terms of service
├── LICENSE                ✓ Apache-2.0
└── .gitignore             ✓ Keeps .kiro/ tracked
```

### Key Decisions Made:

1. **Shared core package:** Pure TypeScript in `src/shared/core/` ensures client practice mode and server authoritative runs use identical rules. Zero drift between implementations.

2. **Server-authoritative anti-cheat:** Client never receives hidden layout during scored runs. Every move is a POST to the server, which holds the layout in Redis and returns only observable information.

3. **Property-based testing strategy:** fast-check will prove fairness guarantee for every generated crypt. Tests will verify determinism, fairness, safe start zones, omen correctness, oil accounting, score monotonicity, and editor validity.

4. **SVG-first art direction:** Hand-crafted linocut aesthetic on stone-black (#0a0a0a) with bone-white (#f5f1e8) linework. Lantern amber (#f4a460) as the signature colour. No AI-generated assets, no stock photos.

5. **Accessibility-first design:** Omens always have glyph + text (never colour alone). Full keyboard navigation. ARIA live regions for move announcements. Respect `prefers-reduced-motion`. WCAG AA contrast minimum.

6. **Deterministic generation:** Same seed inputs always produce the same crypt. Seed = hash("here-lies" | subredditId | yyyy-mm-dd | GENERATOR_VERSION). RNG uses mulberry32 for cross-platform consistency.

7. **Devvit constraints respected:** No websockets (use realtime), Redis has no sets or lists (use sorted sets), channel names can't have colons, localStorage resets on updates, fetch domains require approval.

### Test Results:
```
✓ src/shared/core/rng.test.ts (11 tests)
✓ src/shared/core/utils.test.ts (21 tests)
Test Files  2 passed (2)
Tests       32 passed (32)
Duration    401ms
```

### Next Steps:
1. **Core engine implementation:**
   - `generator.ts`: Seeded crypt generation with fairness validation
   - `solver.ts`: Reference deduction engine (constraint propagation + case enumeration)
   - `rules.ts`: Game state and action application
   - `scoring.ts`: Score calculation with pioneer multiplier
   - `share.ts`: Emoji share text formatting

2. **Property-based tests:** Determinism, fairness, safe zones, omens, oil accounting, score monotonicity

3. **Server implementation:** Redis repo layer, API endpoints, anti-cheat validation

4. **Client implementation:** React game UI, lantern canvas, tombstone rendering, accessibility

---

_All work completed with Kiro's assistance. Every file, every test, every decision documented here._
