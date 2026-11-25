/**
 * Server-authoritative game flow (BRIEF 4, 6.3, 7.3): today's view, starting a run, acting,
 * finishing (score, stats, leaderboards, streaks, flair, tombstone), carving an epitaph,
 * the reveal, votes, reports and sharing. The client never sees the layout mid-run.
 */

import type {
  ActResponse,
  InitResponse,
  MyRun,
  PracticeKind,
  PracticeResponse,
  PublicTomb,
  RevealResponse,
  RunResult,
  ShareResponse,
  TodayResponse,
  ViewerInfo,
  VoteCounts,
} from '../../shared/api';
import { cryptChannel } from '../../shared/api';
import { addDays, dayIdOf, isoWeek, WEEKDAY_SHORT, weekdayOf } from '../../shared/core/day';
import { difficultyFor } from '../../shared/core/difficulty';
import { generate } from '../../shared/core/generator';
import { neighbours } from '../../shared/core/layout';
import type { Action, RunState } from '../../shared/core/rules';
import { applyAction, startRun } from '../../shared/core/rules';
import { scoreRun } from '../../shared/core/scoring';
import { shareText } from '../../shared/core/share';
import { currentStreak, updateStreak } from '../../shared/core/streaks';
import { TUTORIAL_CONFIG, TUTORIAL_LAYOUT } from '../../shared/core/tutorial';
import type { VoteType } from '../../shared/core/types';
import { recordDay, recordWeek, rankOf, topDay } from '../repo/boards';
import type { CryptRecord } from '../repo/crypts';
import { bumpStat, getCrypt, getLayout, getPostRef, getStats, setFirstEscape } from '../repo/crypts';
import { keys } from '../repo/keys';
import { addRep, getProfile, getRep, getStreak, saveProfile, saveStreak, titleFor, weeklyPoet } from '../repo/players';
import type { RunRecord } from '../repo/runs';
import { createRun, getRun, saveRun } from '../repo/runs';
import type { Store } from '../repo/store';
import type { TombRecord } from '../repo/tombs';
import { castVote, getMyVote, getTomb, getVotes, listTombs, report, saveTomb, toPublic } from '../repo/tombs';
import { nextId } from '../repo/ugc';
import { cryptInfo, finalSummary } from './daily';
import { moderateEpitaph } from './moderation';
import type { Platform } from './platform';

export type Viewer = { userId: string | null; username: string | null };
export type Ctx = { db: Store; p: Platform; viewer: Viewer; now: number };

export class GameError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 401 | 403 | 404 | 409 | 429 = 400,
  ) {
    super(message);
  }
}

export const RATE_LIMIT_PER_SECOND = 10;
export const REPORTS_TO_HIDE = 3;

function requireUser(ctx: Ctx): { userId: string; username: string } {
  if (!ctx.viewer.userId || !ctx.viewer.username) throw new GameError('Sign in to play the daily crypt.', 401);
  return { userId: ctx.viewer.userId, username: ctx.viewer.username };
}

async function viewerInfo(ctx: Ctx): Promise<ViewerInfo> {
  if (!ctx.viewer.userId) return { loggedIn: false, name: null, quiet: false };
  const prof = await getProfile(ctx.db, ctx.viewer.userId);
  return { loggedIn: true, name: ctx.viewer.username, quiet: prof?.quiet ?? false };
}

async function publicTombs(db: Store, dayId: string): Promise<PublicTomb[]> {
  const tombs = await listTombs(db, dayId);
  return Promise.all(tombs.map(async (t) => toPublic(t, await getVotes(db, dayId, t.id))));
}

async function cryptForPost(ctx: Ctx, postId: string | undefined): Promise<CryptRecord> {
  if (!postId) throw new GameError('Open a Here Lies post to play.', 404);
  const ref = await getPostRef(ctx.db, postId);
  if (!ref || ref.kind !== 'crypt') throw new GameError('This post has no crypt.', 404);
  const rec = await getCrypt(ctx.db, ref.ref);
  if (!rec) throw new GameError('This crypt has crumbled.', 404);
  return rec;
}

function myRun(r: RunRecord | null): MyRun | null {
  if (!r) return null;
  return { state: r.state, tombstonesAtStart: r.meta.tombstonesAtStart, result: r.meta.result ?? null };
}

