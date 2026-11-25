> Historical note: this describes Kiro's first scaffold. On 2026-11-25 the project was rebuilt on Reddit's official devvit-template-react, and the core moved to src/shared/core. See .kiro/steering/structure.md for the current layout.

# Project Status

**Here Lies** - Daily haunted-crypt deduction game for Reddit

## Current Status: Foundation Complete ✓

### Completed ✓

#### Documentation & Steering
- [x] Comprehensive brief (docs/BRIEF.md)
- [x] 6 steering documents (.kiro/steering/)
- [x] Public README with How to Play
- [x] Privacy Policy and Terms of Service
- [x] Kiro usage log

#### Configuration
- [x] TypeScript configuration (strict mode, path aliases)
- [x] Vite bundler setup (client build)
- [x] Vitest test runner
- [x] ESLint configuration
- [x] Devvit configuration (permissions, scheduler, triggers, menu)

#### Core Package (`packages/core/`)
- [x] Type system (38 types defined)
- [x] Seeded RNG (deterministic, tested)
- [x] Coordinate utilities (tested)
- [x] 32 tests passing

#### Infrastructure
- [x] Project structure
- [x] Build scripts
- [x] Git repository with .kiro/ tracked
- [x] License (Apache-2.0)

### In Progress 🚧

None currently.

### Next Priority 📋

#### 1. Core Engine (packages/core/)
- [ ] `generator.ts`: Seeded crypt generation
  - Place entrance, relic, pits, curses
  - Validate reachability
  - Run solver to verify fairness
- [ ] `solver.ts`: Reference deduction engine
  - Constraint propagation
  - Case enumeration
  - Bone/flare strategy
  - Must complete in <200ms
- [ ] `rules.ts`: Game state and action application
  - Move validation
  - Oil consumption
  - Omen calculation
  - Death detection
- [ ] `scoring.ts`: Score calculation
  - Base + bonuses formula
  - Pioneer multiplier
  - Streak logic
- [ ] `share.ts`: Emoji share text formatting

#### 2. Property-Based Tests
- [ ] Determinism (same seed → same crypt)
- [ ] Fairness (every crypt solvable by solver)
- [ ] Safe zone (entrance + neighbors never hazardous)
- [ ] Omen correctness (counts match actual hazards)
- [ ] Oil accounting (never negative, correct costs)
- [ ] Score monotonicity

#### 3. Server (src/server/)
- [ ] Redis repository layer (crypts, runs, tombstones, votes, etc.)
- [ ] API endpoints (/api/today, /api/act, /api/epitaph, etc.)
- [ ] Anti-cheat validation
- [ ] Moderation (Perspective API integration)
- [ ] Realtime channel helpers

#### 4. Daily Loop
- [ ] Cron: daily crypt generation
- [ ] Cron: weekly necropolis
- [ ] Trigger: app installation
- [ ] Post creation and splash updates

#### 5. Client (src/client/)
- [ ] React app setup
- [ ] Game screen (grid, omens, controls)
- [ ] Lantern canvas (light, fog, particles)
- [ ] Tombstone rendering
- [ ] Death screen (epitaph input)
- [ ] Reveal screen (map unfold, voting)
- [ ] Result card (score, share, subscribe)
- [ ] Accessibility (ARIA, keyboard nav)

#### 6. Community Features
- [ ] Leaderboards (daily, weekly)
- [ ] Reputation system
- [ ] Flair updates
- [ ] Community crypt editor
- [ ] UGC queue and moderator approval
- [ ] Necropolis visualization

### Deadlines

- **Kiroween:** Dec 4, 2:00 PM PT
  - Public repo ✓
  - License shown in About ✓
  - .kiro/ committed ✓
  - Working demo post (TODO)
  - Video under 3 minutes (TODO)
  - Kiro usage write-up (in progress)

- **Reddit Game of the Day:** Dec 8, 6:00 PM PT
  - App uploaded (not published) (TODO)
  - Demo post in public test subreddit (TODO)
  - README.md ✓
  - Feedback survey (TODO)

### Technical Debt / Notes

- Devvit package versions TBD (removed from package.json until playtest)
- Perspective API key configuration (via Devvit secrets)
- Server needs @devvit types installed during actual server dev
- Client needs React setup with proper entrypoints

### Test Coverage

- RNG: 100% ✓
- Utils: 100% ✓
- Generator: 0% (not implemented)
- Solver: 0% (not implemented)
- Rules: 0% (not implemented)
- Scoring: 0% (not implemented)
- Server: 0% (not implemented)

### Code Stats

- Files: 29
- Lines (excluding node_modules): ~2,500
- Tests: 32 passing
- Build time: N/A (client not built yet)
- Test time: 401ms
