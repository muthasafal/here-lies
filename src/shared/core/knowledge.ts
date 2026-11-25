/**
 * Deduction over what a player can know (BRIEF 6.2 step 1).
 *
 * Every cell has a domain: the set of contents still possible for it, as a bitmask of
 * EMPTY (safe), PIT and CURSE. Omen observations are exact-count constraints over a
 * cell's orthogonal neighbours. We narrow domains by constraint propagation, then by
 * bounded exhaustive enumeration over each connected frontier component.
 * A cell is proven only when it holds the same content in EVERY consistent assignment.
 */

import { CELL_COUNT, neighbours } from './layout.js';

export const EMPTY = 1;
export const PIT = 2;
export const CURSE = 4;
export const ANY = EMPTY | PIT | CURSE;

/** Omen counts known for a cell (from visiting it or from a flare). */
export type OmenObservation = { cell: number; draft: number; whispers: number };

/** Largest frontier component we enumerate exhaustively (BRIEF 6.2: bounded, about 18). */
export const MAX_COMPONENT = 18;
const NODE_BUDGET = 400_000;

/** Result of one deduction pass. */
export type Deduction = {
  domains: number[];
  /** Cells resolved by a non-trivial inference (anything beyond "silence means safe"). */
  nonObvious: number[];
  /** Cells resolved trivially because a neighbour was silent. */
  obvious: number[];
};

function popcount(d: number): number {
  return (d & 1) + ((d >> 1) & 1) + ((d >> 2) & 1);
}

/** True when a domain allows exactly one content. */
export function isResolved(d: number): boolean {
  return popcount(d) === 1;
}

/** A fresh domain array: everything unknown. */
export function unknownDomains(): number[] {
  return Array.from({ length: CELL_COUNT }, () => ANY);
}

function propagate(domains: number[], obs: OmenObservation[]): boolean {
  let changed = false;
  let again = true;
  while (again) {
    again = false;
    for (const o of obs) {
      for (const [bit, count] of [
        [PIT, o.draft],
        [CURSE, o.whispers],
      ] as const) {
        let sure = 0;
        let maybe = 0;
        for (const n of neighbours(o.cell)) {
          const d = domains[n] ?? 0;
          if (d === bit) sure++;
          else if (d & bit) maybe++;
        }
        if (maybe === 0) continue;
        if (sure === count) {
          for (const n of neighbours(o.cell)) {
            const d = domains[n] ?? 0;
            if (d !== bit && d & bit) {
              domains[n] = d & ~bit;
              again = changed = true;
            }
          }
        } else if (sure + maybe === count) {
          for (const n of neighbours(o.cell)) {
            const d = domains[n] ?? 0;
            if (d !== bit && d & bit) {
              domains[n] = bit;
              again = changed = true;
            }
          }
        }
      }
    }
  }
  return changed;
}

/** Splits unresolved cells touched by constraints into independent components. */
function components(domains: number[], obs: OmenObservation[]): { cells: number[]; cons: OmenObservation[] }[] {
  const parent = new Map<number, number>();
  const find = (a: number): number => {
    let r = a;
    while (parent.get(r) !== r) r = parent.get(r) ?? r;
    parent.set(a, r);
    return r;
  };
  const active = obs.filter((o) => neighbours(o.cell).some((n) => !isResolved(domains[n] ?? ANY)));
  for (const o of active) {
    const open = neighbours(o.cell).filter((n) => !isResolved(domains[n] ?? ANY));
    for (const n of open) if (!parent.has(n)) parent.set(n, n);
    for (let k = 1; k < open.length; k++) {
      const a = open[0];
      const b = open[k];
      if (a !== undefined && b !== undefined) parent.set(find(b), find(a));
    }
  }
  const groups = new Map<number, { cells: number[]; cons: OmenObservation[] }>();
  for (const c of parent.keys()) {
    const r = find(c);
    const g = groups.get(r) ?? { cells: [], cons: [] };
    g.cells.push(c);
    groups.set(r, g);
  }
  for (const o of active) {
    const first = neighbours(o.cell).find((n) => !isResolved(domains[n] ?? ANY));
    if (first === undefined) continue;
    groups.get(find(first))?.cons.push(o);
  }
  return [...groups.values()];
}

/** Enumerates one component; returns the union of values seen per cell, or null if over budget. */
function enumerate(domains: number[], cells: number[], cons: OmenObservation[]): Map<number, number> | null {
  const seen = new Map<number, number>(cells.map((c) => [c, 0]));
  const assign = new Map<number, number>();
  let nodes = 0;
  let found = false;

  const consistent = (): boolean => {
    for (const o of cons) {
      for (const [bit, count] of [
        [PIT, o.draft],
        [CURSE, o.whispers],
      ] as const) {
        let sure = 0;
        let maybe = 0;
        for (const n of neighbours(o.cell)) {
          const v = assign.get(n) ?? domains[n] ?? 0;
          if (v === bit) sure++;
          else if (v & bit) maybe++;
        }
        if (sure > count || sure + maybe < count) return false;
      }
    }
    return true;
  };

  const rec = (k: number): boolean => {
    if (++nodes > NODE_BUDGET) return false;
    if (k === cells.length) {
      found = true;
      for (const c of cells) seen.set(c, (seen.get(c) ?? 0) | (assign.get(c) ?? 0));
      return true;
    }
    const c = cells[k];
    if (c === undefined) return true;
    const d = domains[c] ?? 0;
    for (const bit of [EMPTY, PIT, CURSE]) {
      if (!(d & bit)) continue;
      assign.set(c, bit);
      if (consistent() && !rec(k + 1)) return false;
    }
    assign.delete(c);
    return true;
  };

  if (!rec(0)) return null;
  return found ? seen : null;
}

/**
 * Narrows `start` domains using the omen observations. Pure: returns new arrays.
 * Cells next to a silent room are counted as obvious; everything else that becomes
 * resolved is counted as a non-obvious inference (BRIEF 4.5 minInferenceSteps).
 */
export function deduce(start: number[], obs: OmenObservation[]): Deduction {
  const domains = [...start];
  const obvious: number[] = [];
  for (const o of obs) {
    if (o.draft !== 0 || o.whispers !== 0) continue;
    for (const n of neighbours(o.cell)) {
      if ((domains[n] ?? 0) !== EMPTY && (domains[n] ?? 0) & EMPTY) {
        domains[n] = EMPTY;
        obvious.push(n);
      }
    }
  }
  const before = [...domains];
  let progress = true;
  while (progress) {
    progress = propagate(domains, obs);
    for (const comp of components(domains, obs)) {
      if (comp.cells.length > MAX_COMPONENT) continue;
      const seen = enumerate(domains, comp.cells, comp.cons);
      if (!seen) continue;
      for (const [c, v] of seen) {
        if (v !== 0 && v !== domains[c]) {
          domains[c] = v;
          progress = true;
        }
      }
    }
  }
  const nonObvious: number[] = [];
  for (let i = 0; i < CELL_COUNT; i++) {
    if (isResolved(domains[i] ?? 0) && !isResolved(before[i] ?? 0)) nonObvious.push(i);
  }
  return { domains, nonObvious, obvious };
}