/** GET /api/today: everything the splash and game screens need for this post. */
export async function today(ctx: Ctx, postId: string | undefined): Promise<InitResponse> {
  const viewer = await viewerInfo(ctx);
  const ref = postId ? await getPostRef(ctx.db, postId) : null;
  if (ref?.kind === 'necropolis') return { type: 'today', kind: 'necropolis', week: ref.ref, viewer };
  const rec = ref ? await getCrypt(ctx.db, ref.ref) : null;
  if (!rec) return { type: 'today', kind: 'none', viewer };
  const info = cryptInfo(rec, ctx.now);
  const userId = ctx.viewer.userId;
  const [stats, tombs, run, streak, leaderboard] = await Promise.all([
    getStats(ctx.db, rec.dayId),
    publicTombs(ctx.db, rec.dayId),
    userId ? getRun(ctx.db, rec.dayId, userId) : Promise.resolve(null),
    userId ? getStreak(ctx.db, userId) : Promise.resolve({ play: 0, escape: 0, best: 0 }),
    topDay(ctx.db, rec.dayId, userId),
  ]);
  const res: TodayResponse = {
    type: 'today',
    kind: 'crypt',
    crypt: info,
    stats,
    tombs,
    run: myRun(run),
    streak: currentStreak(streak, dayIdOf(new Date(ctx.now))),
    leaderboard,
    viewer,
    final: info.isToday ? null : await finalSummary(ctx.db, rec.dayId),
  };
  return res;
}

/** POST /api/run/start: one scored run per user per crypt, only on today's crypt. */
export async function start(ctx: Ctx, postId: string | undefined): Promise<MyRun> {
  const { userId, username } = requireUser(ctx);
  const rec = await cryptForPost(ctx, postId);
  if (rec.dayId !== dayIdOf(new Date(ctx.now))) throw new GameError('This crypt is closed. Play it as practice instead.', 409);
  const existing = await getRun(ctx.db, rec.dayId, userId);
  if (existing) return { state: existing.state, tombstonesAtStart: existing.meta.tombstonesAtStart, result: existing.meta.result ?? null };
  const layout = await getLayout(ctx.db, rec.dayId);
  if (!layout) throw new GameError('This crypt has crumbled.', 404);
  const tombs = await listTombs(ctx.db, rec.dayId);
  const run: RunRecord = {
    state: startRun(layout, { oil: rec.budget, bones: rec.bones, curseDrain: rec.curseDrain }),
    meta: { tombstonesAtStart: tombs.length, startedAt: ctx.now },
  };
  if (!(await createRun(ctx.db, rec.dayId, userId, run))) {
    const again = await getRun(ctx.db, rec.dayId, userId);
    if (again) return { state: again.state, tombstonesAtStart: again.meta.tombstonesAtStart, result: again.meta.result ?? null };
  }
  const prof = await getProfile(ctx.db, userId);
  await saveProfile(ctx.db, userId, { name: username, avatar: prof?.avatar ?? (await ctx.p.avatar(username)) });
  await ctx.db.hSet('names', { [username.toLowerCase()]: userId });
  await bumpStat(ctx.db, rec.dayId, 'entered');
  await ctx.p.publish(cryptChannel(rec.dayId), { t: 'stats', stats: await getStats(ctx.db, rec.dayId) });
  return { state: run.state, tombstonesAtStart: run.meta.tombstonesAtStart, result: null };
}

/** Validates an untrusted action body. */
export function parseAction(body: unknown): Action | null {
  if (typeof body !== 'object' || body === null || !('action' in body)) return null;
  const a = body.action;
  if (typeof a !== 'object' || a === null || !('type' in a)) return null;
  switch (a.type) {
    case 'move':
      return 'dir' in a && (a.dir === 'north' || a.dir === 'south' || a.dir === 'east' || a.dir === 'west') ? { type: 'move', dir: a.dir } : null;
    case 'step':
      return 'to' in a && typeof a.to === 'number' && Number.isInteger(a.to) ? { type: 'step', to: a.to } : null;
    case 'bone':
      return 'target' in a && typeof a.target === 'number' && Number.isInteger(a.target) ? { type: 'bone', target: a.target } : null;
    case 'flare':
      return { type: 'flare' };
    case 'retreat':
      return { type: 'retreat' };
    default:
      return null;
  }
}

async function rateLimit(ctx: Ctx, userId: string): Promise<void> {
  const sec = Math.floor(ctx.now / 1000);
  const n = await ctx.db.incrBy(keys.rate(userId, sec), 1);
  if (n === 1) await ctx.db.expire(keys.rate(userId, sec), 5);
  if (n > RATE_LIMIT_PER_SECOND) throw new GameError('Slow down. The dead are patient.', 429);
}

