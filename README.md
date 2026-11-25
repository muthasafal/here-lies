# Here Lies

**A daily haunted-crypt deduction game for Reddit** where every player who dies leaves a tombstone and an epitaph for everyone after them. The whole subreddit hunts the same crypt each day, and the dead light the way.

A revival of *Hunt the Wumpus* (Gregory Yob, 1973), rebuilt as an asynchronous massively multiplayer daily ritual.

## How to Play

Each day at midnight UTC, a new crypt opens. Your goal: deduce your way to the ancient relic and return to the entrance before your lantern runs dry.

### The Basics

- **7×7 grid of rooms.** Move orthogonally (north, south, east, west) through the crypt.
- **One entrance** at the bottom edge. This is also your exit.
- **Hidden hazards:**
  - **Pits:** Step in and you fall to your death.
  - **Curses:** Step in and your lantern drains oil. Survive if you have oil left.
- **The relic:** Step on it to collect it, then return to the entrance to escape.

### What You Sense

Standing in a room, you sense:
- **Cold draft (×n):** n pits in adjacent rooms (0-4)
- **Whispers (×m):** m curses in adjacent rooms (0-4)
- **Faint glow:** The relic is within 2 rooms away (Manhattan distance)
- **Silence:** None of the above

Omens are always shown with both a glyph and text, never colour alone.

### Your Tools

- **Lantern oil:** Each move costs 1 oil. Run out and you're stranded in darkness.
- **Bones (×2-3):** Throw into an adjacent unvisited room to test it. You hear:
  - **Long fall** (pit)
  - **Shriek** (curse)
  - **Clatter** (safe)
- **Flare (×1):** Reveal the omens of all 8 surrounding rooms (costs 2 oil). Sundays have no flare.
- **Retreat:** Leave without the relic from the entrance. You survive with a small score.

### Tombstones: The Dead Light the Way

When a player dies, their **tombstone** appears in that room for all future players. Tombstones are visible even in darkness, lit by a faint ghost light. They show:
- The player's avatar and username (or "a nameless soul" if anonymous)
- Their **epitaph** (up to 60 characters)
- How they died (fell, cursed, or stranded)

**Epitaphs can help or deceive.** After you finish, you vote on the ones you passed: true, false, or just funny. Build your reputation as an Honest Ghost or a Trickster.

### Scoring

- **Escape with the relic:** 1,000 base + bonuses for oil, bones, and flare saved − penalty if cursed
- **Pioneer multiplier:** Play early (fewer tombstones to help) for up to 2× score
- **Retreat without relic:** 150 points
- **Death:** 0 points, but your tombstone and epitaph are your legacy

### Difficulty

Monday is easiest (fewer hazards, more bones). Sunday is brutal (10 pits, 1 bone, no flare). Fridays feature **Community Crypts** designed by players.

### Fairness Guarantee

**Every crypt is solvable by pure deduction, no guessing required.** A reference solver proves this before the crypt is published. Tombstones only make it easier.

## Community Features

- **Daily post:** One crypt per day, everyone plays the same challenge
- **Live tombstones:** See others fall in realtime as you play
- **Reputation:** Earn titles (Honest Ghost, Trickster, Poet of the Crypt) based on epitaph votes
- **Leaderboards:** Daily and weekly rankings
- **Streaks:** Consecutive days escaped
- **Community Crypt Fridays:** Design your own crypt, submit for moderator approval, and see it played by the whole subreddit
- **Sunday Necropolis:** A weekly graveyard celebrating the week's crypts and tombstones

## Installation (Moderators)

1. Install the app from [app listing link]
2. The first crypt will be created automatically
3. Daily crypts post at midnight UTC
4. Use moderator menu items to:
   - Manually create today's crypt
   - Review community crypt submissions
   - Remove inappropriate epitaphs

## Development

Built with [Kiro](https://kiro.dev) during the submission period for Kiroween 2026.

```bash
npm install
npm test              # Run tests
npm run build         # Build client and server
npm run playtest      # Local playtest with Devvit
npm run upload        # Upload to Reddit
```

### Project Structure

- `src/shared/core/` - Pure TypeScript game engine (shared by client and server)
- `src/client/` - React webview (the game UI)
- `src/server/` - Devvit Web API endpoints
- `.kiro/` - Kiro steering, hooks, and configuration

See [docs/BRIEF.md](docs/BRIEF.md) for the complete design specification.

## Fetch Domains

This app requests permission to access the following external domain:

### commentanalyzer.googleapis.com (Perspective API)

**Purpose:** Automated moderation of user-submitted epitaphs to filter toxic, hateful, or abusive content.

**When used:** When a player submits an epitaph (the message carved on their tombstone after death).

**What is sent:** The epitaph text only (up to 60 characters). No usernames, no Reddit data, no game state.

**What is received:** A toxicity score and category flags (severe toxicity, identity attack, profanity, etc.).

**How it's used:** Epitaphs above toxicity thresholds are rejected before saving. This supplements local word filtering and moderator review.

**Privacy:** Perspective API is provided by Jigsaw (a Google subsidiary) under its [Terms of Service](https://support.perspectiveapi.com/s/docs-terms-of-service) and [Privacy Policy](https://support.perspectiveapi.com/s/docs-privacy-policy). The service is on Devvit's global allowlist for content moderation use cases.

Moderators can always remove any epitaph through the moderator menu, and users can report epitaphs for review.

## Terms of Service & Privacy

- [Terms of Service](https://github.com/yourusername/here-lies/blob/main/TERMS.md)
- [Privacy Policy](https://github.com/yourusername/here-lies/blob/main/PRIVACY.md)

## License

Apache-2.0 - see [LICENSE](LICENSE)

Built by Safal Mutha for Kiroween 2026 (Resurrection category) and Reddit's Game of the Day hackathon.

## Hackathon Submissions

- **Kiroween (Resurrection + Best Student Project):** Deadline Dec 4, 2:00 PM PT
- **Reddit Game of the Day:** Deadline Dec 8, 6:00 PM PT

---

*"Here lies one who went east."*
