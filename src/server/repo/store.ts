/**
 * The subset of Devvit Redis the repo uses. Services take a Store so tests can pass the
 * in-memory fake in store.fake.ts instead of the real client.
 */

export type ZMember = { member: string; score: number };

export type Store = {
  get(key: string): Promise<string | undefined>;
  set(key: string, value: string, options?: { nx?: boolean; expiration?: Date }): Promise<string>;
  del(...keys: string[]): Promise<void>;
  incrBy(key: string, value: number): Promise<number>;
  expire(key: string, seconds: number): Promise<void>;
  hGet(key: string, field: string): Promise<string | undefined>;
  hSet(key: string, fieldValues: Record<string, string>): Promise<number>;
  hSetNX(key: string, field: string, value: string): Promise<number>;
  hGetAll(key: string): Promise<Record<string, string>>;
  hIncrBy(key: string, field: string, value: number): Promise<number>;
  hDel(key: string, fields: string[]): Promise<number>;
  zAdd(key: string, ...members: ZMember[]): Promise<number>;
  zIncrBy(key: string, member: string, value: number): Promise<number>;
  zScore(key: string, member: string): Promise<number | undefined>;
  zRank(key: string, member: string): Promise<number | undefined>;
  zCard(key: string): Promise<number>;
  zRem(key: string, members: string[]): Promise<number>;
  zRange(
    key: string,
    start: number | string,
    stop: number | string,
    options?: { reverse?: boolean; by: 'score' | 'lex' | 'rank' },
  ): Promise<ZMember[]>;
};

/** Parses JSON from Redis, returning the fallback when missing or corrupt. */
export function parseJson<T>(raw: string | undefined, fallback: T): T {
  if (raw === undefined || raw === '') return fallback;
  try {
    const value: T = JSON.parse(raw);
    return value;
  } catch {
    return fallback;
  }
}

/** Reads a numeric hash field (0 when missing). */
export function num(raw: string | undefined): number {
  const n = Number(raw ?? 0);
  return Number.isFinite(n) ? n : 0;
}
