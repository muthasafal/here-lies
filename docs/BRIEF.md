# Here Lies: Game and Technical Brief

This is the source of truth for the game. Steering docs and specs derive from it. If they disagree, this brief wins, unless the brief is updated in the same change.

---

## 1. One line

**A daily haunted-crypt deduction game on Reddit in which every player who dies leaves a tombstone and an epitaph for everyone after them.** The whole subreddit hunts the same crypt each day, and the dead light the way.

It's a revival of *Hunt the Wumpus* (Gregory Yob, 1973), the original cave deduction game, rebuilt as an asynchronous massively multiplayer daily ritual. Its mechanics are classic, and our implementation, art and community layer are fully original. **We copy no names, art or text from any existing game.**

## 2. Hackathons and their constraints

| Hackathon | Deadline (PT) | Must-haves |
|---|---|---|
| **Kiroween, Resurrection category** (+ Best Student Project: Resurrection) | Dec 4, 2:00 PM | Built with Kiro during the submission period. Public GitHub repo, OSI license shown in About, `/.kiro` committed (never gitignored). Working app URL (the Reddit demo post). Video under 3 minutes. Kiro usage write-up. **The game must be complete and playable by Dec 4.** |
| **Reddit Game of the Day** | Dec 8, 6:00 PM | Built on **Devvit Web** and following the Devvit Rules. App **uploaded, not published** (do not submit it for review). App listing link. A demo post in a **public test subreddit with under 200 members**. A detailed `README.md` at the root (the game, how to play, a Fetch Domains section). Optional video of 1 minute or less. Optional public repo (we have one). Fill in the developer feedback survey ($200 × 5 awards). |

**What the Reddit judges score:**
- **Delightful UX:** exciting layout and theme; easy and fun to discover.
- **Polish:** close to publishable; judges understand everything from the post alone.
- **Reddit-y:** community, identity, bringing people together; not about Reddit itself.
- **Daily content:** fresh daily challenge and intrigue.

**They explicitly penalise:**
- **AI slop.** The UI must fit the viewport, have a unique identity, and be accessible.
- On-the-nose Reddit theming (no Snoo, karma or "subreddit" jokes).
- Common ideas: trivia, clones, platformers, collaborative storytelling.
- Anything not running on Reddit.

**What they reward:**
- intuitive onboarding with contextual hints, not walls of text
- a clear visual identity with accessible contrast
- calibrated daily content that is fair and solvable
- a focused start screen (name, date, stats)
- one clear end-state result card with stats, streak and a next step

## 3. Core loop (2 to 5 minutes)

1. **Open today's post.** The inline splash shows the crypt's name and number, the weekday difficulty, live stats ("214 entered, 131 fell, 52 escaped") and a **Descend** button.
2. **Play the crypt:** deduce your way to the relic and back to the entrance before the lantern runs dry.
3. **If you die:** your tombstone appears in that room for everyone after you, and you may carve an epitaph.
4. **If you escape:** your score, streak, and the full revealed map. Then judge the epitaphs you passed as true or false.
5. **The result card:** share an emoji summary, an optional "Post my epitaph or result as a comment" button, and a subscribe prompt. Come back tomorrow.

---

## 4. Game rules (precise)

### 4.1 The crypt
- **Grid:** 7 × 7 rooms, indexed `(x, y)` with `0 ≤ x, y ≤ 6`. Movement is orthogonal only.
- **Entrance:** one cell on the bottom edge (`y = 6`), chosen by the seed. **The entrance is also the exit.**
- **Contents (hidden):**
  - **Relic** ×1: you must step on it to pick it up.
  - **Pits** ×P: stepping in means instant death.
  - **Curses** ×C: stepping in drains `curseDrain` oil (default 5) and marks you "cursed" (a score penalty), and you survive. If the drain empties the lantern, you die.
- **Safe guarantees:** the entrance and its orthogonal neighbours are always safe and never contain the relic.

### 4.2 Omens (what you sense in a room you stand in)
| Omen | Meaning | Shown as |
|---|---|---|
| **Cold draft** ×n | n pits among the orthogonally adjacent rooms (0 to 4) | wind-line glyph + the number n + the text "cold draft (2)" |
| **Whispers** ×m | m curses among the orthogonally adjacent rooms | whisper-mark glyph + m + text |
| **Faint glow** | the relic is within Manhattan distance 2 (not counting this room) | lantern-halo glyph + text |
| **Silence** | none of the above | small calm glyph + text "silence" |

