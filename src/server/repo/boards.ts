/**
 * Daily and weekly leaderboards (BRIEF 4.8). Daily ties break on earlier finish: the sorted-set
 * score is points plus a fraction that shrinks through the UTC day.
 */

import type { LeaderEntry } from '../../shared/api';
import { dayStart } from '../../shared/core/day';
import { keys } from './keys';
import type { Store } from './store';
import { getProfile } from './players';

/** points + (seconds left in the day) / 1e6, so earlier finishes rank higher on ties. */
export function dayScore(points: number, dayId: string, finishedAt: number): number {
  const secs = Math.min(86_400, Math.max(0, Math.floor((finishedAt - dayStart(dayId)) / 1000)));
  return points + (86_400 - secs) / 1e6;
}

export async function recordDay(db: Store, dayId: string, userId: string, points: number, finishedAt: number): Promise<void> {
  await db.zAdd(keys.lbDay(dayId), { member: userId, score: dayScore(points, dayId, finishedAt) });
}

export async function recordWeek(db: Store, isoWeek: string, userId: string, points: number): Promise<void> {
  await db.zIncrBy(keys.lbWeek(isoWeek), userId, points);
}

async function entries(db: Store, key: string, limit: number, me: string | null): Promise<LeaderEntry[]> {
  const top = await db.zRange(key, 0, limit - 1, { by: 'rank', reverse: true });
  return Promise.all(
    top.map(async (m, i) => ({
      rank: i + 1,
      name: (await getProfile(db, m.member))?.name ?? 'a nameless soul',
      score: Math.floor(m.score),
      mine: m.member === me,
    })),
  );
}

/** Rank (1-based, highest score first) of a user, or null. */
export async function rankOf(db: Store, key: string, userId: string): Promise<number | null> {
  const r = await db.zRank(key, userId);
  if (r === undefined) return null;
  return (await db.zCard(key)) - r;
}

export async function topDay(db: Store, dayId: string, me: string | null, limit = 10): Promise<LeaderEntry[]> {
  return entries(db, keys.lbDay(dayId), limit, me);
}

export async function topWeek(db: Store, isoWeek: string, me: string | null, limit = 10): Promise<LeaderEntry[]> {
  return entries(db, keys.lbWeek(isoWeek), limit, me);
}

/** The viewer's own entry on a board. */
export async function myEntry(db: Store, key: string, userId: string): Promise<LeaderEntry | null> {
  const score = await db.zScore(key, userId);
  const rank = await rankOf(db, key, userId);
  if (score === undefined || rank === null) return null;
  return { rank, name: (await getProfile(db, userId))?.name ?? 'you', score: Math.floor(score), mine: true };
}