/** Graves the player saw: tombstones in or next to rooms they visited (BRIEF 5 share text). */
export function gravesPassed(state: RunState, tombs: TombRecord[], until: number): number {
  const seen = new Set<number>(state.knowledge.visited);
  for (const v of state.knowledge.visited) for (const n of neighbours(v)) seen.add(n);
  return tombs.filter((t) => t.ts <= until && seen.has(t.cell)).length;
}

async function flairFor(ctx: Ctx, userId: string, escapeStreak: number): Promise<string | null> {
  const rep = await getRep(ctx.db, userId);
  const poet = await weeklyPoet(ctx.db, isoWeek(dayIdOf(new Date(ctx.now))));
  const title = titleFor(rep, poet === userId);
  const parts: string[] = [];
  if (escapeStreak > 0) parts.push(`Undying ${escapeStreak}`);
  if (title) parts.push(title);
  return parts.length > 0 ? parts.join(' · ') : null;
}

async function finish(ctx: Ctx, rec: CryptRecord, userId: string, username: string, run: RunRecord): Promise<RunResult> {
  const { db, p, now } = ctx;
  const s = run.state;
  const prof = await getProfile(db, userId);
  const quiet = prof?.quiet ?? false;
  let tombId: string | null = null;
  if (s.status === 'died' && s.deathCell !== undefined && s.deathCause) {
    tombId = `t${await nextId(db, `tomb:${rec.dayId}`)}`;
    const tomb: TombRecord = {
      id: tombId,
      cell: s.deathCell,
      userId,
      name: username,
      ...(prof?.avatar ? { avatar: prof.avatar } : {}),
      anonymous: false,
      epitaph: 'Here lies one who went east.',
      cause: s.deathCause,
      ts: now,
    };
    await saveTomb(db, rec.dayId, tomb);
    await bumpStat(db, rec.dayId, s.deathCause === 'fell' ? 'fell' : s.deathCause === 'cursed' ? 'cursed' : 'stranded');
    await p.publish(cryptChannel(rec.dayId), { t: 'tomb', tomb: toPublic(tomb) });
  } else if (s.status === 'escaped') {
    await bumpStat(db, rec.dayId, 'escaped');
    await bumpStat(db, rec.dayId, 'relics');
    await setFirstEscape(db, rec.dayId, username);
  } else if (s.status === 'retreated') {
    await bumpStat(db, rec.dayId, 'retreated');
  }
  const score = scoreRun({
    status: s.status,
    oilLeft: s.oil,
    bonesLeft: s.bonesLeft,
    flareUsed: s.flareUsed,
    cursed: s.cursed,
    tombstonesAtStart: run.meta.tombstonesAtStart,
  });
  if (score.final > 0) {
    await recordDay(db, rec.dayId, userId, score.final, now);
    await recordWeek(db, isoWeek(rec.dayId), userId, score.final);
    if (s.status === 'escaped' && !quiet) await p.publish(cryptChannel(rec.dayId), { t: 'escape', name: username, score: score.final });
  }
  const streak = updateStreak(await getStreak(db, userId), rec.dayId, s.status !== 'died');
  await saveStreak(db, userId, streak);
  if (!quiet) {
    const flair = await flairFor(ctx, userId, streak.escape);
    if (flair) await p.setFlair(username, flair);
  }
  const tombs = await listTombs(db, rec.dayId);
  const graves = gravesPassed(s, tombs.filter((t) => t.id !== tombId), now);
  const result: RunResult = {
    status: s.status,
    score,
    rank: score.final > 0 ? await rankOf(db, keys.lbDay(rec.dayId), userId) : null,
    streak,
    gravesPassed: graves,
    share: shareText({
      cryptNumber: rec.number,
      weekdayShort: WEEKDAY_SHORT[weekdayOf(rec.dayId)] ?? '',
      status: s.status,
      ...(s.deathCause ? { deathCause: s.deathCause } : {}),
      score: score.final,
      oilLeft: s.oil,
      bonesLeft: s.bonesLeft,
      gravesPassed: graves,
      streak: streak.escape,
    }),
    tombId,
    epitaphCarved: false,
  };
  await p.publish(cryptChannel(rec.dayId), { t: 'stats', stats: await getStats(db, rec.dayId) });
  return result;
}

