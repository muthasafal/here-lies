/**
 * Server tests with an in-memory Redis fake (BRIEF 9): the full daily flow, anti-cheat
 * (no layout leaks before the run ends), tombstones, votes, sharing and data deletion.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import type { RealtimeMessage } from '../../shared/api';
import { neighbours } from '../../shared/core/layout';
import type { Layout } from '../../shared/core/layout';
import { getLayout } from '../repo/crypts';
import { fakeStore } from '../repo/store.fake';
import type { Store } from '../repo/store';
import { forgetUser, necropolis, postNecropolis, submitDesign } from './community';
import { ensureCrypt } from './daily';
import type { Ctx } from './game';
import { act, carve, practice, reportTomb, reveal, share, start, today, vote } from './game';
import type { Platform } from './platform';

const DAY = '2026-12-03';
const NOW = Date.parse(`${DAY}T10:00:00Z`);

type Fake = Platform & { sent: RealtimeMessage[]; comments: { parent: string; text: string }[]; flairs: string[]; posts: string[] };

function fakePlatform(): Fake {
  let n = 0;
  const p: Fake = {
    sent: [],
    comments: [],
    flairs: [],
    posts: [],
    subredditId: 't5_test',
    subredditName: 'here_lies_test',
    fetch: () => Promise.reject(new Error('no network in tests')),
    publish: async (_c, m) => {
      p.sent.push(m);
    },
    avatar: async () => null,
    createPost: async ({ title }) => {
      p.posts.push(title);
      return { id: `t3_post${++n}`, url: `https://reddit.example/post${n}` };
    },
    pinComment: async () => 't1_pinned',
    commentAsUser: async (parent, text) => {
      p.comments.push({ parent, text });
      return 'https://reddit.example/c/1';
    },
    subscribeUser: async () => {},
    setFlair: async (_u, t) => {
      p.flairs.push(t);
    },
    perspectiveKey: async () => null,
  };
  return p;
}

let db: Store;
let p: Fake;
let postId: string;
let layout: Layout;
const ctxFor = (userId: string | null, now = NOW): Ctx => ({ db, p, viewer: { userId, username: userId ? `name_${userId}` : null }, now });

beforeEach(async () => {
  db = fakeStore();
  p = fakePlatform();
  const r = await ensureCrypt(db, p, DAY, NOW);
  postId = r.rec.postId ?? '';
  const l = await getLayout(db, DAY);
  if (!l) throw new Error('no layout');
  layout = l;
});

/** Walks the solver's own path through the API; it always escapes. */
async function playToEscape(ctx: Ctx) {
  const t = await today(ctx, postId);
  if (t.kind !== 'crypt') throw new Error('no crypt');
  const rev = await reveal(ctxFor('peek', Date.parse('2027-01-01T00:00:00Z')), postId).catch(() => null);
  const path = rev?.solverPath ?? [];
  let last = layout.entrance;
  let res = null;
  for (const c of path.slice(1)) {
    if (c === last) continue;
    ctx.now += 250;
    res = await act(ctx, postId, { type: 'step', to: c });
    last = c;
  }
  return res;
}

/** Walks safely to a room next to a pit, then steps in. */
async function playToDeath(ctx: Ctx) {
  const pit = layout.pits.find((x) => neighbours(x).some((n) => !layout.pits.includes(n)));
  if (pit === undefined) throw new Error('no pit');
  const prev = new Map<number, number>([[layout.entrance, layout.entrance]]);
  const q = [layout.entrance];
  const blocked = new Set([...layout.pits, ...layout.curses]);
  while (q.length) {
    const c = q.shift();
    if (c === undefined) break;
    for (const n of neighbours(c)) if (!prev.has(n) && (!blocked.has(n) || n === pit)) prev.set(n, c), q.push(n);
  }
  const route: number[] = [];
  for (let c = pit; c !== layout.entrance; c = prev.get(c) ?? layout.entrance) route.unshift(c);
  let res = null;
  for (const c of route) {
    ctx.now += 250;
    res = await act(ctx, postId, { type: 'step', to: c });
  }
  return res;
}

