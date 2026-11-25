/**
 * Crypt records, the post -> crypt map and per-day stats (BRIEF 7.4: crypt, post, stats).
 */

import type { Layout } from '../../shared/core/layout';
import { dayStart } from '../../shared/core/day';
import type { CryptStats } from '../../shared/api';
import { keys } from './keys';
import type { Store } from './store';
import { num, parseJson } from './store';

export type CryptRecord = {
  dayId: string;
  seed: number;
  subSeed: number;
  version: number;
  budget: number;
  bones: number;
  pits: number;
  curses: number;
  curseDrain: number;
  name: string;
  number: number;
  source: 'gen' | 'ugc';
  designer?: string;
  designerId?: string;
  oilNeeded: number;
  inferenceSteps: number;
  solverPath: number[];
  createdAt: number;
  postId?: string;
  commentId?: string;
};

export type PostRef = { kind: 'crypt' | 'necropolis'; ref: string };

/** Saves a crypt. The layout is stored in its own field and never leaves the server mid-run. */
export async function saveCrypt(db: Store, rec: CryptRecord, layout: Layout): Promise<void> {
  await db.hSet(keys.crypt(rec.dayId), { data: JSON.stringify(rec), layout: JSON.stringify(layout) });
  await db.zAdd(keys.cryptIndex(), { member: rec.dayId, score: dayStart(rec.dayId) });
}

/** Loads a crypt's public record, or null. */
export async function getCrypt(db: Store, dayId: string): Promise<CryptRecord | null> {
  return parseJson<CryptRecord | null>(await db.hGet(keys.crypt(dayId), 'data'), null);
}

/** Loads a crypt's hidden layout, or null. Server only. */
export async function getLayout(db: Store, dayId: string): Promise<Layout | null> {
  return parseJson<Layout | null>(await db.hGet(keys.crypt(dayId), 'layout'), null);
}

/** Updates fields of a crypt record. */
export async function patchCrypt(db: Store, dayId: string, patch: Partial<CryptRecord>): Promise<void> {
  const rec = await getCrypt(db, dayId);
  if (!rec) return;
  await db.hSet(keys.crypt(dayId), { data: JSON.stringify({ ...rec, ...patch }) });
}

/** Maps a post to the crypt day or Necropolis week it shows. */
export async function setPostRef(db: Store, postId: string, ref: PostRef): Promise<void> {
  await db.hSet(keys.post(postId), { kind: ref.kind, ref: ref.ref });
}

export async function getPostRef(db: Store, postId: string): Promise<PostRef | null> {
  const h = await db.hGetAll(keys.post(postId));
  if (!h.ref || (h.kind !== 'crypt' && h.kind !== 'necropolis')) return null;
  return { kind: h.kind, ref: h.ref };
}

/** All crypt days, oldest first. */
export async function listCryptDays(db: Store): Promise<string[]> {
  return (await db.zRange(keys.cryptIndex(), 0, -1, { by: 'rank' })).map((m) => m.member);
}

export const EMPTY_STATS: CryptStats = { entered: 0, fell: 0, cursed: 0, stranded: 0, escaped: 0, retreated: 0, relics: 0 };

export async function getStats(db: Store, dayId: string): Promise<CryptStats> {
  const h = await db.hGetAll(keys.stats(dayId));
  return {
    entered: num(h.entered),
    fell: num(h.fell),
    cursed: num(h.cursed),
    stranded: num(h.stranded),
    escaped: num(h.escaped),
    retreated: num(h.retreated),
    relics: num(h.relics),
  };
}

export async function bumpStat(db: Store, dayId: string, field: keyof CryptStats, by = 1): Promise<void> {
  await db.hIncrBy(keys.stats(dayId), field, by);
}

/** Records the first escapee of the day (set-if-absent). */
export async function setFirstEscape(db: Store, dayId: string, name: string): Promise<void> {
  await db.hSetNX(keys.stats(dayId), 'firstEscape', name);
}

export async function getFirstEscape(db: Store, dayId: string): Promise<string | null> {
  return (await db.hGet(keys.stats(dayId), 'firstEscape')) ?? null;
}
