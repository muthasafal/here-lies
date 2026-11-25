/**
 * Community crypt validation (BRIEF 5, 9 property 8). The editor runs this live and the server
 * re-runs it on submit: a layout is accepted only if it is well formed and the reference
 * solver proves it fair with Friday's (Thursday's) tools.
 */

import type { Layout } from './layout.js';
import { dist, layoutProblems } from './layout.js';
import { oilBudget } from './generator.js';
import type { SolveResult } from './solver.js';
import { solve } from './solver.js';
import type { Difficulty } from './types.js';

export const UGC_NAME_MAX = 40;
export const UGC_MIN_PITS = 4;
export const UGC_MAX_PITS = 12;
export const UGC_MAX_CURSES = 5;
export const UGC_MIN_INFERENCE = 3;

/** Community crypts are played with Thursday's bones and slack. */
export const UGC_DIFFICULTY: Difficulty = { pits: 8, curses: 3, bones: 2, slackFactor: 1.4, curseDrain: 5 };

export type EditorVerdict = {
  ok: boolean;
  problems: string[];
  solver?: SolveResult;
  budget?: number;
};

/** Validates a designed layout and its name. */
export function validateDesign(layout: Layout, name: string): EditorVerdict {
  const problems = layoutProblems(layout);
  const n = name.trim();
  if (n.length < 3 || n.length > UGC_NAME_MAX) problems.push(`Name it in 3 to ${UGC_NAME_MAX} characters.`);
  if (layout.pits.length < UGC_MIN_PITS || layout.pits.length > UGC_MAX_PITS) problems.push(`Use ${UGC_MIN_PITS} to ${UGC_MAX_PITS} pits.`);
  if (layout.curses.length > UGC_MAX_CURSES) problems.push(`Use at most ${UGC_MAX_CURSES} curses.`);
  if (problems.length === 0 && dist(layout.relic, layout.entrance) < 4) problems.push('Hide the relic at least 4 rooms from the entrance.');
  if (problems.length > 0) return { ok: false, problems };
  const solver = solve(layout, { bones: UGC_DIFFICULTY.bones });
  if (!solver.solvable) return { ok: false, problems: ['Unfair: a player would have to guess somewhere. Try moving a pit.'], solver };
  if (solver.inferenceSteps < UGC_MIN_INFERENCE) return { ok: false, problems: ['Too easy: give the living something to think about.'], solver };
  return { ok: true, problems: [], solver, budget: oilBudget(solver.oilNeeded, UGC_DIFFICULTY.slackFactor) };
}