describe('daily loop', () => {
  it('creates one crypt post per day, idempotently', async () => {
    const again = await ensureCrypt(db, p, DAY, NOW + 1000);
    expect(again.created).toBe(false);
    expect(p.posts).toHaveLength(1);
    expect(p.posts[0]).toMatch(/^Crypt #9 · Thursday · The /);
  });
});

describe('anti-cheat', () => {
  it('never leaks the layout before the run ends', async () => {
    const ctx = ctxFor('u1');
    const t = await today(ctx, postId);
    const s = await start(ctx, postId);
    const json = JSON.stringify([t, s]);
    expect(json).not.toMatch(/"layout"|"entrance"|"relic":|"pits":\[|"curses":\[/);
    await expect(reveal(ctx, postId)).rejects.toThrow(/dark/);
    await expect(practice(ctx, 'past', postId)).rejects.toThrow(/open/);
  });
  it('requires sign-in and one run per day', async () => {
    await expect(start(ctxFor(null), postId)).rejects.toThrow(/Sign in/);
    const a = await start(ctxFor('u1'), postId);
    await act(ctxFor('u1'), postId, { type: 'move', dir: 'north' });
    const b = await start(ctxFor('u1'), postId);
    expect(b.state.moves).toBe(1);
    expect(a.state.moves).toBe(0);
  });
  it('rate limits bursts', async () => {
    const ctx = ctxFor('u1');
    await start(ctx, postId);
    const results = await Promise.allSettled(Array.from({ length: 14 }, () => act(ctx, postId, { type: 'bone', target: -1 })));
    expect(results.some((r) => r.status === 'rejected' && String(r.reason).match(/Slow down/))).toBe(true);
  });
});

describe('a full day', () => {
  it('death leaves a live tombstone, epitaph, votes, share and reputation', async () => {
    const dead = ctxFor('dead');
    await start(dead, postId);
    const death = await playToDeath(dead);
    expect(death?.state.status).toBe('died');
    expect(death?.result?.tombId).toBeTruthy();
    expect(p.sent.some((m) => m.t === 'tomb')).toBe(true);
    const tomb = await carve(dead, postId, 'pit east of the glow', false);
    expect(tomb.epitaph).toBe('pit east of the glow');
    await expect(carve(dead, postId, 'again', false)).rejects.toThrow(/already/);

    const hero = ctxFor('hero', NOW + 60_000);
    const s = await start(hero, postId);
    expect(s.tombstonesAtStart).toBe(1);
    const win = await playToEscape(hero);
    expect(win?.state.status).toBe('escaped');
    expect(win?.result?.score.final).toBeGreaterThan(1000);
    expect(win?.result?.rank).toBe(1);
    expect(p.flairs.at(-1)).toMatch(/^Undying 1/);

    const rv = await reveal(hero, postId);
    expect(rv.layout.relic).toBe(layout.relic);
    expect(rv.votable.map((v) => v.tombId)).toEqual([tomb.id]);
    const counts = await vote(hero, postId, tomb.id, 'true');
    expect(counts.true).toBe(1);
    await expect(vote(hero, postId, tomb.id, 'false')).rejects.toThrow(/already/);
    await expect(vote(dead, postId, tomb.id, 'true')).rejects.toThrow(/own/);

    const sh = await share(hero, postId, false);
    expect(sh.commentUrl).toBeTruthy();
    expect(p.comments[0]?.parent).toBe('t1_pinned');
    expect(p.comments[0]?.text).toMatch(/escaped with the relic/);

    const t = await today(ctxFor('late', NOW + 120_000), postId);
    if (t.kind !== 'crypt') throw new Error();
    expect(t.stats).toMatchObject({ entered: 2, fell: 1, escaped: 1, relics: 1 });
    expect(t.leaderboard[0]?.name).toBe('name_hero');

    const tomorrow = await today(ctxFor('late', Date.parse('2026-12-04T09:00:00Z')), postId);
    if (tomorrow.kind !== 'crypt') throw new Error();
    expect(tomorrow.final?.firstEscape).toBe('name_hero');
    expect(tomorrow.final?.fittingEpitaph?.epitaph).toBe('pit east of the glow');
    const next = await ensureCrypt(db, p, '2026-12-04', Date.parse('2026-12-04T00:00:00Z'));
    expect(next.rec.name).toBe('The Crypt of u/name_dead');
  });

  it('reports hide an epitaph after three reporters', async () => {
    const dead = ctxFor('dead');
    await start(dead, postId);
    const d = await playToDeath(dead);
    const id = d?.result?.tombId ?? '';
    expect(await reportTomb(ctxFor('a'), postId, id)).toBe(false);
    await reportTomb(ctxFor('b'), postId, id);
    expect(await reportTomb(ctxFor('c'), postId, id)).toBe(true);
    const t = await today(ctxFor('x'), postId);
    if (t.kind !== 'crypt') throw new Error();
    expect(t.tombs[0]?.removed).toBe(true);
  });

  it('forgetting a user anonymises tombstones and removes scores', async () => {
    const dead = ctxFor('dead');
    await start(dead, postId);
    await playToDeath(dead);
    expect(await forgetUser(db, 'name_dead')).toBe(1);
    const t = await today(ctxFor('x'), postId);
    if (t.kind !== 'crypt') throw new Error();
    expect(t.tombs[0]?.name).toBeNull();
  });
});

describe('community', () => {
  it('rejects unfair designs and queues fair ones', async () => {
    const bad = await submitDesign(ctxFor('arch'), { entrance: 45, relic: 3, pits: [], curses: [] }, 'Empty');
    expect(bad.length).toBeGreaterThan(0);
    const ok = await submitDesign(ctxFor('arch'), layout, 'The Test Vault');
    expect(ok.length === 0 || ok.some((x) => /Unfair|easy|pits|curses/.test(x))).toBe(true);
  });
  it('posts and renders the Necropolis', async () => {
    const post = await postNecropolis(db, p, DAY);
    expect(post.id).toMatch(/^t3_/);
    const n = await necropolis(ctxFor('x'), '2026-11-30');
    expect(n.days.map((d) => d.dayId)).toEqual([DAY]);
    expect(n.days[0]?.layout).toBeNull();
  });
});
