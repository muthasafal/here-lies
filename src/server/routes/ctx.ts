/**
 * Builds the service context for a request and maps GameErrors to JSON responses.
 */

import type { Context } from 'hono';
import { context, redis } from '@devvit/web/server';
import type { ApiError } from '../../shared/api';
import type { Store } from '../repo/store';
import { devvitPlatform } from '../services/devvit-platform';
import type { Ctx } from '../services/game';
import { GameError } from '../services/game';

/** The Devvit Redis client, seen through the Store interface the repo uses. */
export const db: Store = {
  get: (k) => redis.get(k),
  set: (k, v, o) => redis.set(k, v, o),
  del: async (...k) => {
    await redis.del(...k);
  },
  incrBy: (k, v) => redis.incrBy(k, v),
  expire: async (k, s) => {
    await redis.expire(k, s);
  },
  hGet: (k, f) => redis.hGet(k, f),
  hSet: (k, f) => redis.hSet(k, f),
  hSetNX: (k, f, v) => redis.hSetNX(k, f, v),
  hGetAll: (k) => redis.hGetAll(k),
  hIncrBy: (k, f, v) => redis.hIncrBy(k, f, v),
  hDel: (k, f) => redis.hDel(k, f),
  zAdd: (k, ...m) => redis.zAdd(k, ...m),
  zIncrBy: (k, m, v) => redis.zIncrBy(k, m, v),
  zScore: (k, m) => redis.zScore(k, m),
  zRank: (k, m) => redis.zRank(k, m),
  zCard: (k) => redis.zCard(k),
  zRem: (k, m) => redis.zRem(k, m),
  zRange: (k, a, b, o) => redis.zRange(k, a, b, o),
};

/** Service context for the current request. */
export function requestCtx(): Ctx {
  return {
    db,
    p: devvitPlatform(),
    viewer: { userId: context.userId ?? null, username: context.username ?? null },
    now: Date.now(),
  };
}

/** Runs a handler, turning GameErrors into `{ status: 'error', message }` with their HTTP code. */
export async function guarded(c: Context, fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof GameError) return c.json<ApiError>({ status: 'error', message: e.message }, e.status);
    console.error('Unhandled error', e);
    return c.json<ApiError>({ status: 'error', message: 'Something stirred in the dark. Try again.' }, 500);
  }
}
