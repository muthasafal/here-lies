# Review notes for Kiro

Findings from a review of the setup on 2026-11-25. Fix each one in the spec named next to it, then tick it off.

## Already fixed during the review
- [x] **The scaffold wasn't a real Devvit Web app.** The server was a hand-written `export default { fetch }` object, no `@devvit/*` packages were installed, and the HTML used inline scripts (which Devvit forbids). The project was rebuilt on Reddit's official **devvit-template-react** (Devvit Web 0.15.4, Hono, React 19, Tailwind 4, Vite 8, TypeScript 6). Kiro's original scaffold is preserved in git (commit "Kiro: initial scaffold…").
- [x] The core engine moved from `packages/core` to **`src/shared/core`**, the template's shared folder, so client and server import it directly with no workspace build step. Kiro's `types.ts`, `rng.ts`, `utils.ts` and all 32 tests were kept.
- [x] `rng.ts` and `utils.ts` failed the template's stricter TypeScript (`noUncheckedIndexedAccess`). Fixed without type casts (AGENTS.md forbids them).
- [x] The template's Snoo image and links were removed: Reddit branding isn't allowed in apps.
- [x] `devvit.json` was merged: the template's entrypoints and server block, plus our permissions (redis, realtime, http for Perspective, `asUser` for comments and subscribe), scheduler tasks and install trigger. **The menu items for UGC review and removing epitaphs were taken out until their endpoints exist.** Re-add each one together with its route (AGENTS.md rule).
- [x] `package.json`: repository URL fixed (was `yourusername`), license and author set, and Vitest + fast-check added.
- [x] The steering files had no YAML front matter, so all of them loaded on every request. Added: `art-direction` and `devvit-constraints` are `fileMatch`, `brief` is `manual` (new file), and the rest are `always`. `structure.md` was rewritten for the template layout, and `tech.md` was updated (stack versions, Hono, no path aliases).
- [x] Dates said 2024 (README, KIRO_LOG, tech.md). Corrected to 2026.
- [x] `docs/BRIEF.md` section 8 and the playbook now point at `src/shared/core`.

Current state: `npm run test:types`, `npm test` (32 passing), `npm run build` and `npm run lint` all pass.

## To fix in upcoming specs
1. **`server-api` spec:** replace the template's counter endpoints in `src/server/routes/api.ts` and the `example-form` route in `menu.ts`, and delete `routes/forms.ts` if no forms are used (and remove `forms` from `server/index.ts`).
2. **`daily-loop` spec:**
   - add `src/server/routes/cron.ts`, mounted at `/internal/cron`, for `daily` and `necropolis`
   - make the install trigger create today's crypt (not the template's generic post)
   - set the post title and splash (`submitCustomPost` options).
