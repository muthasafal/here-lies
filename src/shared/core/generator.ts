/**
 * Seeded crypt generation (BRIEF 6.1). Same inputs always give the same crypt.
 * Bump GENERATOR_VERSION whenever this file's behaviour changes; never regenerate a past day.
 */

import type { Layout } from './layout.js';
import { CELL_COUNT, dist, idx, neighbours, safeZone } from './layout.js';
import { SeededRNG, hashSeed } from './rng.js';
import type { SolveResult } from './solver.js';
import { solve } from './solver.js';
import type { Difficulty } from './types.js';
import { GENERATOR_VERSION, GRID_SIZE, MIN_INFERENCE_STEPS } from './types.js';

export const MAX_TRIES = 500;
export const MIN_RELIC_DISTANCE = 4;

export type GenerateInput = {
  subredditId: string;
  dayId: string;
  difficulty: Difficulty;
  minInferenceSteps?: number;
};

export type GeneratedCrypt = {
  layout: Layout;
  seed: number;
  subSeed: number;
  version: number;
  /** Oil budget O = ceil(s × L) (BRIEF 4.4). */
  budget: number;
  solver: SolveResult;
};

/** seed = hash32("here-lies" | subredditId | dayId | GENERATOR_VERSION) (BRIEF 6.1). */
export function cryptSeed(subredditId: string, dayId: string): number {
  return hashSeed('here-lies', subredditId, dayId, String(GENERATOR_VERSION));
}

/** True when the relic connects to the entrance through non-pit rooms. */
export function relicReachable(layout: Layout): boolean {
  const blocked = new Set(layout.pits);
  const seen = new Set([layout.entrance]);
  const queue = [layout.entrance];
  while (queue.length > 0) {
    const c = queue.shift();
    if (c === undefined) break;
    if (c === layout.relic) return true;
    for (const n of neighbours(c)) {
      if (seen.has(n) || blocked.has(n)) continue;
      seen.add(n);
      queue.push(n);
    }
  }
  return false;
}

/** Places one random layout (steps 1-4 of BRIEF 6.1). */
export function placeLayout(rng: SeededRNG, pits: number, curses: number): Layout {
  const entrance = idx({ x: rng.nextInt(0, GRID_SIZE - 1), y: GRID_SIZE - 1 });
  const zone = new Set(safeZone(entrance));
  const relicCells = Array.from({ length: CELL_COUNT }, (_, i) => i).filter(
    (i) => !zone.has(i) && dist(i, entrance) >= MIN_RELIC_DISTANCE,
  );
  const relic = rng.pick(relicCells);
  const layout: Layout = { entrance, relic, pits: [], curses: [] };
  const free = () =>
    rng.shuffle(
      Array.from({ length: CELL_COUNT }, (_, i) => i).filter(
        (i) => !zone.has(i) && i !== relic && !layout.pits.includes(i) && !layout.curses.includes(i),
      ),
    );
  for (const c of free()) {
    if (layout.pits.length >= pits) break;
    layout.pits.push(c);
    if (!relicReachable(layout)) layout.pits.pop();
  }
  for (const c of free()) {
    if (layout.curses.length >= curses) break;
    layout.curses.push(c);
  }
  return layout;
}

/**
 * Generates a fair, non-trivial crypt (BRIEF 6.1 steps 1-7). Retries with sub-seeds up to
 * MAX_TRIES. If no try reaches minInferenceSteps, the most demanding solvable try is used,
 * so a fair crypt is always returned.
 */
export function generate(input: GenerateInput): GeneratedCrypt {
  const seed = cryptSeed(input.subredditId, input.dayId);
  const min = input.minInferenceSteps ?? MIN_INFERENCE_STEPS;
  let fallback: GeneratedCrypt | undefined;
  for (let sub = 0; sub < MAX_TRIES; sub++) {
    const rng = new SeededRNG(hashSeed(String(seed), String(sub)));
    const layout = placeLayout(rng, input.difficulty.pits, input.difficulty.curses);
    const result = solve(layout, { bones: input.difficulty.bones });
    if (!result.solvable) continue;
    const crypt: GeneratedCrypt = {
      layout,
      seed,
      subSeed: sub,
      version: GENERATOR_VERSION,
      budget: oilBudget(result.oilNeeded, input.difficulty.slackFactor),
      solver: result,
    };
    if (result.inferenceSteps >= min) return crypt;
    if (!fallback || result.inferenceSteps > fallback.solver.inferenceSteps) fallback = crypt;
  }
  if (fallback) return fallback;
  throw new Error(`No fair crypt found for ${input.dayId}`);
}

/** O = ceil(s × L) (BRIEF 4.4). */
export function oilBudget(oilNeeded: number, slack: number): number {
  return Math.ceil(slack * oilNeeded);
}
