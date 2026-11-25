/**
 * Tombstones, per-room stacks, epitaph votes and reports (BRIEF 4.6, 4.7, 7.4).
 */

import type { DeathCause, VoteType } from '../../shared/core/types';
import type { PublicTomb, VoteCounts } from '../../shared/api';
import { keys } from './keys';
import type { Store } from './store';
import { num, parseJson } from './store';

export type TombRecord = {
  id: string;
  cell: number;
  userId?: string;
  name?: string;
  avatar?: string;
  anonymous: boolean;
  epitaph: string;
  cause: DeathCause;
  ts: number;
  removed?: boolean;
  hidden?: boolean;
};

export const REMOVED_EPITAPH = 'The words were scraped away.';

/** What every player may see about a tomb. */
export function toPublic(t: TombRecord, votes?: VoteCounts): PublicTomb {
  const blanked = t.removed === true || t.hidden === true;
  return {
    id: t.id,
    cell: t.cell,
    name: t.anonymous ? null : (t.name ?? null),
    avatar: t.anonymous ? null : (t.avatar ?? null),
    epitaph: blanked ? REMOVED_EPITAPH : t.epitaph,
    cause: t.cause,
    ts: t.ts,
    removed: blanked,
    ...(votes ? { votes } : {}),
  };
}

export async function saveTomb(db: Store, dayId: string, t: TombRecord): Promise<void> {
  await db.hSet(keys.tombs(dayId), { [t.id]: JSON.stringify(t) });
  await db.zAdd(keys.tombCell(dayId, t.cell), { member: t.id, score: t.ts });
}

export async function getTomb(db: Store, dayId: string, tombId: string): Promise<TombRecord | null> {
  return parseJson<TombRecord | null>(await db.hGet(keys.tombs(dayId), tombId), null);
}

/** All tombs of a day, oldest first. */
export async function listTombs(db: Store, dayId: string): Promise<TombRecord[]> {
  const h = await db.hGetAll(keys.tombs(dayId));
  return Object.values(h)
    .map((v) => parseJson<TombRecord | null>(v, null))
    .filter((t): t is TombRecord => t !== null)
    .sort((a, b) => a.ts - b.ts);
}

export async function getVotes(db: Store, dayId: string, tombId: string): Promise<VoteCounts> {
  const h = await db.hGetAll(keys.votes(dayId, tombId));
  return { true: num(h.true), false: num(h.false), funny: num(h.funny) };
}

/** Records one vote per user per tomb. Returns false if the user already voted. */
export async function castVote(db: Store, dayId: string, tombId: string, userId: string, vote: VoteType): Promise<boolean> {
  const ok = await db.set(keys.voted(dayId, tombId, userId), vote, { nx: true });
  if (!ok) return false;
  await db.hIncrBy(keys.votes(dayId, tombId), vote, 1);
  return true;
}

export async function getMyVote(db: Store, dayId: string, tombId: string, userId: string): Promise<VoteType | null> {
  const v = await db.get(keys.voted(dayId, tombId, userId));
  return v === 'true' || v === 'false' || v === 'funny' ? v : null;
}

/** Adds a report; returns the number of distinct reporters. */
export async function report(db: Store, dayId: string, tombId: string, userId: string): Promise<number> {
  await db.hSetNX(keys.reports(dayId, tombId), userId, '1');
  return Object.keys(await db.hGetAll(keys.reports(dayId, tombId))).length;
}
