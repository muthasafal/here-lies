# Devvit Constraints

Applied to: `src/server/**`, `devvit.json`

These are hard constraints from the Devvit Web platform that the implementation **must** respect.

## Request Limits

- **Timeout:** 30 seconds per request. After that, the request is killed.
- **Payload size:** 4 MB maximum for requests, 10 MB for responses.
- **No streaming or websockets.** Use Devvit `realtime` for live updates instead.

## Redis Limitations

**Available:**
- Strings, hashes, sorted sets, numbers, bitfields
- Transactions (`multi` / `exec`)
- Expire (TTL)

**Not available:**
- Plain sets (use sorted sets with dummy scores)
- Lists (use sorted sets with timestamps as scores)
- Pipelining (use transactions instead)
- Key scan (pre-define key patterns; never iterate)

**Data scope:** Per installation (per subreddit). No cross-subreddit queries.

**Storage limit:** 100 MB while unpublished.

## Realtime Channels

- Client: `connectRealtime({ channel, onMessage })`
- Server: `realtime.send(channel, message)`
- **Channel names cannot contain `:` (colon).** Use `-` or `_` as separators.

## Scheduler

- **Cron resolution:** 1 minute minimum. `cron: "0 0 * * *"` for daily at midnight UTC.
- **Recurring jobs limit:** At most 10 live recurring jobs per installation.
- **Declaration:** Tasks must be declared in `devvit.json` with an endpoint path.
- **Execution:** Use `scheduler.runJob({ name, cron, data })` to schedule.

## HTTP Fetch (External APIs)

- **Server-side only.** The client cannot fetch external URLs due to CSP.
- **Requires approval:** Add exact hostnames to `permissions.http.domains` in `devvit.json`. Approval takes 1-2 business days during playtest or upload.
- **Domains we need:**
  - `commentanalyzer.googleapis.com` (Perspective API for epitaph moderation)
- **README requirement:** A "Fetch Domains" section explaining each domain's purpose and usage.

## User Actions (Acting as the User)

**Rules:**
- Requires `permissions.reddit.asUser: ["SUBMIT_COMMENT", "SUBSCRIBE_TO_SUBREDDIT"]` in `devvit.json`.
- Pass `runAs: 'USER'` to the Reddit API call (e.g., `reddit.submitComment({ ..., runAs: 'USER' })`).
- **Must be triggered by an explicit manual button press,** never automatically, and never merged into another gameplay action.
- **Our use case:** The "Share to comments" button on the result card. It posts the emoji summary plus the player's epitaph (if they died) as a comment.

## LocalStorage

- **Resets on every app update.** Use Redis for any persistent state.
- Safe for ephemeral UI state (theme toggle, dismissed hints) but expect it to be cleared.

## Post Configuration

- **Custom post entrypoints:**
  - `default`: The splash screen (shown inline in the feed)
  - `game` (or any other name): Additional entrypoints for the game itself
- **Post height:** `TALL` (512px) or `REGULAR` (320px). We use `TALL` for the splash.
- **Splash fields:**
  - `appDisplayName`: "Here Lies"
  - `heading`: The crypt name
  - `description`: Live stats and difficulty
  - `buttonLabel`: "Descend"
  - `backgroundUri`, `appIconUri`: Optional custom images

## Content and Moderation Rules

**Must comply:**
- **No Reddit branding:** Never use Snoo or the "REDDIT" wordmark in the app UI.
- **Data deletion:** When a user deletes their account, remove their personal data (username, avatar) from tombstones and runs. The tombstone remains, but anonymized.
- **No training on Reddit data:** We do not use Reddit content to train models.
- **Attribution:** User-created content (epitaphs, community crypts) must be attributed to the creator (or marked anonymous if they chose that).

## Flair

- **Set with:** `reddit.setUserFlair({ subredditName, username, text, cssClass })`
- **Format:** Text-based flair with optional CSS class. We use: "Undying 7 · Honest Ghost" (streak + title).
- **Opt-out:** Provide a settings toggle to disable flair updates.

## Menu Items

- **Declaration:** In `devvit.json`, under `menu.items`.
- **Fields:**
  - `label`: The menu item text
  - `location`: "subreddit" or "post"
  - `forUserType`: "moderator" (restricts to mods)
  - `endpoint`: The internal endpoint path
- **Our menu items:**
  - "Here Lies: create today's crypt now" (subreddit, moderator, manual trigger)
  - "Here Lies: review community crypts" (subreddit, moderator, UGC queue)
  - "Here Lies: remove this epitaph" (post, moderator, epitaph moderation)

## Triggers

- **onAppInstall:** Fired once when the app is installed. Use it to schedule recurring jobs and optionally create the first crypt.
- **onAccountDelete (if available):** Fired when a user deletes their Reddit account. Use it to anonymize their data.
- **Declaration:** In `devvit.json`, under `triggers`.

## File Structure

- **Client build output:** `dist/client/` with HTML entrypoints and bundled assets.
- **Server build output:** `dist/server/index.js` (single file, all server code).
- **Configuration:** `devvit.json` at the root.
- **Upload:** `devvit upload` reads `devvit.json` and the `dist/` outputs.

## Development and Deployment

- **Local playtest:** `devvit playtest` spins up a local server and opens a test subreddit.
- **Upload:** `devvit upload` deploys to Reddit's infrastructure. The app is **uploaded, not published** (it's not in the app directory; judges access it via a direct link).
- **Demo post:** Create a demo post in a **public test subreddit with under 200 members** (Reddit hackathon requirement).

## Rate Limiting

- **Redis operations:** No hard limit documented, but avoid tight loops. Batch operations in transactions.
- **API calls:** Rate-limit user actions (e.g., ≤10 moves per second) to prevent abuse.
- **Scheduler jobs:** 1-minute resolution means daily jobs run at most once per minute.

## Logging and Debugging

- **Console logs:** Available during `devvit playtest`. Use `console.log`, `console.error`.
- **Production:** Logs are not accessible after upload. Build robust error handling and return meaningful error responses to the client.

## Edge Cases

- **Logged-out users:** `reddit.getCurrentUser()` returns `undefined`. Show a sign-in prompt and allow practice-only mode.
- **Post data persistence:** Store the `postId` in Redis to link back to the crypt. The post itself is immutable after creation (you can't edit the custom post content, only the splash via an update).
- **Splash updates:** Use `reddit.updateCustomPost({ postId, splash })` to update the splash after the crypt ends (final stats, epitaph highlights).

## Security

- **Never send the hidden crypt layout to the client during a scored run.** The server holds the layout in Redis and returns only observable information (position, omens, bone results, oil remaining).
- **Validate all inputs:** Treat every client request as untrusted. Check bounds, oil availability, and state transitions on the server.
- **Epitaph moderation:** Filter locally, then call Perspective API (if available), then allow moderator overrides.
