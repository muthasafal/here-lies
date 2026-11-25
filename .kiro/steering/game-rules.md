---
inclusion: always
---
# Game Rules (MUST Constraints)

These are the precise, non-negotiable rules of Here Lies. Any implementation that violates these rules is incorrect.

## The Crypt

**MUST:**
- Be a 7×7 grid of rooms, indexed `(x, y)` with `0 ≤ x, y ≤ 6`
- Support orthogonal movement only (no diagonals)
- Have exactly one entrance on the bottom edge (`y = 6`), chosen by the seed
- Use the entrance as both entry and exit
- Contain exactly 1 relic (the goal)
- Contain exactly P pits (instant death)
- Contain exactly C curses (drain oil, survive if oil remains)
- **Never place hazards or the relic in the entrance or its orthogonal neighbours**
- **Never place hazards or the relic at the same coordinates**

## Omens

**MUST:**
- Show "cold draft ×n" where n = number of pits in orthogonally adjacent rooms (0-4)
- Show "whispers ×m" where m = number of curses in orthogonally adjacent rooms (0-4)
- Show "faint glow" if the relic is within Manhattan distance ≤ 2 (not counting the current room)
- Show "silence" if none of the above apply
- **Always display both a glyph and a text label, never rely on colour alone**
- Be computed from the current room, not from adjacent rooms

## Resources and Actions

**MUST:**
- Start with oil budget O, bones count B, and 1 flare (or 0 on Sunday)
- Cost exactly 1 oil per move to an adjacent room (including revisits)
- Cost 0 oil per bone throw
- Cost 2 oil per flare use
- Throw bones only to adjacent unvisited rooms
- Return exactly one of: "long fall" (pit), "shriek" (curse), or "clatter" (safe)
- Flare reveals omen counts of all 8 surrounding rooms (orthogonal + diagonal) without entering
- Retreat only from the entrance, only before collecting the relic
- **Never allow oil to go negative**
- **Strand the player (death) when oil reaches 0 before returning to the entrance**

## Difficulty by Weekday

**MUST use UTC day for difficulty selection.**

| Day | P (pits) | C (curses) | B (bones) | s (slack) | curseDrain |
|-----|----------|------------|-----------|-----------|------------|
| Mon | 5        | 2          | 3         | 1.8       | 5          |
| Tue | 6        | 2          | 3         | 1.6       | 5          |
| Wed | 7        | 3          | 2         | 1.5       | 5          |
| Thu | 8        | 3          | 2         | 1.4       | 5          |
| Fri | Community or Thu settings | | | | 5 |
| Sat | 9        | 4          | 2         | 1.3       | 5          |
| Sun | 10       | 4          | 1         | 1.2       | 5          |

**Oil budget formula:** `O = ceil(s × L)` where L = oil needed by the reference solver to collect the relic and return.

## Fairness Guarantee (Non-Negotiable)

**MUST:**
- Every published crypt be solvable by pure deduction from the entrance
- Never require guessing
- Be solvable using only: visited omens, bones, flare, within the oil budget
- **Be solvable assuming zero tombstones are visible** (tombstones only make it easier)
- Be proven solvable by the reference solver before publication
- Require at least `minInferenceSteps` (default 6) non-obvious deductions
- Reject crypts that fail these criteria and regenerate (up to 500 attempts)

## Tombstones

**MUST:**
- Place a tombstone in the room where the player died
- For pit/curse death: place at the hazard coordinates
- For stranded death: place at the last room before oil ran out
- Show tombstones to all later players from the start of their run
- Show tombstones even in darkness (faint ghost light)
- Display: avatar (or fallback), username (or "a nameless soul"), epitaph (≤60 chars), cause
- Stack multiple deaths in one room as a "grave mound" with count
- Support live tombstone drops with realtime updates
- **Never show tombstones to players who started their run before the death occurred**

## Epitaphs

**MUST:**
- Accept free text up to 60 characters
- Allow anonymous posting ("a nameless soul")
- Moderate through local filter + Perspective API (when available) + moderator actions
- **Never automatically post epitaphs; require explicit player confirmation**
- Allow voting (true/false/funny) only by players who finished their run
- Allow voting only on tombstones the player encountered
- Hide epitaphs after N reports, pending moderator review

## Scoring

**MUST calculate exactly:**

**Escape with relic:**
```
raw = 1000 + 20×oilLeft + 60×bonesLeft + 150×(flare unused ? 1 : 0) − 200×(cursed ? 1 : 0)
m = 1 + 1.0 × exp(−T/8)   where T = tombstones visible at run start
final = round(raw × m)
```

**Retreat without relic:** 150 (no multiplier)

**Death:** 0

**MUST:**
- Break leaderboard ties by earlier finish time
- Count streaks using UTC day boundaries
- Break escape streak on death, but not play streak
- Support both daily and weekly leaderboards

## One Attempt Per Day

**MUST:**
- Allow exactly one scored run per user per crypt (per UTC day)
- Resume runs if the user closes the post mid-run
- **Never reset or allow retries of scored runs**
- Allow unlimited practice runs (yesterday's crypt, tutorial, post-completion)

## Seeded Generation

**MUST:**
- Use seed = `hash32("here-lies" | subredditId | yyyy-mm-dd | GENERATOR_VERSION)`
- Use a deterministic PRNG (mulberry32 or sfc32)
- **Always produce the same crypt for the same inputs**
- Never regenerate a past day
- Bump GENERATOR_VERSION when the generator changes

## Anti-Cheat (Server-Authoritative)

**MUST:**
- **Never send the hidden layout to the client during a scored run**
- Process all moves, bones, flares on the server
- Return only observable information: position, omens, bone results, oil, status
- Send the full layout only after the run ends (death, escape, or retreat)
- Rate-limit actions (e.g., ≤10 per second per user)
- Allow client-side practice crypts (they don't affect scores)

## Accessibility

**MUST:**
- Maintain at least WCAG AA contrast (bone-white on stone)
- Show omens with both glyph and text, never colour alone
- Support full keyboard navigation
- Provide ARIA live region announcing omens on each move
- Respect `prefers-reduced-motion`
- Never rely on sound alone

## Devvit Rules Compliance

**MUST:**
- Never auto-post on behalf of users; require explicit button press
- Delete user data on account deletion (tombstones become anonymous)
- Never train on Reddit data
- Attribute user-created content (epitaphs, community crypts)
- Never use Reddit branding (Snoo, "REDDIT" wordmark)
- Request and document all HTTP fetch domains in README
- Include Terms of Service and Privacy Policy links
