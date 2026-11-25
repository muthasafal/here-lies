/**
 * Per-player data: profile, streaks, reputation and titles (BRIEF 4.7, 4.8, 7.4).
 */

import type { Streak } from '../../shared/core/streaks';
import { EMPTY_STREAK } from '../../shared/core/streaks';
import type { ReputationTitle } from '../../shared/core/types';
import { keys } from './keys';
import type { Store } from './store';
import { num, parseJson } from './store';

export type Profile = { name: string; avatar: string | null; quiet: boolean };

export async function getProfile(db: Store, userId: string): Promise<Profile | null> {
  const h = await db.hGetAll(keys.user(userId));
  if (!h.name) return null;
  return { name: h.name, avatar: h.avatar || null, quiet: h.quiet === '1' };
}

export async function saveProfile(db: Store, userId: string, p: Partial<Profile>): Promise<void> {
  const fields: Record<string, string> = {};
  if (p.name !== undefined) fields.name = p.name;
  if (p.avatar !== undefined) fields.avatar = p.avatar ?? '';
  if (p.quiet !== undefined) fields.quiet = p.quiet ? '1' : '0';
  if (Object.keys(fields).length > 0) await db.hSet(keys.user(userId), fields);
}

export async function getStreak(db: Store, userId: string): Promise<Streak> {
  return parseJson<Streak>(await db.hGet(keys.streak(userId), 'data'), EMPTY_STREAK);
}

export async function saveStreak(db: Store, userId: string, s: Streak): Promise<void> {
  await db.hSet(keys.streak(userId), { data: JSON.stringify(s) });
}

export type Reputation = { score: number; funny: number; architect: boolean };

export async function getRep(db: Store, userId: string): Promise<Reputation> {
  const h = await db.hGetAll(keys.rep(userId));
  return { score: num(h.score), funny: num(h.funny), architect: h.architect === '1' };
}

export async function addRep(db: Store, userId: string, field: 'score' | 'funny', by: number): Promise<void> {
  await db.hIncrBy(keys.rep(userId), field, by);
}

export async function markArchitect(db: Store, userId: string): Promise<void> {
  await db.hSet(keys.rep(userId), { architect: '1' });
}

export const HONEST_AT = 10;
export const TRICKSTER_AT = -10;

/** Title from reputation (BRIEF 4.7). Poet of the Crypt wins over the others for the week. */
export function titleFor(rep: Reputation, isPoet: boolean): ReputationTitle {
  if (isPoet) return 'Poet of the Crypt';
  if (rep.score >= HONEST_AT) return 'Honest Ghost';
  if (rep.score <= TRICKSTER_AT) return 'Trickster';
  if (rep.architect) return 'Architect';
  return null;
}

/** The current week's Poet of the Crypt (most funny votes), if any. */
export async function weeklyPoet(db: Store, isoWeek: string): Promise<string | null> {
  const top = await db.zRange(keys.poets(isoWeek), 0, 0, { by: 'rank', reverse: true });
  return top[0] && top[0].score > 0 ? top[0].member : null;
}
