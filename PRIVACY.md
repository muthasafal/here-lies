# Privacy Policy

**Last updated:** December 2024

## What We Collect

Here Lies stores the following data to operate the game:

### Reddit User Data
- **Reddit username** (to attribute tombstones and epitaphs, unless anonymous)
- **Reddit user ID** (to track your runs, scores, and streaks)
- **Reddit avatar URL** (to display on your tombstone, via Reddit's API)

### Game Data
- Your runs (position, moves, oil, status) stored in Redis during active play
- Your scores, streaks, and leaderboard rankings
- Tombstones you create (location, epitaph, cause of death)
- Votes you cast on epitaphs (true/false/funny)
- Community crypts you submit (layout, name)

### Automatically Collected
- Timestamps of your actions (to calculate leaderboard ties, pioneer multiplier, etc.)

## How We Use Your Data

- **To operate the game:** Track your progress, calculate scores, display tombstones
- **To display leaderboards:** Show usernames and scores (opt-out available via settings)
- **To set flair:** Update your subreddit flair with streak and titles (opt-out available)
- **To moderate content:** Filter epitaphs through Perspective API (see below)

## Third-Party Services

### Perspective API (commentanalyzer.googleapis.com)

When you submit an epitaph, the text (up to 60 characters) is sent to Perspective API for automated toxicity detection.

**What is sent:** Epitaph text only. No username, no user ID, no other game data.

**Purpose:** Filter toxic, hateful, or abusive epitaphs before they're shown to other players.

**Provider:** Jigsaw (a Google subsidiary)

**Their policies:**
- [Perspective API Terms](https://support.perspectiveapi.com/s/docs-terms-of-service)
- [Perspective API Privacy](https://support.perspectiveapi.com/s/docs-privacy-policy)

We do not control Perspective API's data practices. Refer to their policies for details.

## Data Sharing

- **We do not sell your data.**
- **We do not share your data with third parties** except Perspective API as described above.
- Your epitaphs and tombstones are visible to all players in the subreddit (this is core to the game).
- Leaderboards show usernames and scores publicly.

## Data Retention

- **Active data:** Stored in Redis (per-subreddit) while you play.
- **Historical data:** Tombstones, scores, and streaks persist indefinitely for game continuity.
- **Account deletion:** When you delete your Reddit account, we anonymize your data (tombstones become "a nameless soul," username/avatar removed).

## Your Rights

- **Opt out of flair updates:** Available in app settings.
- **Anonymous epitaphs:** Choose "anonymous" when carving your epitaph.
- **Report content:** Use Reddit's reporting system or moderator tools.
- **Account deletion:** Delete your Reddit account to trigger data anonymization.

## Data Security

- All data is stored in Devvit's Redis (managed by Reddit).
- We use server-authoritative design to prevent cheating (no hidden data sent to clients).
- Rate limiting prevents abuse.

## No Training on Reddit Data

We do not use Reddit content to train machine learning models. We comply with Reddit's Developer Terms prohibiting such use.

## Children's Privacy

Here Lies is intended for general audiences. We do not knowingly collect data from children under 13. If you believe a child's data was collected, contact us immediately.

## Changes to This Policy

We may update this policy. We'll notify users through the app or subreddit when significant changes occur.

## Contact

Questions? Contact the developer via the [GitHub repository](https://github.com/yourusername/here-lies) or Reddit modmail in the subreddit where the app is installed.

## Reddit's Policies

This app is subject to [Reddit's Privacy Policy](https://www.reddit.com/policies/privacy-policy) and [Developer Terms](https://support.reddithelp.com/hc/en-us/articles/14859770712852-Developer-Terms).
