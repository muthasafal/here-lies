/**
 * Crypt layout helpers: cell indexing, contents and omens (BRIEF 4.1, 4.2).
 * Cells are addressed by index `i = y * GRID_SIZE + x` (0..48) inside the engine,
 * because indices serialise cleanly to Redis JSON.
 */

import type { CellContent, Coord, Omens } from './types.js';
import { GRID_SIZE } from './types.js';

export const CELL_COUNT = GRID_SIZE * GRID_SIZE;

/** Serializable hidden layout. Never sent to the client during a scored run. */
export type Layout = {
  entrance: number;
  relic: number;
  pits: number[];
  curses: number[];
};

/** Coord -> cell index. */
export function idx(c: Coord): number {
  return c.y * GRID_SIZE + c.x;
}

/** Cell index -> coord. */
export function coordOf(i: number): Coord {
  return { x: i % GRID_SIZE, y: Math.floor(i / GRID_SIZE) };
}

/** Human label for a cell, e.g. "C4" (column letter A-G, row number 1-7 from the top). */
export function cellLabel(i: number): string {
  const { x, y } = coordOf(i);
  return `${String.fromCharCode(65 + x)}${y + 1}`;
}

const NEIGHBOURS: number[][] = Array.from({ length: CELL_COUNT }, (_, i) => {
  const { x, y } = coordOf(i);
  const out: number[] = [];
  if (y > 0) out.push(i - GRID_SIZE);
  if (x < GRID_SIZE - 1) out.push(i + 1);
  if (y < GRID_SIZE - 1) out.push(i + GRID_SIZE);
  if (x > 0) out.push(i - 1);
  return out;
});

const SURROUND: number[][] = Array.from({ length: CELL_COUNT }, (_, i) => {
  const { x, y } = coordOf(i);
  const out: number[] = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) out.push(ny * GRID_SIZE + nx);
    }
  }
  return out;
});

/** Orthogonal neighbours of a cell (2-4 cells). */
export function neighbours(i: number): number[] {
  return NEIGHBOURS[i] ?? [];
}

/** The 8 surrounding cells (used by the flare). */
export function surrounding(i: number): number[] {
  return SURROUND[i] ?? [];
}

/** Manhattan distance between two cell indices. */
export function dist(a: number, b: number): number {
  const ca = coordOf(a);
  const cb = coordOf(b);
  return Math.abs(ca.x - cb.x) + Math.abs(ca.y - cb.y);
}

/** Entrance plus its orthogonal neighbours: always safe, never the relic (BRIEF 4.1). */
export function safeZone(entrance: number): number[] {
  return [entrance, ...neighbours(entrance)];
}

/** What is hidden in a cell. */
export function contentAt(layout: Layout, i: number): CellContent {
  if (layout.relic === i) return 'relic';
  if (layout.pits.includes(i)) return 'pit';
  if (layout.curses.includes(i)) return 'curse';
  return 'empty';
}

/** True when the relic lies within Manhattan distance 1..2 of the cell (BRIEF 4.2, faint glow). */
export function glowAt(relic: number, i: number): boolean {
  const d = dist(relic, i);
  return d >= 1 && d <= 2;
}

/** Omens sensed while standing in (or flaring) a cell (BRIEF 4.2). */
export function omensAt(layout: Layout, i: number): Omens {
  let coldDraft = 0;
  let whispers = 0;
  for (const n of neighbours(i)) {
    if (layout.pits.includes(n)) coldDraft++;
    if (layout.curses.includes(n)) whispers++;
  }
  return { coldDraft, whispers, faintGlow: glowAt(layout.relic, i) };
}

/** Plain-language omen text, e.g. "Cold draft, 1. Faint glow." (BRIEF 7.8 live region). */
export function describeOmens(o: Omens): string {
  const parts: string[] = [];
  if (o.coldDraft > 0) parts.push(`Cold draft, ${o.coldDraft}`);
  if (o.whispers > 0) parts.push(`Whispers, ${o.whispers}`);
  if (o.faintGlow) parts.push('Faint glow');
  if (parts.length === 0) return 'Silence.';
  return `${parts.join('. ')}.`;
}

/** Checks the structural rules a layout must satisfy (safe zone, counts, bounds, no overlap). */
export function layoutProblems(layout: Layout): string[] {
  const problems: string[] = [];
  const all = [layout.relic, ...layout.pits, ...layout.curses];
  if (all.some((i) => !Number.isInteger(i) || i < 0 || i >= CELL_COUNT)) problems.push('A cell is off the grid.');
  if (new Set(all).size !== all.length) problems.push('Two things share one room.');
  if (Math.floor(layout.entrance / GRID_SIZE) !== GRID_SIZE - 1) problems.push('The entrance must be on the bottom row.');
  const zone = safeZone(layout.entrance);
  if (all.some((i) => zone.includes(i))) problems.push('The entrance and its neighbours must be empty.');
  return problems;
}
