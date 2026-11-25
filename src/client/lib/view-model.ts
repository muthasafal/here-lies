/**
 * Pure view-models for the screens. All game logic the UI needs lives here (and in
 * src/shared/core), so presentational components only render props. A re-skin never
 * touches these files.
 */

import type { PublicTomb } from '../../shared/api';
import type { Layout } from '../../shared/core/layout';
import { CELL_COUNT, cellLabel, contentAt, coordOf, describeOmens, neighbours } from '../../shared/core/layout';
import type { RunState } from '../../shared/core/rules';
import type { BoneResult, CellContent, Omens } from '../../shared/core/types';

export type CellView = {
  index: number;
  x: number;
  y: number;
  label: string;
  isEntrance: boolean;
  isCurrent: boolean;
  visited: boolean;
  /** Adjacent to the player: can be stepped into (and boned if unvisited). */
  adjacent: boolean;
  canBone: boolean;
  /** Lit by the lantern: visited, or next to a visited room. */
  lit: boolean;
  omens: Omens | null;
  bone: BoneResult | null;
  tombs: PublicTomb[];
  /** Only after the reveal (or in practice once the run ends). */
  content: CellContent | null;
  /** On the reference solver's path (reveal only). */
  onSolverPath: boolean;
  /** Accessible name, e.g. "C4, visited, cold draft 1, 2 tombstones". */
  ariaLabel: string;
};

export type GridView = { cells: CellView[]; size: number };

/** Builds the 7x7 grid model from what the player knows. */
export function buildGrid(opts: {
  state: RunState;
  entrance: number;
  tombs: PublicTomb[];
  layout?: Layout | null;
  solverPath?: number[];
}): GridView {
  const { state, tombs, layout } = opts;
  const k = state.knowledge;
  const visited = new Set(k.visited);
  const lit = new Set<number>(k.visited);
  for (const v of k.visited) for (const n of neighbours(v)) lit.add(n);
  const adjacent = new Set(state.status === 'active' ? neighbours(state.pos) : []);
  const byCell = new Map<number, PublicTomb[]>();
  for (const t of tombs) byCell.set(t.cell, [...(byCell.get(t.cell) ?? []), t]);
  const path = new Set(opts.solverPath ?? []);
  const cells: CellView[] = [];
  for (let i = 0; i < CELL_COUNT; i++) {
    const { x, y } = coordOf(i);
    const omens = k.omens[i] ?? null;
    const bone = k.bones[i] ?? null;
    const here = byCell.get(i) ?? [];
    const content = layout ? contentAt(layout, i) : null;
    const parts = [cellLabel(i)];
    if (i === opts.entrance) parts.push('entrance');
    if (i === state.pos) parts.push('you are here');
    else if (visited.has(i)) parts.push('visited');
    if (omens) parts.push(describeOmens(omens).replace(/\.$/, ''));
    if (bone) parts.push(bone === 'long-fall' ? 'bone: a long fall' : bone === 'shriek' ? 'bone: a shriek' : 'bone: a clatter');
    if (here.length > 0) parts.push(`${here.length} tombstone${here.length > 1 ? 's' : ''}`);
    if (content && content !== 'empty') parts.push(content);
    cells.push({
      index: i,
      x,
      y,
      label: cellLabel(i),
      isEntrance: i === opts.entrance,
      isCurrent: i === state.pos,
      visited: visited.has(i),
      adjacent: adjacent.has(i),
      canBone: state.status === 'active' && state.bonesLeft > 0 && adjacent.has(i) && !visited.has(i) && !bone,
      lit: lit.has(i),
      omens,
      bone,
      tombs: here,
      content,
      onSolverPath: path.has(i),
      ariaLabel: parts.join(', '),
    });
  }
  return { cells, size: 7 };
}

/** Grave mound order: most "true" votes first, then newest (BRIEF 4.6). */
export function moundOrder(tombs: PublicTomb[]): PublicTomb[] {
  return [...tombs].sort((a, b) => (b.votes?.true ?? 0) - (a.votes?.true ?? 0) || b.ts - a.ts);
}

/** Text for the ARIA live region after a move (BRIEF 7.8). */
export function announce(cell: number, omens: Omens | undefined): string {
  return `Room ${cellLabel(cell)}. ${omens ? describeOmens(omens) : ''}`.trim();
}

/** Lantern fill from 0 to 1. */
export function oilFraction(oil: number, budget: number): number {
  return budget <= 0 ? 0 : Math.max(0, Math.min(1, oil / budget));
}
