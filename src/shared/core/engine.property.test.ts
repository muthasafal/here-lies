/**
 * Correctness properties from BRIEF section 9, checked with fast-check.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { generate, placeLayout, relicReachable } from './generator.js';
import { CELL_COUNT, neighbours, omensAt, safeZone } from './layout.js';
import { applyAction, replay, startRun } from './rules.js';
import type { Action } from './rules.js';
import { pioneerMultiplier, scoreRun } from './scoring.js';
import { solve } from './solver.js';
import { SeededRNG } from './rng.js';
import { validateDesign, UGC_DIFFICULTY } from './editor-validate.js';
import { DIFFICULTY_BY_WEEKDAY } from './types.js';
import type { Difficulty } from './types.js';

const weekday = fc.integer({ min: 0, max: 6 });
const dayId = fc.date({ min: new Date('2026-01-01'), max: new Date('2030-12-31'), noInvalidDate: true }).map((d) => d.toISOString().slice(0, 10));
const sub = fc.constantFrom('t5_alpha', 't5_beta', 't5_here_lies');
const diff = (wd: number): Difficulty => {
  const d = DIFFICULTY_BY_WEEKDAY[wd];
  if (!d) throw new Error('no difficulty');
  return d;
};
const randomLayout = fc.tuple(fc.integer({ min: 0, max: 2 ** 31 }), weekday).map(([seed, wd]) => {
  const d = diff(wd);
  return placeLayout(new SeededRNG(seed), d.pits, d.curses);
});
const action: fc.Arbitrary<Action> = fc.oneof(
  fc.constantFrom<Action>({ type: 'move', dir: 'north' }, { type: 'move', dir: 'south' }, { type: 'move', dir: 'east' }, { type: 'move', dir: 'west' }),
  fc.integer({ min: 0, max: CELL_COUNT - 1 }).map<Action>((target) => ({ type: 'bone', target })),
  fc.constant<Action>({ type: 'flare' }),
  fc.constant<Action>({ type: 'retreat' }),
);

describe('BRIEF 9 properties', () => {
  it('1. determinism: same inputs give the same crypt', () => {
    fc.assert(
      fc.property(sub, dayId, weekday, (s, d, wd) => {
        const a = generate({ subredditId: s, dayId: d, difficulty: diff(wd) });
        const b = generate({ subredditId: s, dayId: d, difficulty: diff(wd) });
        expect(b).toEqual(a);
      }),
      { numRuns: 40 },
    );
  });

  it('2. fairness: every generated crypt is solved without guessing within its budget', () => {
    fc.assert(
      fc.property(sub, dayId, weekday, (s, d, wd) => {
        const c = generate({ subredditId: s, dayId: d, difficulty: diff(wd) });
        const r = solve(c.layout, { bones: diff(wd).bones });
        expect(r.solvable).toBe(true);
        expect(r.oilNeeded).toBeLessThanOrEqual(c.budget);
        expect(relicReachable(c.layout)).toBe(true);
      }),
      { numRuns: 150 },
    );
  });

  it('2b. the solver path, replayed through the rules engine, escapes alive', () => {
    fc.assert(
      fc.property(sub, dayId, weekday, (s, d, wd) => {
        const c = generate({ subredditId: s, dayId: d, difficulty: diff(wd) });
        let state = startRun(c.layout, { oil: c.budget, bones: diff(wd).bones });
        for (const p of c.solver.path.slice(1)) {
          const to = p.y * 7 + p.x;
          if (to === state.pos) continue;
          const r = applyAction(c.layout, state, { type: 'step', to });
          expect(r.ok).toBe(true);
          state = r.state;
          expect(state.status === 'active' || state.status === 'escaped').toBe(true);
        }
        expect(state.hasRelic).toBe(true);
        expect(state.status).toBe('escaped');
      }),
      { numRuns: 80 },
    );
  });

  it('3. safe start: entrance and neighbours are never hazards or the relic', () => {
    fc.assert(
      fc.property(sub, dayId, weekday, (s, d, wd) => {
        const { layout } = generate({ subredditId: s, dayId: d, difficulty: diff(wd) });
        for (const c of safeZone(layout.entrance)) {
          expect(layout.pits).not.toContain(c);
          expect(layout.curses).not.toContain(c);
          expect(layout.relic).not.toBe(c);
        }
        expect(Math.floor(layout.entrance / 7)).toBe(6);
      }),
      { numRuns: 100 },
    );
  });

  it('4. omen correctness: counts equal the adjacent hazards', () => {
    fc.assert(
      fc.property(randomLayout, fc.integer({ min: 0, max: CELL_COUNT - 1 }), (layout, cell) => {
        const o = omensAt(layout, cell);
        const ns = neighbours(cell);
        expect(o.coldDraft).toBe(ns.filter((n) => layout.pits.includes(n)).length);
        expect(o.whispers).toBe(ns.filter((n) => layout.curses.includes(n)).length);
      }),
    );
  });

  it('5. oil accounting: never negative; move 1, flare 2, bone 0', () => {
    fc.assert(
      fc.property(randomLayout, fc.array(action, { maxLength: 40 }), (layout, actions) => {
        let s = startRun(layout, { oil: 25, bones: 3 });
        for (const a of actions) {
          const r = applyAction(layout, s, a);
          if (r.ok) {
            const next = r.state;
            expect(next.oil).toBeGreaterThanOrEqual(0);
            if (a.type === 'bone') expect(next.oil).toBe(s.oil);
            if (a.type === 'flare') expect(next.oil).toBe(Math.max(0, s.oil - 2));
            if (a.type === 'move' && next.status !== 'died' && !next.knowledge.spentCurses.includes(next.pos)) expect(next.oil).toBe(s.oil - 1);
            s = next;
          } else {
            expect(r.state).toBe(s);
          }
        }
      }),
    );
  });

  it('6. score monotonicity: more oil never scores lower; more tombstones never raise the multiplier', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 80 }),
        fc.integer({ min: 0, max: 20 }),
        fc.integer({ min: 0, max: 3 }),
        fc.boolean(),
        fc.boolean(),
        fc.integer({ min: 0, max: 200 }),
        fc.integer({ min: 0, max: 20 }),
        (oil, extra, bones, flare, cursed, t, more) => {
          const base = { status: 'escaped' as const, bonesLeft: bones, flareUsed: flare, cursed, tombstonesAtStart: t };
          expect(scoreRun({ ...base, oilLeft: oil + extra }).final).toBeGreaterThanOrEqual(scoreRun({ ...base, oilLeft: oil }).final);
          expect(pioneerMultiplier(t + more)).toBeLessThanOrEqual(pioneerMultiplier(t));
        },
      ),
    );
  });

  it('7. server/client agreement: the same actions give the same state', () => {
    fc.assert(
      fc.property(randomLayout, fc.array(action, { maxLength: 30 }), (layout, actions) => {
        const a = replay(layout, startRun(layout, { oil: 30, bones: 2 }), actions);
        const b = replay(JSON.parse(JSON.stringify(layout)), JSON.parse(JSON.stringify(startRun(layout, { oil: 30, bones: 2 }))), actions);
        expect(JSON.parse(JSON.stringify(b))).toEqual(JSON.parse(JSON.stringify(a)));
      }),
    );
  });

  it('8. editor validity: accepted layouts are solvable; solver-unsolvable layouts are rejected', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 2 ** 31 }), fc.integer({ min: 4, max: 12 }), fc.integer({ min: 0, max: 5 }), (seed, pits, curses) => {
        const layout = placeLayout(new SeededRNG(seed), pits, curses);
        const v = validateDesign(layout, 'Test Crypt');
        const s = solve(layout, { bones: UGC_DIFFICULTY.bones });
        if (v.ok) expect(s.solvable).toBe(true);
        if (!s.solvable) expect(v.ok).toBe(false);
      }),
      { numRuns: 150 },
    );
  });

  it('solver runs within 200 ms per crypt', () => {
    const d = diff(0);
    for (let i = 0; i < 30; i++) {
      const layout = placeLayout(new SeededRNG(i * 7919), d.pits, d.curses);
      const t = performance.now();
      solve(layout, { bones: d.bones });
      expect(performance.now() - t).toBeLessThan(200);
    }
  });

  it('non-trivial: generated crypts need at least 6 inferences in nearly every case', () => {
    let easy = 0;
    for (let i = 0; i < 70; i++) {
      const c = generate({ subredditId: 't5_x', dayId: `2027-01-${(i % 28) + 1}-${i}`, difficulty: diff(i % 7) });
      if (c.solver.inferenceSteps < 6) easy++;
    }
    expect(easy).toBeLessThanOrEqual(2);
  });
});
