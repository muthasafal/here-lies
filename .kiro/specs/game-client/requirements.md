# Requirements: game-client (UI)

> Drafted by Claude Code on 2026-11-26 for **Kiro to review, revise and build**. The game logic,
> server and client controller already exist and are tested; this spec covers ONLY the visual
> layer: layout, components, art direction, copy, motion and accessibility. Kiro owns every
> design decision here. Source of truth: `docs/BRIEF.md` sections 3, 4, 5, 7.6, 7.7, 7.8, and
> `.kiro/steering/art-direction.md`.

## Context
The current screens in `src/client/screens/Screens.tsx` and `src/client/components/Grid.tsx`
are unstyled placeholders that prove the game works end to end. Replace them. Do not change the
controller contract: `useGame()` (hooks/useGame.ts), `useEditor()`, `useHints()`,
`useKeyboardControls()`, `useReducedMotion()`, `useRealtime()` and `lib/view-model.ts`
(`buildGrid`, `moundOrder`, `announce`, `oilFraction`). Presentational components take props only;
no fetches and no game rules inside them (a later re-skin must touch layout and styling only).

## Requirements (EARS)

### R1 Splash (inline, in the feed)
1. The splash SHALL show the crypt name, number and weekday, the difficulty as 1 to 6 candles,
   live counts ("214 entered, 131 fell, 52 escaped"), the player's streak when they have one,
   and a Descend button, within the 320 to 512 px post height.
2. WHEN the crypt is closed, the splash SHALL show its final summary (first to escape, most fitting
   epitaph) and the button SHALL read "Practice this crypt".
3. WHEN the post is a Necropolis post, the splash SHALL present the week's graveyard instead.
4. The splash SHALL stay light: no canvas, no heavy dependencies (it loads in the feed).

### R2 Game screen
1. The grid SHALL fit the viewport on a 375 x 667 phone without scrolling, with every room at
   least 44 px.
2. The lantern light radius SHALL equal the visited area: visited rooms and their neighbours lit,
   everything else in darkness; tombstones glow faintly even in darkness.
3. WHEN the player stands in a room, its omens SHALL be shown large, each with a glyph AND a text
   label (cold draft n, whispers m, faint glow, silence), never colour alone.
4. The oil meter SHALL be a dripping lantern showing oil left of the budget; bones and the flare
   SHALL be buttons with their counts and costs.
5. WHEN the player taps an adjacent room, or presses arrows/WASD, the player SHALL move
   (`g.act({type:'step'|'move'})`). Bone mode: tap an adjacent unvisited room (`cell.canBone`).
6. WHILE a request is in flight (`g.busy`), input SHALL be ignored without flicker.
7. Contextual hints SHALL appear one at a time from `useHints` and be dismissible.
8. WHEN a realtime tombstone arrives, it SHALL drop into the map with a soft dust puff and a
   toast "u/name fell at C4" (`deathToast`), and the live counts SHALL update.

### R3 Tombstones (the signature visual)
1. Each tombstone SHALL be procedurally varied (shape assembled from carved SVG parts, seeded by
   its id) and show avatar or ghost silhouette, name or "a nameless soul", epitaph and cause.
2. Several tombs in one room SHALL form a grave mound with a count that cycles through epitaphs
   in `moundOrder` (most "true" votes first).
3. Removed or hidden epitaphs SHALL show "The words were scraped away."

### R4 Death and epitaph
1. WHEN a scored run dies, the screen SHALL fade slowly, then offer "Carve your epitaph"
   (60 chars, counter, suggestions, anonymous toggle, Skip), calling `g.carve(text, anonymous)`
   and showing the returned error inline.

### R5 Reveal and vote
1. The full map SHALL unfold room by room (instant under reduced motion), marking pits, curses,
   the relic, tombstones and the solver's perfect path.
2. Tombs the player passed SHALL be listed for True / False / Just funny, plus Report.

### R6 Result card
1. One clear result card SHALL show the outcome, score with the pioneer multiplier, rank, escape
   and play streaks, the spoiler-free share block with Copy, and the explicit buttons
   "Share to comments" and "Subscribe" (these MUST stay explicit button presses), "Practice
   yesterday's crypt", and the Quiet mode toggle.

### R7 Other screens
1. Leaderboards (day / week tabs, own rank). 2. Practice picker (tutorial, yesterday, random, this
   closed crypt). 3. Crypt editor with tool palette, the live solver verdict and Submit.
4. Necropolis: scrollable graveyard of the week with tombs, the week leaderboard and titles.
5. How to play: short, and links into the Teaching Crypt.

### R8 Accessibility and motion
1. Contrast at least WCAG AA; colour-blind-safe danger (desaturated rust) and success (moss).
2. Full keyboard play; visible focus; the ARIA live region (`g.live`) announces each move.
3. Respect `prefers-reduced-motion` (`useReducedMotion`): no flicker, no drop, no unfold.
4. No hover-only interactions; never rely on sound.

### R9 Art direction
1. Hand-inked linocut/woodcut on near-black stone, bone-white linework, lantern amber as the only
   strong colour (see art-direction.md). SVG hatching textures, no raster AI art or stock assets.
2. Epitaphs in an open-license hand-cut serif display face; body in a readable humanist sans.
3. No Reddit branding (no Snoo, no logos, no karma jokes).
