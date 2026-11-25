/**
 * Reference solver: a perfect deducer that never guesses (BRIEF 6.2).
 * It plays the crypt from the entrance with only what a player could know
 * (omens of visited or flared rooms, bone results, the safe-zone rule) and
 * no tombstones. If it ever has to guess, the crypt is rejected.
 */

import type { Layout } from './layout.js';
import { CELL_COUNT, coordOf, glowAt, neighbours, omensAt, safeZone, surrounding } from './layout.js';
import type { OmenObservation } from './knowledge.js';
import { ANY, CURSE, EMPTY, PIT, deduce } from './knowledge.js';
import type { Coord } from './types.js';

export type SolveOptions = { bones: number; allowFlare?: boolean };

export type SolveResult = {
  solvable: boolean;
  /** L: oil the solver spent, including 2 for the flare if used. */
  oilNeeded: number;
  inferenceSteps: number;
  usedBones: number;
  usedFlare: boolean;
  /** Every room the solver stood in, in order (for replays and debugging). */
  path: Coord[];
  stuckReason?: string;
};

/** BFS over known-safe cells. Returns the path (excluding `from`) or null. */
export function safePath(from: number, to: number, safe: (i: number) => boolean): number[] | null {
  if (from === to) return [];
  const prev = new Map<number, number>([[from, from]]);
  const queue = [from];
  while (queue.length > 0) {
    const cur = queue.shift();
    if (cur === undefined) break;
    for (const n of neighbours(cur)) {
      if (prev.has(n) || !safe(n)) continue;
      prev.set(n, cur);
      if (n === to) {
        const path = [n];
        let p = cur;
        while (p !== from) {
          path.unshift(p);
          p = prev.get(p) ?? from;
        }
        return path;
      }
      queue.push(n);
    }
  }
  return null;
}

/** BFS distances over known-safe cells from `from`. */
function distances(from: number, safe: (i: number) => boolean): Map<number, number> {
  const d = new Map<number, number>([[from, 0]]);
  const queue = [from];
  while (queue.length > 0) {
    const cur = queue.shift();
    if (cur === undefined) break;
    for (const n of neighbours(cur)) {
      if (d.has(n) || !safe(n)) continue;
      d.set(n, (d.get(cur) ?? 0) + 1);
      queue.push(n);
    }
  }
  return d;
}

/**
 * Solves a layout without guessing. Deterministic: same layout and options, same result.
 * Strategy per step: deduce; walk to the nearest provably safe unvisited room (relic
 * candidates first); else throw a bone at the most constrained frontier room; else fire
 * the flare where it reveals the most; else stuck. Once the relic is found, walk home.
 */
export function solve(layout: Layout, opts: SolveOptions): SolveResult {
  let domains: number[] = Array.from({ length: CELL_COUNT }, () => ANY);
  for (const c of safeZone(layout.entrance)) domains[c] = EMPTY;
  const obs = new Map<number, OmenObservation>();
  const glows = new Map<number, boolean>();
  const visited = new Set<number>();
  const path: Coord[] = [];
  let pos = layout.entrance;
  let oil = 0;
  let bones = opts.bones;
  let usedBones = 0;
  let usedFlare = false;
  let steps = 0;
  let found = false;

  const observe = (c: number) => {
    const o = omensAt(layout, c);
    obs.set(c, { cell: c, draft: o.coldDraft, whispers: o.whispers });
    glows.set(c, o.faintGlow);
  };
  const visit = (c: number) => {
    pos = c;
    path.push(coordOf(c));
    if (visited.has(c)) return;
    visited.add(c);
    domains[c] = EMPTY;
    observe(c);
    if (c === layout.relic) found = true;
  };
  const isSafe = (i: number) => domains[i] === EMPTY;
  const walk = (to: number): boolean => {
    const p = safePath(pos, to, isSafe);
    if (!p) return false;
    for (const c of p) {
      oil++;
      visit(c);
    }
    return true;
  };
  const fail = (reason: string): SolveResult => ({
    solvable: false,
    oilNeeded: oil,
    inferenceSteps: steps,
    usedBones,
    usedFlare,
    path,
    stuckReason: reason,
  });

  visit(layout.entrance);
  for (let guard = 0; guard < 400; guard++) {
    const ded = deduce(domains, [...obs.values()]);
    steps += ded.nonObvious.length;
    domains = ded.domains;

    if (found) {
      if (!walk(layout.entrance)) return fail('no safe way home');
      return { solvable: true, oilNeeded: oil + (usedFlare ? 2 : 0), inferenceSteps: steps, usedBones, usedFlare, path };
    }

    const zone = safeZone(layout.entrance);
    const isCandidate = (i: number) =>
      !visited.has(i) &&
      !zone.includes(i) &&
      ((domains[i] ?? 0) & EMPTY) !== 0 &&
      [...glows].every(([c, g]) => glowAt(i, c) === g);

    const dist = distances(pos, isSafe);
    let best: number | undefined;
    let bestScore = Infinity;
    for (const [c, d] of dist) {
      if (visited.has(c)) continue;
      const score = d * 2 + (isCandidate(c) ? 0 : 1);
      if (score < bestScore) {
        bestScore = score;
        best = c;
      }
    }
    if (best !== undefined) {
      walk(best);
      continue;
    }

    if (bones > 0) {
      // Bone: thrown from a visited room into an adjacent unresolved room.
      let target: number | undefined;
      let from: number | undefined;
      let tScore = -Infinity;
      for (const [c, d] of dist) {
        for (const n of neighbours(c)) {
          if ((domains[n] ?? 0) === EMPTY || [EMPTY, PIT, CURSE].includes(domains[n] ?? 0)) continue;
          const constraints = neighbours(n).filter((m) => obs.has(m)).length;
          const score = constraints * 10 + (isCandidate(n) ? 5 : 0) - d;
          if (score > tScore) {
            tScore = score;
            target = n;
            from = c;
          }
        }
      }
      if (target !== undefined && from !== undefined) {
        walk(from);
        bones--;
        usedBones++;
        domains[target] = layout.pits.includes(target) ? PIT : layout.curses.includes(target) ? CURSE : EMPTY;
        continue;
      }
    }

    if (opts.allowFlare !== false && !usedFlare) {
      let at: number | undefined;
      let gain = 0;
      for (const [c] of dist) {
        const g = surrounding(c).filter((s) => !obs.has(s)).length;
        if (g > gain) {
          gain = g;
          at = c;
        }
      }
      if (at !== undefined && gain > 0) {
        walk(at);
        usedFlare = true;
        for (const s of surrounding(at)) observe(s);
        continue;
      }
    }

    return fail('guess required');
  }
  return fail('step limit');
}