/** POST /api/act: applies one action server-side and returns only what the player may know. */
export async function act(ctx: Ctx, postId: string | undefined, action: Action): Promise<ActResponse> {
  const { userId, username } = requireUser(ctx);
  await rateLimit(ctx, userId);
  const rec = await cryptForPost(ctx, postId);
  const run = await getRun(ctx.db, rec.dayId, userId);
  if (!run) throw new GameError('Descend first.', 409);
  const layout = await getLayout(ctx.db, rec.dayId);
  if (!layout) throw new GameError('This crypt has crumbled.', 404);
  const r = applyAction(layout, run.state, action, rec.curseDrain);
  if (!r.ok) throw new GameError(r.error, 400);
  const next: RunRecord = { state: r.state, meta: { ...run.meta } };
  let result: RunResult | null = null;
  if (r.state.status !== 'active') {
    next.meta.endedAt = ctx.now;
    result = await finish(ctx, rec, userId, username, next);
    next.meta.result = result;
    if (result.tombId) next.meta.tombId = result.tombId;
  }
  await saveRun(ctx.db, rec.dayId, userId, next);
  return { type: 'act', state: r.state, events: r.events, result };
}

/** POST /api/epitaph: carve once, after a death; moderated; broadcast live. */
export async function carve(ctx: Ctx, postId: string | undefined, text: string, anonymous: boolean): Promise<PublicTomb> {
  const { userId } = requireUser(ctx);
  const rec = await cryptForPost(ctx, postId);
  const run = await getRun(ctx.db, rec.dayId, userId);
  if (!run?.meta.tombId || run.state.status !== 'died') throw new GameError('Only the dead may carve an epitaph.', 403);
  if (run.meta.epitaphCarved) throw new GameError('Your epitaph is already carved.', 409);
  const mod = await moderateEpitaph(ctx.p, text);
  if (!mod.ok) throw new GameError(mod.reason, 400);
  const tomb = await getTomb(ctx.db, rec.dayId, run.meta.tombId);
  if (!tomb) throw new GameError('Your tombstone is missing.', 404);
  const carved: TombRecord = { ...tomb, epitaph: mod.text, anonymous };
  await saveTomb(ctx.db, rec.dayId, carved);
  const meta = { ...run.meta, epitaphCarved: true, ...(run.meta.result ? { result: { ...run.meta.result, epitaphCarved: true } } : {}) };
  await saveRun(ctx.db, rec.dayId, userId, { state: run.state, meta });
  const pub = toPublic(carved);
  await ctx.p.publish(cryptChannel(rec.dayId), { t: 'tomb', tomb: pub });
  return pub;
}

/** GET /api/reveal: the full layout, only once the viewer's run is over or the crypt is closed. */
export async function reveal(ctx: Ctx, postId: string | undefined): Promise<RevealResponse> {
  const rec = await cryptForPost(ctx, postId);
  const isToday = rec.dayId === dayIdOf(new Date(ctx.now));
  const run = ctx.viewer.userId ? await getRun(ctx.db, rec.dayId, ctx.viewer.userId) : null;
  const finished = run !== null && run.state.status !== 'active';
  if (isToday && !finished) throw new GameError('The map stays dark until your run ends.', 403);
  const layout = await getLayout(ctx.db, rec.dayId);
  if (!layout) throw new GameError('This crypt has crumbled.', 404);
  const tombs = await listTombs(ctx.db, rec.dayId);
  const votable: RevealResponse['votable'] = [];
  if (finished && ctx.viewer.userId) {
    const until = run.meta.endedAt ?? ctx.now;
    for (const t of tombs) {
      if (t.id === run.meta.tombId || t.ts > until || t.removed || t.hidden) continue;
      votable.push({ tombId: t.id, vote: await getMyVote(ctx.db, rec.dayId, t.id, ctx.viewer.userId) });
    }
  }
  return {
    type: 'reveal',
    layout,
    tombs: await Promise.all(tombs.map(async (t) => toPublic(t, await getVotes(ctx.db, rec.dayId, t.id)))),
    votable,
    solverPath: rec.solverPath,
  };
}

