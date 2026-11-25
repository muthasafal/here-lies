# Technical Steering

## Platform: Devvit Web (Reddit)

**Facts verified against Devvit docs, Nov 2024:**

### Structure
- `src/client/`: React webview (the game UI)
- `src/server/`: API endpoints (`/api/*`), internal endpoints (`/internal/*` for scheduler, triggers, menu)
- `devvit.json`: configuration, permissions, scheduler tasks, triggers, menu items
- Build output: `dist/client/` (HTML entrypoints) and `dist/server/index.js`

### Limits
- **Request timeout:** 30 seconds per request
- **Payload:** 4 MB request, 10 MB response
- **No websockets or streaming:** use Devvit `realtime` for live updates
- **CSP:** client cannot fetch external URLs; only the server can, to approved domains
- **localStorage resets on app update:** use Redis for persistence

### Redis (@devvit/redis)
- **Available:** strings, hashes, sorted sets, numbers, bitfields, transactions, expire
- **Not available:** plain sets, lists, pipelining, key scan
- **Scope:** per installation (per subreddit)
- **Limit while unpublished:** 100 MB

### Realtime
- Client: `connectRealtime({ channel, onMessage })`
- Server: `realtime.send(channel, msg)`
- **Channel names cannot contain `:`**

### Scheduler
- Declare tasks in `devvit.json`
- `scheduler.runJob({ name, runAt | cron, data })`
- **At most 10 live recurring jobs per installation**
- **1-minute resolution**

### Posts
- `reddit.submitCustomPost({ title, subredditName, entry, splash, postData, styles })`
- Splash fields: `appDisplayName, heading, description, buttonLabel, backgroundUri, appIconUri`
- Post height: `TALL` (512px) or `REGULAR` (320px)

### User Actions
- `reddit.getCurrentUser()` returns `undefined` when logged out
- `reddit.getSnoovatarUrl(username)` for avatars
- **Acting as the user:** requires `permissions.reddit.asUser` with explicit actions, then pass `runAs: 'USER'` to the Reddit API call. **Must be triggered by an explicit manual button, never automatic.**

### HTTP Fetch
- Requires `permissions.http.domains` with exact hostnames
- Approval takes 1-2 business days at playtest or upload, so **request early**
- README must have a "Fetch Domains" section explaining each domain's purpose
- We need: `commentanalyzer.googleapis.com` (Perspective API for epitaph moderation)

## Architecture

### Shared Core Package
`packages/core/` contains pure TypeScript with zero dependencies on Devvit or React:
- RNG (mulberry32 or sfc32)
- Generator (seeded crypt creation)
- Solver (reference deduction engine)
- Rules engine (apply action → new state)
- Scoring
- Share text formatting

**Why:** The client runs practice crypts and the editor locally. The server runs scored games authoritatively. The rules must never drift. Shared core = single source of truth.

### Client (src/client/)
- **Stack:** React + TypeScript + Vite
- **Rendering:** DOM/SVG for UI, one `<canvas>` for lantern light, fog and particles
- **Motion:** CSS transitions and transforms (or Framer Motion), respecting `prefers-reduced-motion`
- **State:** React Context or Zustand for game state
- **Realtime:** Devvit `connectRealtime` for live tombstone drops and stats

### Server (src/server/)
- **Endpoints:** Express-style handlers in Devvit Web
- **Data layer:** Redis repository pattern (one module per aggregate: crypts, runs, tombstones, votes, leaderboards, streaks, UGC)
- **Anti-cheat:** Server-authoritative. The client never receives the hidden layout during a scored run. Each action is a POST to the server, which holds the layout in Redis and returns only observable results.
- **Moderation:** Perspective API for epitaphs (when available), plus local word filter, plus moderator menu actions

## Testing

### Property-Based (fast-check)
- Determinism: same seed inputs → same crypt
- Fairness: every generated crypt is solvable by the reference solver
- Safe start: entrance and neighbours never hazardous
- Omen correctness: counts match actual adjacent hazards
- Oil accounting: never negative, moves cost 1, flare costs 2, bones cost 0
- Score monotonicity: more oil left → higher score; more tombstones → lower multiplier
- Server/client agreement: same action sequence → same state
- Editor validity: accepted layouts are solvable, rejected are not

### Unit Tests (vitest)
- Scoring formula
- Share text formatting
- Epitaph filter
- Streak logic across UTC day boundaries

### Server Tests
- Endpoint handlers with in-memory Redis fake
- Anti-cheat: no layout leaks before run ends

### Playtest
- `devvit playtest` in a private test subreddit
- Upload to Reddit for extended playtest
- Public test subreddit (under 200 members) for final validation

## Build Tools
- **TypeScript:** strict mode, paths for `@core/*` aliases
- **Vite:** client bundler, with separate entrypoints for splash and game
- **Vitest:** test runner
- **Devvit CLI:** `devvit upload`, `devvit playtest`

## Performance Targets
- **Solver:** ≤ 200ms per crypt in Node and in the browser (runs live in the editor)
- **Action response:** ≤ 500ms round-trip for move/bone/flare
- **Page weight:** ≤ 500 KB for initial load (most assets are inline SVG)
