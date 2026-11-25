/**
 * In-memory Store for server tests (BRIEF 9: endpoint handlers with an in-memory Redis fake).
 */

import type { Store, ZMember } from './store';

export function fakeStore(): Store & { dump(): Map<string, unknown> } {
  const strings = new Map<string, string>();
  const hashes = new Map<string, Map<string, string>>();
  const zsets = new Map<string, Map<string, number>>();
  const h = (k: string) => {
    let m = hashes.get(k);
    if (!m) hashes.set(k, (m = new Map()));
    return m;
  };
  const z = (k: string) => {
    let m = zsets.get(k);
    if (!m) zsets.set(k, (m = new Map()));
    return m;
  };
  const sorted = (k: string): ZMember[] =>
    [...z(k).entries()].map(([member, score]) => ({ member, score })).sort((a, b) => a.score - b.score || a.member.localeCompare(b.member));

  return {
    dump: () => new Map<string, unknown>([...strings, ...hashes, ...zsets]),
    async get(k) {
      return strings.get(k);
    },
    async set(k, v, o) {
      if (o?.nx && strings.has(k)) return '';
      strings.set(k, v);
      return 'OK';
    },
    async del(...ks) {
      for (const k of ks) {
        strings.delete(k);
        hashes.delete(k);
        zsets.delete(k);
      }
    },
    async incrBy(k, v) {
      const n = Number(strings.get(k) ?? 0) + v;
      strings.set(k, String(n));
      return n;
    },
    async expire() {},
    async hGet(k, f) {
      return hashes.get(k)?.get(f);
    },
    async hSet(k, fv) {
      const m = h(k);
      let added = 0;
      for (const [f, v] of Object.entries(fv)) {
        if (!m.has(f)) added++;
        m.set(f, v);
      }
      return added;
    },
    async hSetNX(k, f, v) {
      const m = h(k);
      if (m.has(f)) return 0;
      m.set(f, v);
      return 1;
    },
    async hGetAll(k) {
      return Object.fromEntries(hashes.get(k) ?? []);
    },
    async hIncrBy(k, f, v) {
      const m = h(k);
      const n = Number(m.get(f) ?? 0) + v;
      m.set(f, String(n));
      return n;
    },
    async hDel(k, fs) {
      let n = 0;
      for (const f of fs) if (hashes.get(k)?.delete(f)) n++;
      return n;
    },
    async zAdd(k, ...ms) {
      let n = 0;
      for (const m of ms) {
        if (!z(k).has(m.member)) n++;
        z(k).set(m.member, m.score);
      }
      return n;
    },
    async zIncrBy(k, m, v) {
      const n = (z(k).get(m) ?? 0) + v;
      z(k).set(m, n);
      return n;
    },
    async zScore(k, m) {
      return zsets.get(k)?.get(m);
    },
    async zRank(k, m) {
      const i = sorted(k).findIndex((x) => x.member === m);
      return i < 0 ? undefined : i;
    },
    async zCard(k) {
      return zsets.get(k)?.size ?? 0;
    },
    async zRem(k, ms) {
      let n = 0;
      for (const m of ms) if (zsets.get(k)?.delete(m)) n++;
      return n;
    },
    async zRange(k, start, stop, o) {
      let all = sorted(k);
      if (o?.reverse) all = all.reverse();
      const s = Number(start);
      const e = Number(stop);
      return all.slice(s, e < 0 ? all.length + e + 1 : e + 1);
    },
  };
}
