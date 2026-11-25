/**
 * Scored runs: run:{dayId}:{userId} (BRIEF 7.4). One per user per crypt; resumable.
 */

import type { RunState } from '../../shared/core/rules';
import type { RunResult } from '../../shared/api';
import { keys } from './keys';
import type { Store } from './store';
import { parseJson } from './store';

export type RunMeta = {
  tombstonesAtStart: number;
  startedAt: number;
  endedAt?: number;
  result?: RunResult;
  tombId?: string;
  epitaphCarved?: boolean;
};

export type RunRecord = { state: RunState; meta: RunMeta };

export async function getRun(db: Store, dayId: string, userId: string): Promise<RunRecord | null> {
  const h = await db.hGetAll(keys.run(dayId, userId));
  if (!h.state) return null;
  const state = parseJson<RunState | null>(h.state, null);
  if (!state) return null;
  return { state, meta: parseJson<RunMeta>(h.meta, { tombstonesAtStart: 0, startedAt: 0 }) };
}

/** Creates the run only if none exists (one scored run per crypt). Returns false if one did. */
export async function createRun(db: Store, dayId: string, userId: string, rec: RunRecord): Promise<boolean> {
  const created = await db.hSetNX(keys.run(dayId, userId), 'state', JSON.stringify(rec.state));
  if (!created) return false;
  await db.hSet(keys.run(dayId, userId), { meta: JSON.stringify(rec.meta) });
  return true;
}

export async function saveRun(db: Store, dayId: string, userId: string, rec: RunRecord): Promise<void> {
  await db.hSet(keys.run(dayId, userId), { state: JSON.stringify(rec.state), meta: JSON.stringify(rec.meta) });
}
