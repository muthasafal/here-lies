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
1. [x] (done 2026-11-26, Claude Code) **`server-api` spec:** replace the template's counter endpoints in `src/server/routes/api.ts` and the `example-form` route in `menu.ts`, and delete `routes/forms.ts` if no forms are used (and remove `forms` from `server/index.ts`).
2. [x] (done 2026-11-26, Claude Code) **`daily-loop` spec:**
   - add `src/server/routes/cron.ts`, mounted at `/internal/cron`, for `daily` and `necropolis`
   - make the install trigger create today's crypt (not the template's generic post)
   - set the post title and splash (`submitCustomPost` options).
3. [x] (done 2026-11-26, Claude Code; PRIVACY/TERMS corrected) **`tombstones-realtime` spec:** the Perspective API needs a Google Cloud API key stored with Devvit secrets/settings, never in code. The README needs a "Fetch Domains" section, and the app needs Terms and Privacy links (PRIVACY.md and TERMS.md exist; check that they're accurate before submitting).
4. [x] (files written 2026-11-26 by Claude Code in Kiro's documented formats; see KIRO_LOG) **Kiro features not set up yet** (playbook steps H4 and H5):
   - `.kiro/hooks/` (fairness-sweep, tests-after-task, build-check-on-stop, readme-howto)
   - `.kiro/agents/` (fairness-auditor, devvit-rules-checker)
   - `.kiro/settings/mcp.json`
   These are judged for Kiroween.
5. **Before playtest:** run `npm run dev` (`devvit playtest`) once in your private test subreddit to confirm the template app runs, before building features on it.

## Written by Claude Code because Kiro had no credits (2026-11-26)
Kiro's Free plan pool (shared with Airlock) ran out, so with Safal's go-ahead (relayed by the planning session)
Claude Code implemented the logic layers itself. All of it is logged in docs/KIRO_LOG.md.
- `src/shared/core`: generator, solver, knowledge, rules, scoring, streaks, share, day, difficulty, crypt names,
  epitaph filter, editor validation, tutorial. Property tests for all 8 BRIEF 9 properties. `npm run sweep`.
- `src/server`: repo/, services/, routes/ (api, cron, menu, forms, triggers), devvit.json menu/forms/settings.
- `src/client`: lib/api.ts, lib/view-model.ts, hooks/*. **Screens are unstyled placeholders** in
  `screens/Screens.tsx` + `components/Grid.tsx`. Claude Code did NOT design any UI.
- `.kiro/hooks/*.json` (v1 format), `.kiro/agents/*.md`, `.kiro/settings/mcp.json`, `.kiro/specs/game-client/`.

## Resume here (updated 2026-11-26)
**State:** the game is playable end to end with placeholder screens. Green: test:types, lint, 63 tests, sweep (5,000 crypts, 0 unfair), build.

**Exact next step:** when Kiro has credits (upgrade or Kiroween grant), take the desktop lock, focus the here-lies
Kiro window and paste:
```text
Open the spec .kiro/specs/game-client (requirements.md, design.md, tasks.md). It was drafted by Claude Code
while you had no credits; you own all of the UI. Read docs/BRIEF.md sections 3-5 and 7.6-7.8 and
.kiro/steering/art-direction.md, revise requirements and design where you disagree (keep the "Contract"
section), then execute the tasks. The logic in src/shared, src/server, src/client/hooks and src/client/lib is
done and tested: do not change its behaviour. Replace the placeholder screens/Screens.tsx and
components/Grid.tsx with your designed screens. Run npm run test:types, lint, test and build after each task.
```
Then review each phase doc, verify, commit, push, add a KIRO_LOG entry and a screenshot in docs/kiro-shots/.

**For Safal (never done by Claude):**
- `devvit upload` (Reddit GotD needs the app uploaded, NOT published) — run `npm run deploy`.
- Optional secret: `npx devvit settings set perspectiveApiKey` (Google Cloud key for Perspective API).
- HTTP domain approval for commentanalyzer.googleapis.com is requested at upload; allow 1-2 business days.
- Make the public test subreddit (under 200 members) and install the app there for the Reddit submission.
