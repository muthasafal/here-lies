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
