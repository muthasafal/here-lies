/**
 * Fairness sweep (BRIEF 10, hook fairness-sweep): generates crypts across weekdays and
 * fails if any is unsolvable, too easy, or slower than the time limits.
 * Usage: npm run sweep [-- count]
 */
import { generate } from '../../src/shared/core/generator.js';
import { solve } from '../../src/shared/core/solver.js';
import { DIFFICULTY_BY_WEEKDAY } from '../../src/shared/core/types.js';

const count = Number(process.argv[2] ?? 5000);
let failures = 0;
let easy = 0;
let maxSolve = 0;
let maxGen = 0;
let totalTries = 0;
const start = Date.now();
for (let i = 0; i < count; i++) {
  const wd = i % 7;
  const difficulty = DIFFICULTY_BY_WEEKDAY[wd];
  if (!difficulty) continue;
  const dayId = `sweep-${i}`;
  const g0 = performance.now();
  const crypt = generate({ subredditId: 't5_sweep', dayId, difficulty });
  const genMs = performance.now() - g0;
  maxGen = Math.max(maxGen, genMs);
  totalTries += crypt.subSeed + 1;
  const s0 = performance.now();
  const check = solve(crypt.layout, { bones: difficulty.bones });
  const solveMs = performance.now() - s0;
  maxSolve = Math.max(maxSolve, solveMs);
  if (!check.solvable || check.oilNeeded > crypt.budget) {
    failures++;
    console.error(`UNFAIR ${dayId}`, JSON.stringify(crypt.layout));
  }
  if (check.inferenceSteps < 6) easy++;
  if (solveMs > 200) {
    failures++;
    console.error(`SLOW ${dayId} ${solveMs.toFixed(0)}ms`);
  }
}
console.log(
  `sweep: ${count} crypts in ${((Date.now() - start) / 1000).toFixed(1)}s, unfair/slow ${failures}, too-easy fallbacks ${easy}, ` +
    `avg tries ${(totalTries / count).toFixed(1)}, max solve ${maxSolve.toFixed(1)}ms, max generate ${maxGen.toFixed(0)}ms`,
);
process.exit(failures > 0 ? 1 : 0);
