/**
 * Community crypt submissions (BRIEF 5, Community Crypt Fridays; 7.4 ugc keys).
 */

import type { Layout } from '../../shared/core/layout';
import { keys } from './keys';
import type { Store } from './store';
import { parseJson } from './store';

export type UgcStatus = 'pending' | 'approved' | 'rejected' | 'used';

export type UgcRecord = {
  id: string;
  layout: Layout;
  name: string;
  designerId: string;
  designer: string;
  status: UgcStatus;
  ts: number;
};

export async function nextId(db: Store, name: string): Promise<string> {
  return String(await db.incrBy(keys.seq(name), 1));
}

export async function saveUgc(db: Store, u: UgcRecord): Promise<void> {
  await db.hSet(keys.ugc(u.id), { data: JSON.stringify(u) });
}

export async function getUgc(db: Store, id: string): Promise<UgcRecord | null> {
  return parseJson<UgcRecord | null>(await db.hGet(keys.ugc(id), 'data'), null);
}

export async function enqueue(db: Store, u: UgcRecord): Promise<void> {
  await saveUgc(db, u);
  await db.zAdd(keys.ugcQueue(), { member: u.id, score: u.ts });
}

export async function listQueue(db: Store, limit = 20): Promise<UgcRecord[]> {
  const ids = await db.zRange(keys.ugcQueue(), 0, limit - 1, { by: 'rank' });
  const recs = await Promise.all(ids.map((m) => getUgc(db, m.member)));
  return recs.filter((r): r is UgcRecord => r !== null);
}

/** Moves a submission out of the queue with a moderator decision. */
export async function decide(db: Store, id: string, approve: boolean): Promise<UgcRecord | null> {
  const u = await getUgc(db, id);
  if (!u) return null;
  const next: UgcRecord = { ...u, status: approve ? 'approved' : 'rejected' };
  await saveUgc(db, next);
  await db.zRem(keys.ugcQueue(), [id]);
  if (approve) await db.zAdd(keys.ugcApproved(), { member: id, score: Date.now() });
  return next;
}

/** Takes the oldest approved community crypt for a Friday, marking it used. */
export async function takeApproved(db: Store): Promise<UgcRecord | null> {
  const first = await db.zRange(keys.ugcApproved(), 0, 0, { by: 'rank' });
  const id = first[0]?.member;
  if (!id) return null;
  await db.zRem(keys.ugcApproved(), [id]);
  const u = await getUgc(db, id);
  if (!u) return null;
  const used: UgcRecord = { ...u, status: 'used' };
  await saveUgc(db, used);
  return used;
}
