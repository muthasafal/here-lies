/**
 * Community features: Community Crypt submissions and moderator review, the Sunday Necropolis,
 * epitaph removal and user data deletion (BRIEF 4.7, 5, 7.4).
 */

import type { NecropolisDay, NecropolisResponse } from '../../shared/api';
import { dayIdOf, isoWeek, weekDays } from '../../shared/core/day';
import { validateDesign } from '../../shared/core/editor-validate';
import type { Layout } from '../../shared/core/layout';
import { topWeek } from '../repo/boards';
import { getCrypt, getLayout, getStats, listCryptDays, setPostRef } from '../repo/crypts';
import { keys } from '../repo/keys';
import { getProfile, getRep, titleFor, weeklyPoet } from '../repo/players';
import type { Store } from '../repo/store';
import type { TombRecord } from '../repo/tombs';
import { getVotes, listTombs, saveTomb, toPublic } from '../repo/tombs';
import { enqueue, nextId } from '../repo/ugc';
import { cryptInfo } from './daily';
import type { Ctx } from './game';
import { GameError } from './game';
import type { Platform } from './platform';

/** POST /api/ugc/submit: the server re-runs the solver before queueing (BRIEF 5). */
export async function submitDesign(ctx: Ctx, layout: Layout, name: string): Promise<string[]> {
  if (!ctx.viewer.userId || !ctx.viewer.username) throw new GameError('Sign in to submit a crypt.', 401);
  const verdict = validateDesign(layout, name);
  if (!verdict.ok) return verdict.problems;
  const id = await nextId(ctx.db, 'ugc');
  await enqueue(ctx.db, {
    id,
    layout: { entrance: layout.entrance, relic: layout.relic, pits: [...layout.pits], curses: [...layout.curses] },
    name: name.trim(),
    designerId: ctx.viewer.userId,
    designer: ctx.viewer.username,
    status: 'pending',
    ts: ctx.now,
  });
  return [];
}

/** Creates the weekly Necropolis post for the ISO week containing `dayId`. */
export async function postNecropolis(db: Store, p: Platform, dayId: string): Promise<{ id: string; url: string }> {
  const monday = weekDays(dayId)[0] ?? dayId;
  const existing = await db.hGet(keys.necropolis(), monday);
  if (existing) return { id: existing, url: '' };
  const week = isoWeek(dayId);
  const title = `The Necropolis · ${week.replace('-W', ' · week ')}`;
  const post = await p.createPost({
    title,
    textFallback: `${title}\n\nEvery tombstone of the week's crypts, the week's leaderboard and the titles awarded.`,
  });
  await setPostRef(db, post.id, { kind: 'necropolis', ref: monday });
  await db.hSet(keys.necropolis(), { [monday]: post.id });
  return post;
}

/** GET /api/necropolis: a scrollable graveyard of a week's crypts (BRIEF 5). */
export async function necropolis(ctx: Ctx, monday: string): Promise<NecropolisResponse> {
  const todayId = dayIdOf(new Date(ctx.now));
  const days: NecropolisDay[] = [];
  const authors = new Set<string>();
  const architects: string[] = [];
  for (const dayId of weekDays(monday)) {
    const rec = await getCrypt(ctx.db, dayId);
    if (!rec) continue;
    const tombs = await listTombs(ctx.db, dayId);
    for (const t of tombs) if (t.userId && !t.anonymous) authors.add(t.userId);
    if (rec.designer) architects.push(rec.designer);
    days.push({
      dayId,
      crypt: cryptInfo(rec, ctx.now),
      stats: await getStats(ctx.db, dayId),
      tombs: await Promise.all(tombs.map(async (t) => toPublic(t, await getVotes(ctx.db, dayId, t.id)))),
      layout: dayId < todayId ? await getLayout(ctx.db, dayId) : null,
    });
  }
  const week = isoWeek(monday);
  const honest: string[] = [];
  const tricksters: string[] = [];
  for (const userId of authors) {
    const title = titleFor(await getRep(ctx.db, userId), false);
    const name = (await getProfile(ctx.db, userId))?.name;
    if (!name) continue;
    if (title === 'Honest Ghost') honest.push(name);
    if (title === 'Trickster') tricksters.push(name);
  }
  const poetId = await weeklyPoet(ctx.db, week);
  const poet = poetId ? ((await getProfile(ctx.db, poetId))?.name ?? null) : null;
  return {
    type: 'necropolis',
    week,
    days,
    leaderboard: await topWeek(ctx.db, week, ctx.viewer.userId),
    titles: { honest, tricksters, poet, architects },
  };
}

/** Moderator action: removes an epitaph (the tomb stays; the words are scraped away). */
export async function removeEpitaph(db: Store, p: Platform, dayId: string, tombId: string): Promise<boolean> {
  const tombs = await listTombs(db, dayId);
  const t = tombs.find((x) => x.id === tombId);
  if (!t) return false;
  const removed: TombRecord = { ...t, removed: true };
  await saveTomb(db, dayId, removed);
  await p.publish(`crypt-${dayId}`, { t: 'tomb', tomb: toPublic(removed) });
  return true;
}

/** Moderator action: restores an epitaph hidden by reports. */
export async function restoreEpitaph(db: Store, dayId: string, tombId: string): Promise<boolean> {
  const t = (await listTombs(db, dayId)).find((x) => x.id === tombId);
  if (!t) return false;
  await saveTomb(db, dayId, { ...t, hidden: false, removed: false });
  return true;
}

/**
 * Data deletion (BRIEF 7.4, Devvit rules): removes a user's profile, streak, reputation and board
 * entries, and anonymises their tombstones (the anonymous tomb stays). Returns tombs anonymised.
 */
export async function forgetUser(db: Store, username: string): Promise<number> {
  const userId = await db.hGet('names', username.toLowerCase());
  if (!userId) return 0;
  let count = 0;
  const days = await listCryptDays(db);
  const weeks = new Set<string>();
  for (const dayId of days) {
    weeks.add(isoWeek(dayId));
    for (const t of await listTombs(db, dayId)) {
      if (t.userId !== userId) continue;
      const anon: TombRecord = { id: t.id, cell: t.cell, anonymous: true, epitaph: t.epitaph, cause: t.cause, ts: t.ts };
      if (t.removed) anon.removed = true;
      if (t.hidden) anon.hidden = true;
      await saveTomb(db, dayId, anon);
      count++;
    }
    await db.zRem(keys.lbDay(dayId), [userId]);
    await db.del(keys.run(dayId, userId));
  }
  for (const w of weeks) {
    await db.zRem(keys.lbWeek(w), [userId]);
    await db.zRem(keys.poets(w), [userId]);
  }
  await db.del(keys.user(userId), keys.streak(userId), keys.rep(userId));
  await db.hDel('names', [username.toLowerCase()]);
  return count;
}

/** Days with crypts, newest first (for moderator pickers). */
export async function recentDays(db: Store, limit = 7): Promise<string[]> {
  return (await listCryptDays(db)).slice(-limit).reverse();
}
