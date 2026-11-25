/**
 * Typed Redis key builders (BRIEF 7.4). Data is per installation (per subreddit).
 * Devvit Redis has no plain sets, lists or key scans, so indexes are sorted sets and hashes.
 */

export const keys = {
  /** hash: seed, version, layout(json, server only), budget, bones, P, C, name, number, postId, source, designer, ... */
  crypt: (dayId: string) => `crypt:${dayId}`,
  /** zset: dayId -> day start ms. Index of every crypt ever generated. */
  cryptIndex: () => 'crypts',
  /** hash: kind ('crypt' | 'necropolis'), ref (dayId or isoWeek). */
  post: (postId: string) => `post:${postId}`,
  /** hash: state(json), meta(json). */
  run: (dayId: string, userId: string) => `run:${dayId}:${userId}`,
  /** hash: tombId -> json tomb. */
  tombs: (dayId: string) => `tombs:${dayId}`,
  /** zset: tombId -> ts (stack order in one room). */
  tombCell: (dayId: string, cell: number) => `tombcell:${dayId}:${cell}`,
  /** hash: true, false, funny. */
  votes: (dayId: string, tombId: string) => `votes:${dayId}:${tombId}`,
  /** string: the vote a user cast on a tomb. */
  voted: (dayId: string, tombId: string, userId: string) => `voted:${dayId}:${tombId}:${userId}`,
  /** hash: userId -> report count for a tomb's epitaph. */
  reports: (dayId: string, tombId: string) => `reports:${dayId}:${tombId}`,
  /** hash: score, funny, architect, name. */
  rep: (userId: string) => `rep:${userId}`,
  /** zset: userId -> funny votes this ISO week (Poet of the Crypt). */
  poets: (isoWeek: string) => `poets:${isoWeek}`,
  /** zset: userId -> score with an earlier-finish tiebreak in the fraction. */
  lbDay: (dayId: string) => `lb:day:${dayId}`,
  /** zset: userId -> summed daily scores. */
  lbWeek: (isoWeek: string) => `lb:week:${isoWeek}`,
  /** hash: data(json Streak). */
  streak: (userId: string) => `streak:${userId}`,
  /** hash: name, avatar, quiet. */
  user: (userId: string) => `user:${userId}`,
  /** hash: entered, fell, cursed, stranded, escaped, retreated, relics, firstEscape. */
  stats: (dayId: string) => `stats:${dayId}`,
  /** zset: ugcId -> submitted ts (pending moderator review). */
  ugcQueue: () => 'ugc:queue',
  /** zset: ugcId -> approved ts (waiting for a Friday). */
  ugcApproved: () => 'ugc:approved',
  /** hash: layout(json), name, designerId, designer, status, ts. */
  ugc: (ugcId: string) => `ugc:${ugcId}`,
  /** string counter used for ids. */
  seq: (name: string) => `seq:${name}`,
  /** string counter per user per second (rate limit). */
  rate: (userId: string, second: number) => `rate:${userId}:${second}`,
  /** hash: week -> postId for Necropolis posts. */
  necropolis: () => 'necropolis:posts',
} as const;
