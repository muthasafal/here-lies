# Design: game-client (UI)

> Drafted by Claude Code as a starting point. **Kiro owns this design**: rewrite any part of the
> visual design below. Only the "Contract" section is fixed, because the tested logic depends on it.

## Contract (fixed)
- Entry: `src/client/game.tsx` renders `<App/>`, which calls `useGame()` once and routes on
  `g.screen` ('home' | 'play' | 'death' | 'reveal' | 'result' | 'leaderboard' | 'practice' |
  'editor' | 'necropolis' | 'howto'), and keeps the `aria-live` region with `g.live`.
- Controller (`GameController` from hooks/useGame.ts): `today`, `init`, `session`, `tombs`,
  `stats`, `reveal`, `busy`, `notice`, `live`, and actions `descend`, `act`, `carve`,
  `openReveal`, `vote`, `report`, `copyShare`, `shareToComments`, `subscribe`, `setQuiet`,
  `startPractice`, `backToToday`, `go`, `refresh`.
- View-model: `buildGrid({state, entrance, tombs, layout?, solverPath?})` returns 49 `CellView`s
  with `isCurrent`, `visited`, `adjacent`, `canBone`, `lit`, `omens`, `bone`, `tombs`, `content`,
  `onSolverPath`, `ariaLabel`. Render from these fields only.
- Splash: `src/client/splash.tsx`, reads `/api/today` (`InitResponse`), opens the game with
  `requestExpandedMode(e.nativeEvent, 'game')`.

## Proposed component tree (Kiro may change)
```
App
├─ HomeScreen        CryptHeader, CandleRow, LiveCounts, StreakBadge, DescendButton, NavRow
├─ PlayScreen        HUD(OilLantern, BoneButton, FlareButton, RetreatButton), OmenPanel,
│                    CryptGrid(Room × 49, TombstoneMarker, GraveMound), LanternCanvas, HintCard
├─ DeathScreen       FadeVeil, EpitaphForm(SuggestionChips, AnonymousToggle)
├─ RevealScreen      CryptGrid(revealed), VoteList(VoteRow)
├─ ResultScreen      ResultCard(ScoreBreakdown, Streaks, ShareBlock, ShareButtons, QuietToggle)
├─ LeaderboardScreen Tabs, LeaderList
├─ PracticeScreen    PracticeCards
├─ EditorScreen      ToolPalette, CryptGrid(edit), VerdictPanel, NameField, SubmitButton
├─ NecropolisScreen  DayGraveyard × 7, WeekLeaders, TitleRoll
└─ HowToScreen
Shared: Tombstone (procedural SVG), OmenGlyph (wind lines, whisper marks, lantern halo, calm),
        Toasts, Button, Sheet
```

## Visual notes (suggestions)
- `LanternCanvas`: one `<canvas>` under the grid for light radius, fog and dust; draw lit cells from
  `CellView.lit`; flicker off under reduced motion.
- Tombstone variety: seed a tiny RNG with the tomb id (use `SeededRNG` + `hashSeed` from core) to
  pick head shape, cracks, moss and lean.
- Typography: an open-license carved serif for epitaphs and headings; a humanist sans for body.
- Tokens in `index.css` with Tailwind 4 `@theme`: stone, bone, amber (lantern), moss (success),
  rust (danger).