Omens are always shown with **both a glyph and a text label**, never colour alone.

### 4.3 Resources and actions
- **Lantern oil:** a move budget `O`. Each move to an adjacent room costs 1 oil, including revisits. At 0 oil you are stranded, "the dark takes you", which is a death at your current cell.
- **Bones** ×B: throw one into an adjacent unvisited room to test it. You hear a **long fall** (pit), a **shriek** (curse) or **a clatter** (safe). It costs no oil, and the result is recorded on the map.
- **Flare** ×1: reveal the omen counts of all 8 surrounding rooms without entering them. It costs 2 oil.
- **Retreat:** at the entrance you may leave without the relic. You survive with a small score ("lived to tell").

### 4.4 Difficulty by weekday (UTC day)
| Day | Pits P | Curses C | Bones B | Oil slack factor s |
|---|---|---|---|---|
| Mon | 5 | 2 | 3 | 1.8 |
| Tue | 6 | 2 | 3 | 1.6 |
| Wed | 7 | 3 | 2 | 1.5 |
| Thu | 8 | 3 | 2 | 1.4 |
| Fri | *Community Crypt* (approved player-made crypt) or the Thu settings | | | |
| Sat | 9 | 4 | 2 | 1.3 |
| Sun | 10 | 4 | 1 | 1.2 |

Oil budget: `O = ceil(s × L)`, where `L` is the oil a perfect deductive player (the reference solver) needs to collect the relic and return, including flare costs if the solver used the flare.

### 4.5 Fairness guarantee (non-negotiable)
**Every published crypt must be solvable by pure deduction from the entrance, without guessing,** using only:
- the omens from visited rooms,
- the available bones and the flare,
- within the oil budget,
- **assuming no tombstones are visible.** Tombstones only ever make it easier.

The **reference solver** (section 6.2) must prove this before a crypt is published. Crypts must also be **non-trivial**: the solver must need at least `minInferenceSteps` (default 6) non-obvious deductions. Otherwise the generator regenerates.

### 4.6 Tombstones (the community layer)
- When a player dies, a tombstone is placed in **the room where they died**. For a pit or curse death, that's the hazard room. For a stranded death, it's the room where the oil ran out.
- **Tombstones are visible to all later players from the start of their run,** even in darkness: they're lit by a faint ghost light. A tombstone on a hazard room means that room is deadly, so players learn where their predecessors fell.
- **A tombstone shows:**
  - the player's Reddit avatar (snoovatar, or a fallback ghost silhouette)
  - their username (with an option to carve it anonymously as "a nameless soul")
  - the epitaph (60 characters or less, or the default "Here lies one who went east.")
  - the cause: fell, cursed, or stranded.
- **Several deaths in one room** stack into a "grave mound" that shows a count and cycles through the top-voted epitaphs.
- **Live:** when someone dies while you're playing, their tombstone drops into your map with a soft animation and a toast: "u/name fell at C4".

### 4.7 Epitaphs can lie
- An epitaph is free text. It may help ("pit east of the glow") or deceive ("the relic is north, trust me").
- **Only players who finish (escape, retreat or die), and only after the full map is revealed,** can vote on the epitaphs of tombstones they encountered: **True**, **False** or **Just funny**.
- **Reputation:** an author's epitaph score = (true votes − false votes) summed over their life. It drives the flair titles:
  - ≥ +10: **Honest Ghost**
  - ≤ −10: **Trickster**
  - most "funny" votes this week: **Poet of the Crypt**
