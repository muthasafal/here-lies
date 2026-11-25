/**
 * /api/* game endpoints (BRIEF 7.3). Every handler is a thin wrapper over services/game.ts.
 */

import { Hono } from 'hono';
import { context, reddit } from '@devvit/web/server';
import type {
  ActResponse,
  EpitaphResponse,
  InitResponse,
  LeaderboardResponse,
  NecropolisResponse,
  PracticeResponse,
  PrefsResponse,
  ReportResponse,
  RevealResponse,
  ShareResponse,
  StartResponse,
  SubscribeResponse,
  UgcSubmitResponse,
  VoteResponse,
} from '../../shared/api';
import { isoWeek } from '../../shared/core/day';
import type { Layout } from '../../shared/core/layout';
import { myEntry, topDay, topWeek } from '../repo/boards';
import { getPostRef } from '../repo/crypts';
import { keys } from '../repo/keys';
import { saveProfile } from '../repo/players';
import { necropolis, submitDesign } from '../services/community';
import { act, carve, GameError, parseAction, practice, reportTomb, reveal, share, start, today, vote } from '../services/game';
import { guarded, requestCtx } from './ctx';

export const api = new Hono();

async function body(c: { req: { json: () => Promise<unknown> } }): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    return {};
  }
}

const str = (o: unknown, k: string): string | null =>
  typeof o === 'object' && o !== null && k in o && typeof Reflect.get(o, k) === 'string' ? String(Reflect.get(o, k)) : null;
const bool = (o: unknown, k: string): boolean => typeof o === 'object' && o !== null && Reflect.get(o, k) === true;

api.get('/today', (c) => guarded(c, async () => c.json<InitResponse>(await today(requestCtx(), context.postId))));

api.post('/run/start', (c) => guarded(c, async () => c.json<StartResponse>({ type: 'start', run: await start(requestCtx(), context.postId) })));

api.post('/act', (c) =>
  guarded(c, async () => {
    const action = parseAction(await body(c));
    if (!action) throw new GameError('That is not something you can do here.');
    return c.json<ActResponse>(await act(requestCtx(), context.postId, action));
  }),
);

api.post('/epitaph', (c) =>
  guarded(c, async () => {
    const b = await body(c);
    const tomb = await carve(requestCtx(), context.postId, str(b, 'text') ?? '', bool(b, 'anonymous'));
    return c.json<EpitaphResponse>({ type: 'epitaph', tomb });
  }),
);

api.get('/reveal', (c) => guarded(c, async () => c.json<RevealResponse>(await reveal(requestCtx(), context.postId))));

api.post('/vote', (c) =>
  guarded(c, async () => {
    const b = await body(c);
    const tombId = str(b, 'tombId');
    const v = str(b, 'vote');
    if (!tombId || (v !== 'true' && v !== 'false' && v !== 'funny')) throw new GameError('Choose True, False or Just funny.');
    const votes = await vote(requestCtx(), context.postId, tombId, v);
    return c.json<VoteResponse>({ type: 'vote', tombId, votes });
  }),
);

api.post('/report', (c) =>
  guarded(c, async () => {
    const tombId = str(await body(c), 'tombId');
    if (!tombId) throw new GameError('Which tombstone?');
    return c.json<ReportResponse>({ type: 'report', hidden: await reportTomb(requestCtx(), context.postId, tombId) });
  }),
);

/** Button only: posts the result comment as the user (Devvit rules for acting as the user). */
api.post('/share', (c) =>
  guarded(c, async () => c.json<ShareResponse>(await share(requestCtx(), context.postId, bool(await body(c), 'includeEpitaph')))),
);

/** Button only: subscribes the user to this community. */
api.post('/subscribe', (c) =>
  guarded(c, async () => {
    if (!context.userId) throw new GameError('Sign in first.', 401);
    await reddit.subscribeToCurrentSubreddit();
    return c.json<SubscribeResponse>({ type: 'subscribe', ok: true });
  }),
);

api.post('/prefs', (c) =>
  guarded(c, async () => {
    const ctx = requestCtx();
    if (!ctx.viewer.userId || !ctx.viewer.username) throw new GameError('Sign in first.', 401);
    const quiet = bool(await body(c), 'quiet');
    await saveProfile(ctx.db, ctx.viewer.userId, { name: ctx.viewer.username, quiet });
    return c.json<PrefsResponse>({ type: 'prefs', quiet });
  }),
);

api.get('/leaderboard', (c) =>
  guarded(c, async () => {
    const ctx = requestCtx();
    const scope = c.req.query('scope') === 'week' ? 'week' : 'day';
    const ref = context.postId ? await getPostRef(ctx.db, context.postId) : null;
    if (!ref) throw new GameError('No crypt here.', 404);
    const me = ctx.viewer.userId;
    const week = isoWeek(ref.ref);
    const key = scope === 'day' ? keys.lbDay(ref.ref) : keys.lbWeek(week);
    const entries = scope === 'day' ? await topDay(ctx.db, ref.ref, me, 20) : await topWeek(ctx.db, week, me, 20);
    return c.json<LeaderboardResponse>({ type: 'leaderboard', scope, entries, me: me ? await myEntry(ctx.db, key, me) : null });
  }),
);

api.get('/practice/:kind', (c) =>
  guarded(c, async () => {
    const k = c.req.param('kind');
    if (k !== 'yesterday' && k !== 'tutorial' && k !== 'random' && k !== 'past') throw new GameError('Unknown practice crypt.', 404);
    const seed = Number(c.req.query('seed') ?? Date.now());
    return c.json<PracticeResponse>(await practice(requestCtx(), k, context.postId, Number.isFinite(seed) ? seed : Date.now()));
  }),
);

function parseLayout(o: unknown): Layout | null {
  if (typeof o !== 'object' || o === null) return null;
  const e = Reflect.get(o, 'entrance');
  const r = Reflect.get(o, 'relic');
  const p: unknown = Reflect.get(o, 'pits');
  const cu: unknown = Reflect.get(o, 'curses');
  const ints = (a: unknown): number[] | null =>
    Array.isArray(a) && a.length <= 49 && a.every((x) => typeof x === 'number' && Number.isInteger(x)) ? a.map(Number) : null;
  const pits = ints(p);
  const curses = ints(cu);
  if (typeof e !== 'number' || typeof r !== 'number' || !pits || !curses) return null;
  return { entrance: e, relic: r, pits, curses };
}

api.post('/ugc/submit', (c) =>
  guarded(c, async () => {
    const b = await body(c);
    const layout = parseLayout(typeof b === 'object' && b !== null ? Reflect.get(b, 'layout') : null);
    if (!layout) throw new GameError('That crypt design is malformed.');
    const problems = await submitDesign(requestCtx(), layout, str(b, 'name') ?? '');
    return c.json<UgcSubmitResponse>({ type: 'ugc', ok: problems.length === 0, problems });
  }),
);

api.get('/necropolis', (c) =>
  guarded(c, async () => {
    const ctx = requestCtx();
    const ref = context.postId ? await getPostRef(ctx.db, context.postId) : null;
    const monday = c.req.query('week') ?? (ref?.kind === 'necropolis' ? ref.ref : null);
    if (!monday || !/^\d{4}-\d{2}-\d{2}$/.test(monday)) throw new GameError('Which week?', 404);
    return c.json<NecropolisResponse>(await necropolis(ctx, monday));
  }),
);