3. **`tombstones-realtime` spec:** the Perspective API needs a Google Cloud API key stored with Devvit secrets/settings, never in code. The README needs a "Fetch Domains" section, and the app needs Terms and Privacy links (PRIVACY.md and TERMS.md exist; check that they're accurate before submitting).
4. **Kiro features not set up yet** (playbook steps H4 and H5):
   - `.kiro/hooks/` (fairness-sweep, tests-after-task, build-check-on-stop, readme-howto)
   - `.kiro/agents/` (fairness-auditor, devvit-rules-checker)
   - `.kiro/settings/mcp.json`
   These are judged for Kiroween.
5. **Before playtest:** run `npm run dev` (`devvit playtest`) once in your private test subreddit to confirm the template app runs, before building features on it.

## Resume here (paused 2026-11-25)

**State:** Skeleton not started. No Kiro prompts have been sent for Here Lies (0 credits used by this project). The repo is unchanged since commit d62aeb3: template app + core types/rng/utils, 32 tests, playtest installed in r/here_lies_game_dev, placeholder game screen.

**Blocker:** Kiro Free plan credits. 17.63 of 50 were used at pause time, and the pool is shared with Airlock, so neither project can finish on Free. Waiting on Safal to upgrade or get the Kiroween credit grant.

**Next step:** paste the prompt below into Kiro chat in the here-lies window (follow the desktop lock protocol). Review requirements.md, then design.md (it must map every BRIEF feature to a file), then tasks. Then run test:types, lint, test and build, and commit. After that come tooling (H4-H5) and the feature specs in spec-table order.

### Drafted Kiro prompt: architecture-skeleton (verbatim)

````text
New spec: architecture-skeleton. Please create it as a Kiro spec (requirements -> design -> tasks) in .kiro/specs/architecture-skeleton/.

Source of truth: #docs/BRIEF.md (read all of it; never shorten or edit it). Also follow #AGENTS.md, .kiro/steering/*, and docs/REVIEW.md.

Goal: top-down structure before code. Create EVERY file the finished game needs (BRIEF sections 4-9), with real signatures and types but stub bodies, all wired together so the app builds. No game logic yet: later specs (core-engine, server-api, daily-loop, game-client, tombstones-realtime, reveal-and-votes, result-and-sharing, practice-mode, community-crypts, necropolis) fill the stubs.

The skeleton must include:
1. src/shared/core: keep types.ts, rng.ts, utils.ts and their 32 tests unchanged. Add stub modules: generator.ts, solver.ts, knowledge.ts (constraint propagation / frontier enumeration), omens.ts, rules.ts (applyAction for move/bone/flare/retreat), scoring.ts (incl. pioneer multiplier), streaks.ts, share.ts (emoji text), epitaph-filter.ts (local word filter), crypt-names.ts (word pools), difficulty.ts (weekday table), day.ts (dayId/isoWeek/UTC helpers), editor-validate.ts, tutorial.ts (fixed tutorial crypt + hints), index.ts barrel.
2. src/shared/api.ts: every request/response type for every endpoint in BRIEF 7.3, plus realtime message types (7.5).
3. src/server: routes/api.ts (all /api endpoints in 7.3, replacing the template counter endpoints), routes/cron.ts (/internal/cron/daily and /necropolis), routes/menu.ts (create-today, review-ugc, approve-ugc, remove-epitaph; delete the example-form route and forms.ts if unused), routes/triggers.ts (install creates today's crypt; user-delete/data deletion if Devvit supports it), repo/ (one module per Redis key family in BRIEF 7.4, plus repo/keys.ts with typed key builders), services/ (runs, tombstones, votes, leaderboards, streaks, flair, posts/splash, moderation incl. Perspective via Devvit settings, realtime publish, rate-limit, necropolis, ugc). Mount everything in index.ts. Every menu item MUST be in devvit.json with its /internal route; add the Perspective API key as a Devvit secret setting in devvit.json (no real key).
4. src/client: the full React screen and component tree from BRIEF 7.6 (Splash, Game, Death/Epitaph, Reveal and Vote, Result card, Leaderboards, Editor, Practice picker, How-to-play hints) with typed props; components (Grid, Room, Tombstone, GraveMound, OmenBadge, OilLantern meter, ToolBar for bone/flare, LanternCanvas, Toasts, LiveRegion); hooks (useToday, useRun, useRealtime, useKeyboardControls, useReducedMotion, useHints); a typed api client. Keep game logic out of presentational components (hooks/state only) so a later re-skin touches only layout and styling. Placeholder visuals only; real art comes in game-client.
5. Realtime channel helper for crypt-{dayId}.
6. A short doc comment on EVERY exported function describing the logic it will implement and which BRIEF section it comes from. Stubs throw `new Error('not implemented: <spec name>')` or return safe placeholders where the build/UI needs them.

Constraints: Devvit Web 0.15.6 on the template, app name here-lies-game, no type casts, type aliases, named exports, no Reddit branding, runAs USER only from the explicit share button, no real keys.

Done when: npm run test:types, npm run lint, npm test (32 existing tests still pass) and npm run build all pass, and design.md has a table mapping every BRIEF feature to the file(s) that own it. Start with requirements.md and stop for my review.
````