- **Moderation:** epitaphs pass a local word filter plus Perspective API (`commentanalyzer.googleapis.com`, which is on Devvit's global allowlist; fetch permission must be requested), when available. Moderators can remove any epitaph through a menu action. Reported epitaphs are hidden after N reports, pending moderator review.

### 4.8 Scoring
- **Escape with relic:** `base 1000 + 20 × oilLeft + 60 × bonesLeft + 150 × (flare unused) − 200 × (cursed)`.
- **Pioneer multiplier** (for playing early, with fewer tombstones to help):
  - `m = 1 + 1.0 × e^(−T/8)`, where `T` is the number of tombstones visible at the start of your run
  - so it's about 2.0× with 0 tombstones and approaches 1.0 as the crypt fills
  - final = `round(raw × m)`
- **Retreat without relic:** 150 (no multiplier).
- **Death:** 0. But the tombstone is your legacy, and votes earn reputation.
- **Daily leaderboard:** by score; ties broken by earlier finish time.
- **Weekly leaderboard:** sum of daily scores.
- **Streaks:** consecutive UTC days with an escape (with or without the relic). A death breaks the escape streak but not the **play streak**; both are shown.

### 4.9 One attempt per day, plus practice
- One scored run per user per crypt. Runs resume if the user closes the post mid-run.
- **Practice mode** (no score):
  - yesterday's crypt
  - a fixed tutorial crypt with contextual hints
  - **judges can always play something even after their scored run ends.**

---

## 5. Daily content and community features

- **Daily post:**
  - a scheduler cron at `00:00 UTC` creates today's post with `reddit.submitCustomPost` and a splash screen
  - title format: `Crypt #<n> · <Weekday> · <Crypt name>`
  - **the crypt name** is generated from word pools (for example "The Weeping Vault"), or, when available, honours yesterday's top-voted epitaph author: "The Crypt of u/name"
- **End-of-day summary:** when the next crypt opens, the previous post's splash updates to its final stats, the "most fitting epitaph", and the "first to escape".
- **Sunday Necropolis:** a weekly interactive post (not an image). A scrollable graveyard of the week's 7 crypts with every tombstone, the week's leaderboard, and the titles awarded.
- **Community Crypt Fridays:**
  - players design a crypt in a built-in editor (place the entrance, relic, pits and curses, then name it)
  - **the editor runs the reference solver live** and refuses to submit unfair crypts
  - submissions go to a moderator queue; moderators approve one with a menu action, and it becomes Friday's crypt with the designer credited on the splash
  - the designer gets the flair "Architect"
- **Flair (set by the app with `reddit.setUserFlair`):** shows streak and title, for example `Undying 7 · Honest Ghost`. Users can opt out in settings.
- **Comments:**
  - the result card has an explicit **"Share to comments"** button that posts the emoji summary plus an optional epitaph with `reddit.submitComment({ runAs: 'USER' })`
  - **only on that button press, never automatically, and never merged into a gameplay action** (Devvit's rules for acting as the user)
  - the app also pins a daily discussion comment as the app user, where these result comments go as replies (per the Devvit docs' recommendation)

**Emoji share format (spoiler-free):**
```
Here Lies · Crypt #42 · Thu
🕯️ escaped with the relic · 1,840 pts
oil 6 left · bones 1 · ⚰️ passed 9 graves
🔥 streak 4
```

---

## 6. Algorithms

### 6.1 Seeded generation
- `seed = hash32("here-lies" | subredditId | yyyy-mm-dd | GENERATOR_VERSION)`, using a PRNG such as mulberry32 or sfc32.
- **Generate:**
  1. Place the entrance.
  2. Mark the safe zone (the entrance plus its neighbours).
  3. Place the relic in a cell at Manhattan distance ≥ 4 from the entrance.
  4. Place pits, then curses, uniformly in the remaining cells, rejecting placements that disconnect the relic from the entrance via non-pit cells.
  5. Run the solver.
  6. If it's unsolvable without guessing, or the inference steps are below the minimum, increment a sub-seed and retry (up to 500 tries).
  7. Then compute `L` and the budget.
- **The same inputs must always give the same crypt.** Bump `GENERATOR_VERSION` whenever the generator changes, and never regenerate a past day.

### 6.2 Reference solver (perfect deducer, no guessing)
- **Knowledge state:**
  - for each cell: unknown, safe, pit, curse, or relic-candidate
  - visited cells with their omens
  - bones left, flare used, oil used
  - relic found
- **Each step:**
  1. **Propagate constraints.** For each visited cell with draft count n and whisper count m, apply them as exact-count constraints over its unknown neighbours. The glow is a constraint on the relic's location (within distance 2, or not). Use constraint propagation plus small-scope exhaustive case enumeration over the frontier (bounded, for example ≤ 18 frontier cells), to find cells that are safe or hazardous in **all** consistent assignments.
  2. If a known-safe unvisited cell is reachable through known-safe cells, move to the **nearest** one (BFS distance = oil cost).
  3. Otherwise, if bones are left, throw a bone at the frontier cell that maximises the expected information (or simply the one with the most constraints); treat the result as known.
  4. Otherwise, if the flare is unused, use it where it reveals the most unknown neighbours.
  5. Otherwise: **stuck**, which means guessing would be required, so the crypt is **rejected**.
  6. When the relic's location is determined (or it's found), path to it, then path back to the entrance via known-safe cells.
- **Output:**
  - solvable (boolean)
  - total oil `L`
  - inference step count
  - the bone and flare usage
  - the solution path (for the replay and debugging)
- It must run within 200 ms per crypt in Node and in the browser (it's used live in the editor).

### 6.3 Anti-cheat (server-authoritative)
- **The client never receives the hidden layout during a scored run.**
- Each move, bone, flare or retreat is a `POST /api/act` to the server. The server holds the layout in Redis and returns only what the player may know: the new position, omens, the bone result, oil, status, and any death.
- The full layout is sent only after the run ends, for the reveal and voting.
- Rate-limit each user's actions (for example, ≤ 10 per second).
- Practice crypts may run client-side.

---

## 7. Technical design (Devvit Web)

### 7.1 Platform facts (from the Devvit docs, Nov 2026)
- **Structure:** `src/client` (webview), `src/server` (endpoints), `devvit.json`.
  - Server endpoints are `/api/*`. Scheduler, trigger and menu endpoints are `/internal/*`.
- **Limits:** 30 s per request, 4 MB payload, 10 MB response. **No websockets or streaming**; use Devvit `realtime`.
  - The client CSP blocks external requests; external fetch is **server-side only**, to approved domains.
  - `localStorage` resets on app update.
- **Redis** (`@devvit/redis`):
  - strings, hashes, sorted sets, numbers, bitfields, transactions, expire
  - **no plain sets, no lists, no pipelining, no key scan**
  - data is per installation (per subreddit)
  - 100 MB while unpublished
- **Realtime:** the client uses `connectRealtime({ channel, onMessage })`; the server uses `realtime.send(channel, msg)`. Channel names can't contain `:`.
- **Scheduler:**
  - tasks are declared in `devvit.json`; `scheduler.runJob({ name, runAt | cron, data })`
  - at most 10 live recurring jobs per installation
  - 1-minute resolution
- **Posts:**
  - `reddit.submitCustomPost({ title, subredditName, entry, splash, postData, styles })`
  - splash fields: `appDisplayName, heading, description, buttonLabel, backgroundUri, appIconUri`
  - post height `TALL` (512 px) or `REGULAR` (320 px)
- **User:**
  - `reddit.getCurrentUser()` returns undefined when logged out; show a sign-in prompt and a practice-only mode
  - `reddit.getSnoovatarUrl(username)`
- **Acting as the user:**
  - `permissions.reddit.asUser: ["SUBMIT_COMMENT", "SUBSCRIBE_TO_SUBREDDIT"]`, then pass `runAs: 'USER'`
  - **explicit manual button only**
- **Flair:** `reddit.setUserFlair(...)` (check the option names in the RedditClient reference).
- **HTTP fetch:**
  - `permissions.http.domains` with exact hostnames; approval takes 1 to 2 business days at playtest or upload, so **request early**
  - the README must have a "Fetch Domains" section, and the app needs Terms and Privacy links
- **Rules:**
  - no Reddit branding (Snoo, "REDDIT")
  - delete user data on account deletion (handle the triggers)
  - no training on Reddit data
  - content created by users must be attributed

### 7.2 devvit.json (outline)
```jsonc
{
  "name": "here-lies",
  "post": { "dir": "dist/client", "entrypoints": { "default": { "entry": "splash.html", "height": "tall" }, "game": { "entry": "game.html" } } },
  "server": { "entry": "dist/server/index.js" },
  "permissions": {
    "redis": true, "realtime": true, "media": false,
    "http": { "enable": true, "domains": ["commentanalyzer.googleapis.com"] },
    "reddit": { "enable": true, "asUser": ["SUBMIT_COMMENT", "SUBSCRIBE_TO_SUBREDDIT"] }
  },
  "scheduler": { "tasks": {
    "daily-crypt": { "endpoint": "/internal/cron/daily", "cron": "0 0 * * *" },
    "weekly-necropolis": { "endpoint": "/internal/cron/necropolis", "cron": "5 0 * * 0" }
  } },
  "triggers": { "onAppInstall": "/internal/triggers/install" },
  "menu": { "items": [
    { "label": "Here Lies: create today's crypt now", "location": "subreddit", "forUserType": "moderator", "endpoint": "/internal/menu/create-today" },
    { "label": "Here Lies: review community crypts", "location": "subreddit", "forUserType": "moderator", "endpoint": "/internal/menu/review-ugc" },
    { "label": "Here Lies: remove this epitaph", "location": "post", "forUserType": "moderator", "endpoint": "/internal/menu/remove-epitaph" }
  ] }
}
```
**Verify every key against the current Devvit Web configuration reference before relying on it.**

### 7.3 Server endpoints
| Endpoint | Purpose |
|---|---|
| `GET /api/today` | Crypt meta for this post (number, name, weekday, budget, bones, live stats), the user's run state, tombstones (public), leaderboard top 10 |
| `POST /api/run/start` | Create the run (records `T`, tombstones visible at start) |
| `POST /api/act` | `{ type: "move" | "bone" | "flare" | "retreat", dir?, target? }` → new knowledge, status |
| `POST /api/epitaph` | After death: `{ text, anonymous }` → moderated → saved → `realtime.send` |
| `GET /api/reveal` | After the run ends: the full layout plus every tombstone with its epitaph and votes |
| `POST /api/vote` | `{ tombId, vote: "true" | "false" | "funny" }` (only finishers, one vote per tomb) |
| `POST /api/share` | **Button only:** posts the result comment as the user |
| `GET /api/leaderboard?scope=day|week` | Leaderboards |
| `GET /api/practice/:kind` | Practice crypt (yesterday / tutorial), which may include its layout |
| `POST /api/ugc/submit` | Community crypt submission (re-validated by the server's solver) |
| `/internal/cron/daily` | Generate and post today's crypt; finalise yesterday's stats and splash |
| `/internal/cron/necropolis` | Post the weekly Necropolis |
| `/internal/triggers/install` | Schedule jobs; create the first crypt |
| `/internal/menu/*` | Moderator tools |

### 7.4 Redis keys
```
crypt:{dayId}                hash  { seed, version, layout(json, server only), budget, bones, P, C, name, number, postId, source:"gen|ugc", designer? }
post:{postId}                string dayId
run:{dayId}:{userId}         hash  { status, x, y, oil, bonesLeft, flareUsed, cursed, hasRelic, visited(bitfield or json), knowledge(json), T, startedAt, endedAt, score }
tombs:{dayId}                hash  field tombId -> json { cell, userId?, name?, avatar?, epitaph, cause, ts, removed? }
tombcell:{dayId}:{cell}      zset  member tombId, score ts   (stack order)
votes:{dayId}:{tombId}       hash  { true, false, funny }   + voted:{dayId}:{tombId}:{userId} string (or bitfield)
rep:{userId}                 hash  { score, funny, title }
lb:day:{dayId}               zset  userId -> score
lb:week:{isoWeek}            zset  userId -> score
streak:{userId}              hash  { play, escape, lastPlayDay, lastEscapeDay, best }
stats:{dayId}                hash  { entered, fell, cursed, stranded, escaped, relics }
ugc:queue                    zset  ugcId -> ts
ugc:{ugcId}                  hash  { layout, name, designerId, status }
```
**Data deletion:** on a user-delete trigger (if available) or a documented manual moderator action, remove `userId` fields and the username/avatar from tombstones, keeping an anonymous tomb.

### 7.5 Realtime channels
- `crypt-{dayId}` carries the messages:
  - `{ t: "tomb", tomb }`
  - `{ t: "stats", stats }`
  - `{ t: "escape", name, score }` (for opted-in, non-anonymous players)

### 7.6 Client
- **Stack:** React + TypeScript + Vite (Devvit Web template), plus one `<canvas>` layer for the lantern light, fog and particles. UI is in DOM/SVG. Motion via CSS transitions and transforms (or `motion`), with `prefers-reduced-motion` respected.
- **Screens:**
  1. **Splash (inline, in the feed):**
     - the crypt name, number and weekday difficulty (shown as candles 1 to 6)
     - live counts
     - a "Descend" button
     - your streak, if you've played
  2. **Game:**
     - the grid (fits the viewport on mobile)
     - **lantern light radius = your visited area**
     - unexplored rooms in darkness, with tombstones glowing faintly
     - omens on the current room, large and labelled
     - an oil meter as a dripping lantern, plus bone and flare buttons
     - controls: tap an adjacent room, or arrow keys or WASD
  3. **Death:** a slow fade, then the "Carve your epitaph" input (60 characters or less), with suggestions, an anonymous toggle, and a skip option.
  4. **Reveal and vote:** the full map unfolds, and the tombstones you passed are listed for voting.
  5. **Result card:**
     - score, multiplier, streak, rank
     - the share emoji and a copy button
     - the "Share to comments" button
     - a subscribe prompt
     - "Practice yesterday's crypt"
  6. **Leaderboards** (day and week).
  7. **Editor** (Community Crypts).
  8. **How to play:** first-run contextual hints only; one hint at a time, triggered by situations ("You feel a cold draft. One of the rooms next to you hides a pit.").
- **Mobile first:** most Reddit traffic is mobile. Use a 44 px minimum touch target, no hover-only interactions, and the grid scales to the viewport.

### 7.7 Art direction
- **Look:** hand-inked linocut and woodcut on near-black stone. Bone-white linework, the lantern's warm amber as the only strong colour, a muted moss green for success, and a desaturated rust for danger.
  - This is a deliberate dark theme for a crypt game; the owner's "light mode only" rule is for his websites, not this game.
- **Textures** come from carved-line hatching in SVG (no raster AI art, no stock assets).
- **The tombstones are the signature visual:** each one is slightly different, procedurally assembled from carved shapes, with the epitaph in a hand-cut serif display face (an open-license font) and body text in a readable humanist sans.
- **Motion:**
  - lantern flicker (subtle, and off under reduced motion)
  - tombstones dropping with a soft dust puff
  - the map reveal unfolding room by room
- **Sound:** none by default; an optional toggle could be added later.

### 7.8 Accessibility
- Contrast at least AA (bone-white on stone).
- Omens always have a glyph and a text label.
- Colour-blind-safe danger and success colours.
- Full keyboard play.
- An ARIA live region announces the omens on each move ("Room C4. Cold draft, 1. Faint glow.").
- Reduced-motion mode.
- Never rely on sound.

---

## 8. Repo structure
Built on Reddit's official **devvit-template-react** (Devvit Web 0.15.4: Hono server, React 19, Tailwind 4, Vite 8, TypeScript 6). Keep the template layout; see `.kiro/steering/structure.md` for the full tree.
```
here-lies/
  .kiro/                 steering, specs, hooks, agents, settings (committed)
  docs/BRIEF.md          this file
  docs/KIRO_LOG.md       running log of Kiro usage for the write-up
  src/shared/core/       pure TS game engine: rng, generator, solver, rules engine, scoring, share text (+ *.test.ts with vitest + fast-check)
  src/shared/api.ts      request/response types shared by client and server
  src/client/            React webview: splash (inline), game (expanded), components, hooks
  src/server/            Hono app: routes/api.ts, routes/menu.ts, routes/triggers.ts, routes/cron.ts, repo/ (Redis), moderation
  tools/                 tsconfig project references (from the template)
  devvit.json  package.json  vite.config.ts  vitest.config.ts  eslint.config.js  AGENTS.md
  README.md              game overview, how to play, Fetch Domains, Terms, Privacy links
  LICENSE
```
**The core lives in `src/shared/core` and is imported by both client (practice, editor) and server (authoritative runs), so the rules can never drift apart.**

## 9. Testing

**Property-based tests (fast-check):**
1. **Determinism:** `generate(seedInputs)` is identical across calls and across environments.
2. **Fairness:** every crypt published by the generator is solved by the reference solver without guessing, within the budget.
3. **Safe start:** the entrance and its neighbours are never hazards or the relic.
4. **Omen correctness:** for random layouts, the omen counts equal the actual adjacent hazards.
5. **Oil accounting:** oil is never negative; each move costs exactly 1; the flare costs 2; bones cost 0.
6. **Score monotonicity:** with all else equal, more oil left never gives a lower score, and more visible tombstones never give a higher multiplier.
7. **Server/client agreement:** applying the same action sequence through the core engine gives the same state on both sides.
8. **Editor validity:** any layout the editor accepts is solvable; any it rejects is not (checked against the solver).

**Unit tests:** scoring formula, share text, epitaph filter, streak logic across UTC day boundaries.

**Server tests:** the endpoint handlers with an in-memory Redis fake; anti-cheat (no layout leaks before the run ends).

**Playtest:** in a private test subreddit with `devvit playtest`, then upload, then the public test subreddit (under 200 members).

## 10. Kiro plan (the Kiroween judges score this)
- **Steering:**
  - `product.md`, `tech.md` (section 7.1 platform facts), `structure.md`: always included.
  - `game-rules.md` (always; section 4 verbatim as MUST rules).
  - `art-direction.md` (fileMatch `src/client/**`).
  - `devvit-constraints.md` (fileMatch `src/server/**`, `devvit.json`).
  - `brief.md` (manual, `#[[file:docs/BRIEF.md]]`).
- **Specs, in build order:**
  1. `core-engine` (rng, generator, solver, rules, scoring), with Kiro **Correctness / PBT** for section 9's properties.
  2. `server-api` (endpoints, Redis repo, anti-cheat).
  3. `daily-loop` (scheduler, posts, splash, stats).
  4. `game-client` (screens, lantern canvas, accessibility).
  5. `tombstones-realtime` (death, epitaph, moderation, realtime).
  6. `reveal-and-votes`.
  7. `result-and-sharing` (share card, comment button, flair, streaks, leaderboards).
  8. `community-crypts` (editor, queue, moderator menu).
  9. `necropolis`.
- **Hooks:**
  - On saving `src/shared/core/**`: run the solver over 5,000 seeds and fail if any crypt is unsolvable or slow.
  - After task execution: `vitest run`.
  - On agent stop: type-check, then `devvit` build and config validation.
  - A manual hook: "regenerate README how-to-play from game-rules.md".
- **Custom agents:**
  - `fairness-auditor`: tries to construct unfair crypts and finds solver gaps.
  - `devvit-rules-checker`: reviews the diff against the Devvit Rules (user actions, branding, data deletion).
- **MCP:** GitHub MCP; Playwright MCP for screenshot checks of the client build in the browser at mobile viewport sizes.
- **Log everything in `docs/KIRO_LOG.md`** (specs, hooks firing, PBT counterexamples, decisions).

## 11. Video plans
- **Kiroween (under 3 minutes):**
  1. the hook ("In 1973, Hunt the Wumpus taught a generation to think in the dark. Today, a whole subreddit hunts together.")
  2. a run with omens and deduction
  3. a death, then carving an epitaph
  4. a second account seeing the tombstone drop live
  5. escape, the reveal and the votes
  6. the result card and flair
  7. the editor, and the solver rejecting an unfair crypt
  8. the Kiro story: specs, the PBT fairness proof, hooks
- **Reddit (optional, 1 minute or less):** the core loop only.

## 12. Submission checklists

**Kiroween (Dec 4)**
- [ ] Public repo with the license and `/.kiro` committed
- [ ] Demo post URL works for a logged-in judge
- [ ] Video under 3 minutes
- [ ] Description
- [ ] Kiro write-up
- [ ] Category: Resurrection, plus the student details
- [ ] Blog post and social post
- [ ] Tag `kiroween-submission`

**Reddit (Dec 8)**
- [ ] App uploaded (not published)
- [ ] App listing link
- [ ] Public test subreddit under 200 members, with today's post live and practice available
- [ ] `README.md`: overview, how to play, Fetch Domains, Terms and Privacy
- [ ] Optional 1-minute video
- [ ] Repo link
- [ ] Feedback survey submitted