/** POST /api/vote: finishers judge epitaphs they encountered; reputation follows (BRIEF 4.7). */
export async function vote(ctx: Ctx, postId: string | undefined, tombId: string, v: VoteType): Promise<VoteCounts> {
  const { userId } = requireUser(ctx);
  const rec = await cryptForPost(ctx, postId);
  const run = await getRun(ctx.db, rec.dayId, userId);
  if (!run || run.state.status === 'active') throw new GameError('Finish your run before judging the dead.', 403);
  const tomb = await getTomb(ctx.db, rec.dayId, tombId);
  if (!tomb || tomb.removed || tomb.hidden) throw new GameError('That tombstone is gone.', 404);
  if (tomb.id === run.meta.tombId || tomb.userId === userId) throw new GameError('You cannot judge your own epitaph.', 403);
  if (tomb.ts > (run.meta.endedAt ?? ctx.now)) throw new GameError('You never passed that grave.', 403);
  if (!(await castVote(ctx.db, rec.dayId, tombId, userId, v))) throw new GameError('You already judged this epitaph.', 409);
  if (tomb.userId) {
    if (v === 'true') await addRep(ctx.db, tomb.userId, 'score', 1);
    if (v === 'false') await addRep(ctx.db, tomb.userId, 'score', -1);
    if (v === 'funny') {
      await addRep(ctx.db, tomb.userId, 'funny', 1);
      await ctx.db.zIncrBy(keys.poets(isoWeek(rec.dayId)), tomb.userId, 1);
    }
  }
  return getVotes(ctx.db, rec.dayId, tombId);
}

/** POST /api/report: hides an epitaph after REPORTS_TO_HIDE distinct reports, pending moderators. */
export async function reportTomb(ctx: Ctx, postId: string | undefined, tombId: string): Promise<boolean> {
  const { userId } = requireUser(ctx);
  const rec = await cryptForPost(ctx, postId);
  const tomb = await getTomb(ctx.db, rec.dayId, tombId);
  if (!tomb) throw new GameError('That tombstone is gone.', 404);
  const n = await report(ctx.db, rec.dayId, tombId, userId);
  if (n >= REPORTS_TO_HIDE && !tomb.hidden) {
    const hidden: TombRecord = { ...tomb, hidden: true };
    await saveTomb(ctx.db, rec.dayId, hidden);
    await ctx.p.publish(cryptChannel(rec.dayId), { t: 'tomb', tomb: toPublic(hidden) });
    return true;
  }
  return tomb.hidden === true;
}

/** POST /api/share: explicit button only. Posts the result (and epitaph) as the user. */
export async function share(ctx: Ctx, postId: string | undefined, includeEpitaph: boolean): Promise<ShareResponse> {
  const { userId } = requireUser(ctx);
  const rec = await cryptForPost(ctx, postId);
  const run = await getRun(ctx.db, rec.dayId, userId);
  const result = run?.meta.result;
  if (!run || !result) throw new GameError('Finish your run first.', 403);
  let text = result.share;
  if (includeEpitaph && run.meta.tombId) {
    const tomb = await getTomb(ctx.db, rec.dayId, run.meta.tombId);
    if (tomb && !tomb.removed && !tomb.hidden) text += `\n\n> ${tomb.epitaph}`;
  }
  const parent = rec.commentId ?? rec.postId;
  if (!parent) throw new GameError('This crypt has no post to comment on.', 404);
  const url = await ctx.p.commentAsUser(parent, text.split('\n').join('  \n'));
  return { type: 'share', commentUrl: url };
}

/** GET /api/practice/:kind: practice crypts, which may include their layout (no score). */
export async function practice(ctx: Ctx, kind: PracticeKind, postId: string | undefined, seed?: number): Promise<PracticeResponse> {
  const todayId = dayIdOf(new Date(ctx.now));
  if (kind === 'tutorial') {
    return { type: 'practice', kind, title: 'The Teaching Crypt', layout: TUTORIAL_LAYOUT, ...TUTORIAL_CONFIG };
  }
  if (kind === 'random') {
    const dayId = addDays(todayId, -1 - Math.abs(Math.floor(seed ?? ctx.now)) % 365);
    const d = difficultyFor(dayId);
    const g = generate({ subredditId: `practice-${seed ?? ctx.now}`, dayId, difficulty: d });
    return { type: 'practice', kind, title: 'A Wandering Crypt', layout: g.layout, oil: g.budget, bones: d.bones, curseDrain: d.curseDrain };
  }
  const dayId = kind === 'yesterday' ? addDays(todayId, -1) : (await cryptForPost(ctx, postId)).dayId;
  if (dayId >= todayId) throw new GameError('This crypt is still open. Play it for real.', 403);
  const rec = await getCrypt(ctx.db, dayId);
  const layout = rec ? await getLayout(ctx.db, dayId) : null;
  if (!rec || !layout) throw new GameError('No crypt was opened that day.', 404);
  return { type: 'practice', kind, title: rec.name, layout, oil: rec.budget, bones: rec.bones, curseDrain: rec.curseDrain };
}
